import { Button } from './common/Button';
import { Input } from './common/Input';
import { useConfigStore } from '../store/configStore';
import { validateTestCount, validateTimeout } from '../utils/validation';

export function TestConfigPanel({ onGenerate, disabled }: { onGenerate: () => void; disabled: boolean }) {
  const { mode, testCount, timeout, setMode, setTestCount, setTimeout } = useConfigStore();
  const count = validateTestCount(testCount), time = validateTimeout(timeout);
  return <div className="panel h-full" style={{ minWidth: 320 }}>
    <div className="panel-header"><span className="panel-title">Test Configuration</span></div>
    <div className="panel-section"><div className="panel-section-title">Generation Mode</div>
      {(['input-only', 'input-output'] as const).map(value => <label key={value} className="radio-wrapper"><input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} /><span className="radio-label">{value === 'input-only' ? 'Input Only' : 'Input & Output'}</span></label>)}
      <p className="text-xs text-muted">{mode === 'input-only' ? 'Generate .inp files without compiling.' : 'Compile the C++ program and save its actual output for each input.'}</p>
    </div>
    <div className="panel-section"><Input label="Test Count" type="number" min={1} max={10000} value={testCount} onChange={e => setTestCount(Number(e.target.value))} error={count.error} fullWidth /></div>
    <div className="panel-section"><Input label="Execution Timeout (ms)" type="number" min={100} max={300000} step={100} value={timeout} disabled={mode === 'input-only'} onChange={e => setTimeout(Number(e.target.value))} error={time.error} fullWidth /></div>
    <div className="panel-section"><div className="panel-section-title">Quick Presets</div><div className="flex flex-wrap gap-2">{[10,50,100,200,500].map(n => <Button key={n} variant="ghost" size="sm" onClick={() => setTestCount(n)}>{n}</Button>)}</div></div>
    <div className="mt-auto pt-4 border-t border-primary"><Button variant="primary" fullWidth size="lg" className="generate-btn" disabled={disabled || !count.valid || (mode === 'input-output' && !time.valid)} onClick={onGenerate}>Create Tests!</Button></div>
  </div>;
}
