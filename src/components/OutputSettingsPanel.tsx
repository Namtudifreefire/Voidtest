import { useState } from 'react';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { useConfigStore } from '../store/configStore';
import { useSettings } from '../hooks/useSettings';
import { useIPC } from '../hooks/useIPC';
import type { SubtaskConfig, TestCase } from '../types';

interface Props { subtasks?: SubtaskConfig[]; testCases?: TestCase[] }
export function OutputSettingsPanel({ subtasks = [], testCases = [] }: Props) {
  const cfg = useConfigStore();
  const { file } = useIPC();
  const { settings, updateSetting } = useSettings();
  const [choosing, setChoosing] = useState(false), [error,setError] = useState('');
  async function browse() {
    setChoosing(true); setError('');
    try { const dir = await file.selectFolder(); if (dir) await updateSetting('outputDir',dir); }
    catch(e) { setError(e instanceof Error ? e.message : 'Could not change output directory'); }
    finally { setChoosing(false); }
  }
  const naming = cfg.namingConfig;
  const prefix = naming.format === 'numeric' ? '' : naming.format === 'custom' ? naming.prefix : 'TEST';
  return <div className="panel flex-1 flex flex-col" style={{ minWidth:320 }}>
    <div className="panel-header"><span className="panel-title">Output Settings</span></div>
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <details open><summary className="settings-section-title cursor-pointer">Output Directory</summary><div className="flex items-end gap-2 mt-3"><Input label="Default Output Directory" value={settings?.outputDir ?? ''} readOnly fullWidth /><Button variant="secondary" disabled={choosing || !settings} onClick={browse}>Browse</Button></div>
        <p className="text-xs text-muted mt-2">Tests are saved in subtask folders under Output-test/.</p>{error && <p role="alert" className="text-error">{error}</p>}</details>
      <details open><summary className="settings-section-title cursor-pointer">File Naming</summary><p className="text-sm mt-2">{naming.format} · {naming.padding} digits · Start: {naming.startNumber}</p>
        <ul className="font-mono text-xs space-y-1 mt-2">{Array.from({ length: Math.min(cfg.testCount,5) }, (_,i) => {const base=prefix+String(naming.startNumber+i).padStart(naming.padding,'0');return <li key={i}>{base}.inp{cfg.mode==='input-output' ? `, ${base}.out` : ''}</li>;})}</ul></details>
      {subtasks.length>0 && <details open><summary className="settings-section-title cursor-pointer">Subtasks ({subtasks.length})</summary><ul className="space-y-2 mt-2 text-sm">{subtasks.map(s => {const cases=testCases.filter(tc=>tc.subtaskId===s.id);return <li key={s.id}><strong>{s.name}</strong> · {s.testCount} tests · {s.generationStrategy}<div className="text-xs text-muted">{Object.entries(s.limits).map(([v,r])=>`${v}: ${r.min}–${r.max}`).join(', ')}</div>{cases.length>0 && <p>{cases.filter(tc=>tc.status==='success').length} passed · {cases.filter(tc=>!['success','pending'].includes(tc.status)).length} failed</p>}</li>;})}</ul></details>}
      {testCases.length>0 && <details><summary className="settings-section-title cursor-pointer">Test Cases ({testCases.length})</summary><ul className="text-sm mt-2">{testCases.slice(0,20).map(tc=><li key={tc.id}>#{tc.id} · {tc.status} · {tc.input.slice(0,80)}</li>)}</ul></details>}
      <section className="space-y-2"><h3 className="settings-section-title">Output Options</h3>
        <label className="flex gap-2"><input type="checkbox" checked={cfg.overwriteOutput} onChange={e=>cfg.setOverwriteOutput(e.target.checked)}/>Overwrite existing files</label>
        <label className="flex gap-2"><input type="checkbox" checked={cfg.zipEnabled} onChange={e=>cfg.setZipEnabled(e.target.checked)}/>Compress to ZIP</label>
        {cfg.zipEnabled && <label className="flex gap-2"><input type="checkbox" checked={cfg.zipOnError} onChange={e=>cfg.setZipOnError(e.target.checked)}/>ZIP even on errors</label>}
      </section>
    </div>
  </div>;
}
