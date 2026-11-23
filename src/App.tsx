import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { SourceCodePanel } from './components/SourceCodePanel';
import { TestConfigPanel } from './components/TestConfigPanel';
import { OutputSettingsPanel } from './components/OutputSettingsPanel';
import { LogPanel } from './components/LogPanel';
import { WelcomeDialog } from './components/WelcomeDialog';
import { SubtaskConfigDialog } from './components/SubtaskConfigDialog';
import { TestPreviewDialog } from './components/TestPreviewDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { Button } from './components/common/Button';
import { useCodeStore } from './store/codeStore';
import { useConfigStore } from './store/configStore';
import { usePreviewStore } from './store/previewStore';
import { useLogStore } from './store/logStore';
import { useIPC } from './hooks/useIPC';
import { useSettings } from './hooks/useSettings';
import { generateAndExport } from './utils/generationRun';
import { validateSourceCode, validateTestCount, validateTimeout } from './utils/validation';
import type { SubtaskConfig } from './types';
import './styles/workspace-layout.css';

export function App() {
  const api = useIPC();
  const s = useCodeStore();
  const cfg = useConfigStore();
  const preview = usePreviewStore();
  const { settings, loading } = useSettings();
  const [welcome, setWelcome] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [configure, setConfigure] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [destination, setDestination] = useState('');
  const [widths, setWidths] = useState(() => {
    const panelWidth = Math.max(320, Math.min(600, Math.floor(window.innerWidth / 3)));
    return { source: panelWidth, config: panelWidth };
  });
  const activeRun = useRef(false);
  const busy = Boolean(stage) || s.isAnalyzing || s.isAiAnalyzing;
  useEffect(() => { if (!loading && settings && !settings.firstRunComplete) setWelcome(true); }, [loading, settings]);
  useEffect(() => {
    let live = true;
    api.log.getAll().then(entries => { if (live) useLogStore.getState().setLogs(entries); }).catch(console.error);
    return () => { live = false; };
  }, [api]);

  // Each analysis object belongs to a particular source revision. Ignore a late AI reply.
  useEffect(() => {
    const analysis = s.analysis;
    if (!analysis?.success) return;
    let live = true;
    const store = useCodeStore.getState();
    const fallback = () => [{ id: 1, name: 'Default', limits: {}, testCount: useConfigStore.getState().testCount, generationStrategy: 'mixed' }];
    store.setIsAiAnalyzing(true);
    void (async () => {
      try {
        const ai = await api.code.analyzeAi(store.sourceCode, analysis);
        if (!live || useCodeStore.getState().analysis !== analysis) return;
        store.setAiAnalysis(ai);
        store.setSubtasks(ai.success && ai.suggestedSubtasks.length ? ai.suggestedSubtasks : fallback());
      } catch {
        if (live && useCodeStore.getState().analysis === analysis) store.setSubtasks(fallback());
      } finally {
        if (live && useCodeStore.getState().analysis === analysis) { store.setIsAiAnalyzing(false); setConfigure(true); }
      }
    })();
    return () => { live = false; };
  }, [api, s.analysis]);

  async function begin() {
    if (busy || activeRun.current) return;
    setError('');
    const invalid = [validateSourceCode(s.sourceCode), validateTestCount(cfg.testCount), ...(cfg.mode === 'input-output' ? [validateTimeout(cfg.timeout)] : [])].find(v => !v.valid);
    if (invalid) { setError(invalid.error ?? 'Invalid configuration'); return; }
    if (s.analysis?.success) { setConfigure(true); return; }
    s.setIsAnalyzing(true);
    try { s.setAnalysis(await api.code.analyze(s.sourceCode)); }
    catch (e) { s.setAnalysisError(e instanceof Error ? e.message : 'Analysis failed'); }
  }

  async function generate(subtasks: SubtaskConfig[]) {
    if (activeRun.current || !s.analysis?.success) return;
    activeRun.current = true;
    setConfigure(false); setError(''); setDestination(''); setStage('Preparing tests...'); s.setSubtasks(subtasks);
    try {
      const current = await api.settings.get();
      const result = await generateAndExport(api, { code: s.sourceCode, analysis: s.analysis, aiAnalysis: s.aiAnalysis ?? undefined, subtasks, mode: cfg.mode, totalTestCount: cfg.testCount, namingConfig: cfg.namingConfig }, {
        outputDir: current.outputDir, timeout: cfg.timeout, overwrite: cfg.overwriteOutput, zip: cfg.zipEnabled, zipOnError: cfg.zipOnError,
      }, setStage);
      preview.setPreviewData(result.preview);
      preview.setSelectedTestId(result.preview.testCases[0]?.id ?? null);
      setDestination(result.outputDir);
      if (result.errors.length) setError(`${result.errors.length} test(s) failed. See the preview for details.`);
      preview.setIsPreviewOpen(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); }
    finally { activeRun.current = false; setStage(''); }
  }

  function resize(key: keyof typeof widths, e: React.MouseEvent) {
    const start = e.clientX, width = widths[key];
    const move = (event: MouseEvent) => setWidths(prev => ({ ...prev, [key]: Math.max(320, Math.min(600, width + event.clientX - start)) }));
    const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop);
  }

  return <div className="h-full w-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
    <header className="flex items-center justify-between px-4 border-b border-primary bg-secondary/50" style={{ height: 'var(--header-height)' }}>
      <div className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent text-inverse font-bold">V</span><h1 className="font-semibold text-primary">Voidtest</h1><span className="text-xs text-muted">v1.0.0</span></div>
      <Button variant="ghost" size="icon" onClick={() => setPreferences(true)} aria-label="Settings"><Settings className="w-4 h-4" /></Button>
    </header>
    <main className="workspace-main flex-1 flex flex-col overflow-hidden">
      <div className="workspace-panels flex-1 flex overflow-auto min-h-0">
        <div style={{ width: widths.source, flexShrink: 0 }}><SourceCodePanel /></div>
        <div className="splitter splitter-vertical" style={{ width: 4, cursor: 'col-resize' }} onMouseDown={e => resize('source', e)} />
        <div style={{ width: widths.config, flexShrink: 0 }}><TestConfigPanel onGenerate={begin} disabled={busy || !s.sourceCode.trim()} /></div>
        <div className="splitter splitter-vertical" style={{ width: 4, cursor: 'col-resize' }} onMouseDown={e => resize('config', e)} />
        <div style={{ flex: 1, minWidth: 320, minHeight: 0 }}><OutputSettingsPanel subtasks={s.subtasks} testCases={destination ? preview.previewData?.testCases : []} /></div>
      </div>
      <div className="border-t border-primary p-4 bg-secondary/30 space-y-2" aria-live="polite">
        {stage && <p role="status">{stage}</p>}
        {error && <p role="alert" className="text-error whitespace-pre-wrap">{error}</p>}
        {destination && <div className="flex items-center gap-3"><span>Output: {destination}</span><Button variant="secondary" size="sm" onClick={() => api.file.openFolder(destination).catch(e => setError(String(e)))}>Open Folder</Button><Button variant="secondary" size="sm" onClick={() => preview.setIsPreviewOpen(true)}>Preview</Button></div>}
        <Button variant="primary" size="lg" fullWidth disabled={busy || !s.sourceCode.trim()} onClick={begin} className="generate-btn">Create Tests!</Button>
      </div>
      <div className="splitter splitter-horizontal" style={{ height: 4 }} /><LogPanel />
    </main>
    <WelcomeDialog isOpen={welcome} onComplete={() => setWelcome(false)} />
    {configure && s.analysis?.success && <SubtaskConfigDialog isOpen onClose={() => setConfigure(false)} onConfirm={generate} initialSubtasks={s.subtasks} totalTestCount={cfg.testCount} />}
    {preview.isPreviewOpen && <TestPreviewDialog isOpen onClose={() => preview.setIsPreviewOpen(false)} />}
    {preferences && <SettingsDialog isOpen onClose={() => setPreferences(false)} />}
  </div>;
}
