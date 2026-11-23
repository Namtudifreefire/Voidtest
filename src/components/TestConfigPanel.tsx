import { Button } from './common/Button';
import { Input } from './common/Input';
import { useConfigStore } from '../store/configStore';
import { validateTestCount, validateTimeout } from '../utils/validation';
import { Info } from 'lucide-react';

export function TestConfigPanel() {
  const { mode, testCount, timeout, setMode, setTestCount, setTimeout } = useConfigStore();

  const testCountValidation = validateTestCount(testCount);
  const timeoutValidation = validateTimeout(timeout);

  return (
    <div className="panel" style={{ width: 'var(--panel-width)', minWidth: '320px', flexShrink: 0 }}>
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">Test Configuration</span>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Generation Mode</div>
        <div className="space-y-3">
          <label className="radio-wrapper">
            <input
              type="radio"
              name="mode"
              value="input-only"
              checked={mode === 'input-only'}
              onChange={() => setMode('input-only')}
            />
            <span className="radio-label">Input Only</span>
          </label>
          <p className="text-xs text-muted ml-7">Generate only .inp test files</p>

          <label className="radio-wrapper">
            <input
              type="radio"
              name="mode"
              value="input-output"
              checked={mode === 'input-output'}
              onChange={() => setMode('input-output')}
            />
            <span className="radio-label">Input & Output</span>
          </label>
          <p className="text-xs text-muted ml-7">Generate .inp files and compile/run to produce .out files</p>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Test Count</div>
        <Input
          type="number"
          value={testCount}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              setTestCount(0);
            } else {
              const parsed = parseInt(value, 10);
              if (!isNaN(parsed)) {
                setTestCount(parsed);
              }
            }
          }}
          min={1}
          max={10000}
          error={!testCountValidation.valid ? testCountValidation.error : undefined}
          helperText={testCountValidation.valid ? 'Number of test cases to generate (1-10000)' : undefined}
          fullWidth
        />
        {!testCountValidation.valid && (
          <div className="flex items-center gap-2 text-xs text-error mt-1">
            <span>!</span>
            <span>{testCountValidation.error}</span>
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Execution Timeout</div>
        <Input
          type="number"
          value={timeout}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              setTimeout(0);
            } else {
              const parsed = parseInt(value, 10);
              if (!isNaN(parsed)) {
                setTimeout(parsed);
              }
            }
          }}
          min={100}
          max={300000}
          step={100}
          error={!timeoutValidation.valid ? timeoutValidation.error : undefined}
          helperText={timeoutValidation.valid ? 'Timeout per test case in milliseconds (100-300000)' : undefined}
          fullWidth
        />
        {!timeoutValidation.valid && (
          <div className="flex items-center gap-2 text-xs text-error mt-1">
            <span>!</span>
            <span>{timeoutValidation.error}</span>
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Quick Presets</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setTestCount(10)}>10</Button>
          <Button variant="ghost" size="sm" onClick={() => setTestCount(50)}>50</Button>
          <Button variant="ghost" size="sm" onClick={() => setTestCount(100)}>100</Button>
          <Button variant="ghost" size="sm" onClick={() => setTestCount(200)}>200</Button>
          <Button variant="ghost" size="sm" onClick={() => setTestCount(500)}>500</Button>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Information</div>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
            <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-primary">Input Only Mode</p>
              <p className="text-muted mt-1">Generates test input files (.inp) based on code analysis. No compilation or execution required.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
            <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-primary">Input & Output Mode</p>
              <p className="text-muted mt-1">Generates inputs, compiles your code, runs it for each test, and saves actual outputs (.out). Requires valid C++ compiler.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-primary">
        <Button variant="primary" fullWidth size="lg" className="generate-btn">
          <span>Create Tests!</span>
        </Button>
      </div>
    </div>
  );
}