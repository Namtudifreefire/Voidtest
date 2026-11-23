import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Menu } from 'lucide-react';
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
import { useIPC } from './hooks/useIPC';
import { useSettings } from './hooks/useSettings';
import { useLogger } from './hooks/useLogger';
import { TestGenerationConfig } from './types';

// Type for the generation state
interface GenerationState {
  phase: 'idle' | 'analyzing' | 'configuring' | 'generating' | 'compiling' | 'executing' | 'writing' | 'zipping' | 'complete' | 'error';
  progress: number;
  totalSteps: number;
  currentStep: string;
  errors: string[];
  outputDir: string;
  testCases: any[];
}

export function App() {
  const {
    sourceCode,
    analysis,
    aiAnalysis,
    subtasks,
    isAnalyzing,
    isAiAnalyzing,
    setIsAnalyzing,
    setIsAiAnalyzing,
    setAiAnalysis,
    setSubtasks,
    setAnalysisError,
  } = useCodeStore();

  const { mode, testCount, namingConfig, overwriteOutput, zipEnabled, zipOnError } = useConfigStore();
  const { setIsPreviewOpen } = usePreviewStore();
  const { code, test, compile, execute, file } = useIPC();
  const { settings: appSettings, loading: settingsLoading } = useSettings();
  const { loadLogs } = useLogger();

  const [showWelcome, setShowWelcome] = useState(false);
  const [showSubtaskConfig, setShowSubtaskConfig] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>({
    phase: 'idle',
    progress: 0,
    totalSteps: 6,
    currentStep: '',
    errors: [],
    outputDir: '',
    testCases: [],
  });
  const [menuOpen, setMenuOpen] = useState(false);

  // Panel widths state for resizable panels
  const [panelWidths, setPanelWidths] = useState({
    source: 380,
    config: 380,
    output: 380,
  });

  // Splitter drag handlers
  const handleSplitterDrag = useCallback((panelKey: keyof typeof panelWidths, e: React.MouseEvent) => {
    const startX = e.clientX;
    const startWidth = panelWidths[panelKey];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(320, Math.min(600, startWidth + deltaX));
      setPanelWidths(prev => ({ ...prev, [panelKey]: newWidth }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [panelWidths]);

  // Check first run on mount
  useEffect(() => {
    const checkFirstRun = async () => {
      if (!settingsLoading && appSettings && !appSettings.firstRunComplete) {
        setShowWelcome(true);
      }
      loadLogs();
    };
    checkFirstRun();
  }, [appSettings, settingsLoading, loadLogs]);

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
  }, []);

  const handleAnalyzeComplete = useCallback(async () => {
    if (!analysis || !analysis.success) return;

    // Trigger AI analysis
    setIsAiAnalyzing(true);
    try {
      const aiResult = await code.analyzeAi(sourceCode, analysis);
      setAiAnalysis(aiResult);

      // Convert AI suggestions to subtask configs
      if (aiResult.success && aiResult.suggestedSubtasks.length > 0) {
        const newSubtasks = aiResult.suggestedSubtasks.map((s: any) => ({
          id: s.id,
          name: s.name,
          limits: s.limits,
          testCount: s.testCount,
          generationStrategy: s.generationStrategy,
        }));
        setSubtasks(newSubtasks);
      } else if (analysis.variables.length > 0) {
        // Fallback: create default subtasks based on analysis
        const numericVars = analysis.variables.filter((v: any) => ['int', 'long', 'double', 'float'].includes(v.type));
        if (numericVars.length > 0) {
          const fallbackSubtasks = [
            {
              id: 1,
              name: 'Small',
              limits: Object.fromEntries(numericVars.map((v: any) => [v.name, { min: 1, max: 10 }])),
              testCount: Math.floor(testCount * 0.3),
              generationStrategy: 'boundary',
            },
            {
              id: 2,
              name: 'Medium',
              limits: Object.fromEntries(numericVars.map((v: any) => [v.name, { min: 10, max: 1000 }])),
              testCount: Math.floor(testCount * 0.4),
              generationStrategy: 'mixed',
            },
            {
              id: 3,
              name: 'Large',
              limits: Object.fromEntries(numericVars.map((v: any) => [v.name, { min: 1000, max: 100000 }])),
              testCount: testCount - Math.floor(testCount * 0.3) - Math.floor(testCount * 0.4),
              generationStrategy: 'boundary',
            },
          ];
          setSubtasks(fallbackSubtasks);
        } else {
          setSubtasks([{ id: 1, name: 'Default', limits: {}, testCount, generationStrategy: 'mixed' }]);
        }
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Fallback to basic subtasks
      setSubtasks([{ id: 1, name: 'Default', limits: {}, testCount, generationStrategy: 'mixed' }]);
    } finally {
      setIsAiAnalyzing(false);
      // Show subtask config dialog
      setShowSubtaskConfig(true);
    }
  }, [analysis, sourceCode, code, setAiAnalysis, setSubtasks, setIsAiAnalyzing, testCount]);

  // Trigger handleAnalyzeComplete when analysis completes - only once per analysis
  const analysisCompletedRef = useRef(false);
  useEffect(() => {
    if (analysis && !isAnalyzing && !isAiAnalyzing && analysis.success && !analysisCompletedRef.current) {
      analysisCompletedRef.current = true;
      handleAnalyzeComplete();
    } else if (!analysis || !analysis.success) {
      // Reset flag when analysis is reset or fails
      analysisCompletedRef.current = false;
    }
  }, [analysis, isAnalyzing, isAiAnalyzing, handleAnalyzeComplete]);

  // Handle re-analysis when source code changes
  const lastAnalyzedCodeRef = useRef<string>('');
  useEffect(() => {
    if (sourceCode && sourceCode !== lastAnalyzedCodeRef.current) {
      // Code changed, reset analysis state to allow re-analysis
      lastAnalyzedCodeRef.current = sourceCode;
      analysisCompletedRef.current = false;
    }
  }, [sourceCode]);

  const handleSubtaskConfirm = useCallback(async (configuredSubtasks: any[]) => {
    setShowSubtaskConfig(false);
    setGenerationState({
      phase: 'generating',
      progress: 0,
      totalSteps: 6,
      currentStep: 'Generating test inputs...',
      errors: [],
      outputDir: '',
      testCases: [],
    });

    try {
      // Step 1: Generate test cases
      setGenerationState((prev) => ({ ...prev, currentStep: 'Generating test inputs...', progress: 1 }));

      const genConfig: TestGenerationConfig = {
        code: sourceCode,
        analysis: analysis!,
        aiAnalysis: aiAnalysis || undefined,
        subtasks: configuredSubtasks,
        mode,
        totalTestCount: testCount,
        namingConfig,
      };

      const genResult = await test.generate(genConfig);

      if (!genResult.success) {
        throw new Error(genResult.errors.join(', '));
      }

      // Step 2: Get output directory
      setGenerationState((prev) => ({ ...prev, currentStep: 'Preparing output directory...', progress: 2 }));
      const outputDir = appSettings?.outputDir ?? '';
      const outputTestDir = `${outputDir}/Output-test`;

      // Step 3: Write input files (only .inp files)
      setGenerationState((prev) => ({ ...prev, currentStep: 'Writing input files...', progress: 3 }));
      const writeResult = await file.writeTestFiles({
        outputDir: outputTestDir,
        testCases: genResult.testCases,
        namingConfig,
        overwrite: overwriteOutput,
        mode: 'input-only', // Always write only .inp files first
      });

      if (!writeResult.success) {
        throw new Error(writeResult.errors.join(', '));
      }

      // Create a Map for O(1) test case lookup by ID to avoid race conditions
      const testCaseMap = new Map<number, any>();
      for (const tc of genResult.testCases) {
        testCaseMap.set(tc.id, { ...tc });
      }
      const finalTestCases = [...genResult.testCases];

      // Step 4: Compile and execute if mode is input-output
      if (mode === 'input-output') {
        setGenerationState((prev) => ({ ...prev, currentStep: 'Compiling source code...', progress: 4 }));

        const compileResult = await compile.check(sourceCode);
        if (!compileResult.success || !compileResult.executablePath) {
          throw new Error(compileResult.errors?.join(', ') || 'Compilation failed');
        }

        setGenerationState((prev) => ({ ...prev, currentStep: 'Executing test cases...', progress: 5 }));

        await execute.batch({
          executablePath: compileResult.executablePath,
          testCases: finalTestCases,
          timeout: appSettings?.defaultTimeout || 2000,
          onProgress: (_completed: number, _total: number, result: any, testCaseId: number) => {
            // Update test case by ID using Map for accurate mapping (handles async completion order)
            const existing = testCaseMap.get(testCaseId);
            if (existing) {
              Object.assign(existing, result);
            }
          },
        });

        // Sync Map back to array after batch execution completes
        for (let i = 0; i < finalTestCases.length; i++) {
          const updated = testCaseMap.get(finalTestCases[i].id);
          if (updated) {
            finalTestCases[i] = updated;
          }
        }

        // Write output files (only .out files, .inp already written)
        const outputWriteResult = await file.writeTestFiles({
          outputDir: outputTestDir,
          testCases: finalTestCases,
          namingConfig,
          overwrite: overwriteOutput,
          mode: 'input-output', // Write .out files (and skip .inp since already written)
        });

        if (!outputWriteResult.success) {
          throw new Error(outputWriteResult.errors.join(', '));
        }
      }

      // Step 5: Create ZIP if enabled
      if (zipEnabled) {
        setGenerationState((prev) => ({ ...prev, currentStep: 'Creating ZIP archive...', progress: 6 }));

        const zipResult = await file.createZip({
          sourceDir: outputTestDir,
          outputPath: `${outputTestDir}.zip`,
          includeErrorReport: zipOnError && generationState.errors.length > 0,
          errorReport: generationState.errors.length > 0 ? generationState.errors.join('\n') : undefined,
        });

        if (!zipResult.success) {
          throw new Error(zipResult.error || 'ZIP creation failed');
        }
      }

      setGenerationState((prev) => ({
        ...prev,
        phase: 'complete',
        progress: 6,
        currentStep: 'Done!',
        outputDir: outputTestDir,
        testCases: finalTestCases,
      }));

      // Show preview
      setShowPreview(true);
      setIsPreviewOpen(true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setGenerationState((prev) => ({
        ...prev,
        phase: 'error',
        currentStep: 'Error occurred',
        errors: [...prev.errors, errorMessage],
      }));
    }
  }, [
    sourceCode,
    analysis,
    aiAnalysis,
    mode,
    testCount,
    namingConfig,
    overwriteOutput,
    zipEnabled,
    zipOnError,
    test,
    compile,
    execute,
    file,
    appSettings,
    setShowPreview,
    setIsPreviewOpen,
  ]);

  const handleGenerateClick = useCallback(() => {
    const validation = sourceCode.trim() ? { valid: true, error: undefined as string | undefined } : { valid: false, error: 'Source code is empty' };
    if (!validation.valid) {
      setAnalysisError(validation.error ?? null);
      return;
    }

    if (!analysis || !analysis.success) {
      // Need to analyze first
      setIsAnalyzing(true);
      return;
    }

    // Show subtask config
    setShowSubtaskConfig(true);
  }, [sourceCode, analysis, setIsAnalyzing, setAnalysisError]);

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="flex items-center justify-between h-10 px-4 border-b border-primary bg-secondary/50" style={{ height: 'var(--header-height)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent">
            <span className="text-inverse font-bold text-sm">V</span>
          </div>
          <h1 className="font-semibold text-primary">Voidtest</h1>
          <span className="text-xs text-muted px-2 py-0.5 bg-secondary rounded">v1.0.0</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="Settings" aria-label="Settings">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}>
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Three panels */}
        <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
          <div style={{ width: panelWidths.source, minWidth: 320, maxWidth: 600, flexShrink: 0 }}>
            <SourceCodePanel />
          </div>
          <div
            className="splitter splitter-vertical"
            style={{ width: '4px', cursor: 'col-resize' }}
            onMouseDown={(e) => handleSplitterDrag('source', e)}
          />
          <div style={{ width: panelWidths.config, minWidth: 320, maxWidth: 600, flexShrink: 0 }}>
            <TestConfigPanel />
          </div>
          <div
            className="splitter splitter-vertical"
            style={{ width: '4px', cursor: 'col-resize' }}
            onMouseDown={(e) => handleSplitterDrag('config', e)}
          />
          <div style={{ flex: 1, minWidth: 320, minHeight: 0 }}>
            <OutputSettingsPanel />
          </div>
        </div>

        {/* Generate button and progress */}
        <div className="border-t border-primary p-4 bg-secondary/30">
          {generationState.phase !== 'idle' && generationState.phase !== 'complete' && generationState.phase !== 'error' && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">{generationState.currentStep}</span>
                <span className="text-muted">{generationState.progress}/{generationState.totalSteps}</span>
              </div>
              <div className="progress-bar h-2">
                <div className="progress-fill" style={{ width: `${(generationState.progress / generationState.totalSteps) * 100}%` }} />
              </div>
              {generationState.errors.length > 0 && (
                <div className="mt-2 text-xs text-error">
                  {generationState.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
          )}

          {generationState.phase === 'complete' && generationState.outputDir && (
            <div className="flex items-center gap-3 text-success">
              <span className="font-medium">Generation complete! Output: {generationState.outputDir}</span>
              <Button variant="secondary" size="sm" onClick={() => file.openFolder(generationState.outputDir)}>
                Open Folder
              </Button>
            </div>
          )}

          {generationState.phase === 'error' && (
            <div className="flex items-center gap-3 text-error">
              <span className="font-medium">Generation failed: {generationState.errors[generationState.errors.length - 1]}</span>
            </div>
          )}

          {generationState.phase === 'idle' && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleGenerateClick}
              disabled={isAnalyzing || isAiAnalyzing || !sourceCode.trim()}
              loading={isAnalyzing || isAiAnalyzing}
              className="generate-btn"
            >
              <span>Create Tests!</span>
            </Button>
          )}
        </div>

        {/* Log panel */}
        <div className="splitter splitter-horizontal" style={{ height: '4px' }} />
        <LogPanel />
      </main>

      {/* Dialogs */}
      <WelcomeDialog isOpen={showWelcome} onComplete={handleWelcomeComplete} />
      <SubtaskConfigDialog
        isOpen={showSubtaskConfig}
        onClose={() => setShowSubtaskConfig(false)}
        onConfirm={handleSubtaskConfirm}
        initialSubtasks={subtasks}
        totalTestCount={testCount}
      />
      <TestPreviewDialog isOpen={showPreview} onClose={() => { setShowPreview(false); setIsPreviewOpen(false); }} />
      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}