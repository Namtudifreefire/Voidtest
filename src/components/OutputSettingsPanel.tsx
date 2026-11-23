import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { FolderOpen, FileText, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { useConfigStore } from '../store/configStore';
import { useIPC } from '../hooks/useIPC';
import { useSettings } from '../hooks/useSettings';
import { TestCase, SubtaskConfig } from '../types';

interface OutputSettingsPanelProps {
  subtasks?: SubtaskConfig[];
  testCases?: TestCase[];
}

export function OutputSettingsPanel({ subtasks = [], testCases = [] }: OutputSettingsPanelProps) {
  const { namingConfig, overwriteOutput, zipEnabled, zipOnError, mode, testCount } = useConfigStore();
  const { file } = useIPC();
  const { settings: appSettingsData } = useSettings();
  const [outputDir, setOutputDir] = useState<string>(appSettingsData?.outputDir || '');
  const [selectingFolder, setSelectingFolder] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    subtasks: true,
    testCases: false,
    naming: true,
    output: true,
  });

  const handleSelectOutputDir = useCallback(async () => {
    setSelectingFolder(true);
    try {
      const dir = await file.selectFolder();
      if (dir) {
        setOutputDir(dir);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    } finally {
      setSelectingFolder(false);
    }
  }, [file]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getNamingPreview = () => {
    const count = Math.min(5, testCount);
    return Array.from({ length: count }, (_, i) => {
      const num = namingConfig.startNumber + i;
      let name: string;
      switch (namingConfig.format) {
        case 'numeric':
          name = String(num).padStart(namingConfig.padding, '0');
          break;
        case 'custom':
          name = `${namingConfig.prefix}${String(num).padStart(namingConfig.padding, '0')}`;
          break;
        default:
          name = `TEST${String(num).padStart(namingConfig.padding, '0')}`;
      }
      return `${name}.inp${mode === 'input-output' ? `, ${name}.out` : ''}`;
    });
  };

  const subtaskStats = subtasks.map(st => {
    const cases = testCases.filter(tc => tc.subtaskId === st.id);
    const success = cases.filter(c => c.status === 'success').length;
    const failed = cases.filter(c => c.status === 'failed').length;
    const pending = cases.filter(c => c.status === 'pending').length;
    return { ...st, success, failed, pending, total: cases.length };
  });

  return (
    <div className="panel flex-1 flex flex-col" style={{ minWidth: '320px' }}>
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-accent" />
          <span className="panel-title">Output Settings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ minHeight: 0 }}>
        {/* Output Directory Section */}
        <div className="settings-section">
          <div className="flex items-center justify-between mb-3">
            <h3 className="settings-section-title">Output Directory</h3>
            <Button variant="ghost" size="icon" onClick={() => toggleSection('output')} aria-label="Toggle output section">
              {expandedSections.output ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {expandedSections.output && (
            <div className="space-y-3">
              <div className="settings-item settings-item-full">
                <label className="block text-sm font-medium text-secondary mb-2">Default Output Directory</label>
                <div className="flex gap-2">
                  <Input
                    value={outputDir}
                    onChange={(e) => setOutputDir(e.target.value)}
                    placeholder="Select output directory..."
                    disabled
                    className="flex-1"
                  />
                  <Button variant="secondary" onClick={handleSelectOutputDir} disabled={selectingFolder} fullWidth>
                    <FolderOpen className="w-4 h-4" />
                    <span>{selectingFolder ? 'Selecting...' : 'Browse'}</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                  <span className="text-muted">Subdirectory</span>
                  <code className="text-primary">Output-test/</code>
                </div>
                <p className="text-xs text-muted">Test files will be organized in subtask folders under Output-test/</p>
              </div>
            </div>
          )}
        </div>

        {/* Naming Section */}
        <div className="settings-section">
          <div className="flex items-center justify-between mb-3">
            <h3 className="settings-section-title">File Naming</h3>
            <Button variant="ghost" size="icon" onClick={() => toggleSection('naming')} aria-label="Toggle naming section">
              {expandedSections.naming ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {expandedSections.naming && (
            <div className="space-y-3">
              <div className="p-3 bg-secondary rounded-lg border border-primary">
                <div className="text-sm text-muted mb-2">Preview ({mode === 'input-output' ? '.inp & .out' : '.inp only'}):</div>
                <div className="flex flex-wrap gap-1 font-mono text-xs text-secondary">
                  {getNamingPreview().map((name, i) => (
                    <span key={i} className="px-2 py-1 bg-input rounded border border-primary">{name}</span>
                  ))}
                  {testCount > 5 && <span className="px-2 py-1 bg-input rounded border border-primary text-muted">...</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-secondary rounded-lg">
                  <div className="text-muted">Format</div>
                  <div className="font-medium capitalize">{namingConfig.format}</div>
                </div>
                <div className="p-2 bg-secondary rounded-lg">
                  <div className="text-muted">Padding</div>
                  <div className="font-medium">{namingConfig.padding} digits</div>
                </div>
                <div className="p-2 bg-secondary rounded-lg">
                  <div className="text-muted">Start</div>
                  <div className="font-medium">{namingConfig.startNumber}</div>
                </div>
                {namingConfig.format === 'custom' && (
                  <div className="p-2 bg-secondary rounded-lg">
                    <div className="text-muted">Prefix</div>
                    <div className="font-medium">{namingConfig.prefix}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Subtasks Section */}
        {subtasks.length > 0 && (
          <div className="settings-section">
            <div className="flex items-center justify-between mb-3">
              <h3 className="settings-section-title">Subtasks ({subtasks.length})</h3>
              <Button variant="ghost" size="icon" onClick={() => toggleSection('subtasks')} aria-label="Toggle subtasks section">
                {expandedSections.subtasks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {expandedSections.subtasks && (
              <div className="space-y-3">
                {subtaskStats.map((st) => (
                  <div key={st.id} className="p-3 bg-secondary rounded-lg border border-primary">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary rounded text-xs font-medium">Subtask {st.id}</span>
                        <span className="text-primary font-medium">{st.name}</span>
                      </div>
                      <span className="text-xs text-muted">{st.generationStrategy}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-input rounded">
                        <div className="text-muted">Test Count</div>
                        <div className="font-medium">{st.testCount}</div>
                      </div>
                      <div className="p-2 bg-input rounded">
                        <div className="text-muted">Limits</div>
                        <div className="font-medium font-mono truncate">
                          {Object.entries(st.limits).map(([k, v]) => `${k}:${v.min}-${v.max}`).join(', ') || 'None'}
                        </div>
                      </div>
                      <div className="p-2 bg-input rounded">
                        <div className="text-muted">Status</div>
                        <div className="flex items-center gap-1">
                          {st.success > 0 && <span className="text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" />{st.success}</span>}
                          {st.failed > 0 && <span className="text-error flex items-center gap-1"><AlertCircle className="w-3 h-3" />{st.failed}</span>}
                          {st.pending > 0 && <span className="text-muted flex items-center gap-1"><Clock className="w-3 h-3" />{st.pending}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test Cases Section */}
        {testCases.length > 0 && (
          <div className="settings-section">
            <div className="flex items-center justify-between mb-3">
              <h3 className="settings-section-title">Test Cases ({testCases.length})</h3>
              <Button variant="ghost" size="icon" onClick={() => toggleSection('testCases')} aria-label="Toggle test cases section">
                {expandedSections.testCases ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {expandedSections.testCases && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testCases.slice(0, 20).map((tc) => (
                  <div key={tc.id} className="flex items-center gap-2 p-2 bg-secondary rounded border border-primary">
                    <span className="w-10 text-xs text-muted font-mono">#{tc.id}</span>
                    <span className="flex-1 text-xs font-mono text-secondary truncate">{tc.input.length > 80 ? tc.input.slice(0, 80) + '...' : tc.input}</span>
                    <span className={clsx('px-2 py-0.5 text-[10px] font-medium rounded', tc.status === 'success' && 'bg-success/20 text-success', tc.status === 'failed' && 'bg-error/20 text-error', tc.status === 'pending' && 'bg-muted/20 text-muted', tc.status === 'timeout' && 'bg-warning/20 text-warning', tc.status === 'error' && 'bg-error/20 text-error')}>
                      {tc.status}
                    </span>
                    {tc.executionTime && <span className="text-xs text-muted flex items-center gap-1"><Zap className="w-3 h-3" />{tc.executionTime}ms</span>}
                  </div>
                ))}
                {testCases.length > 20 && (
                  <div className="text-center text-xs text-muted py-2">... and {testCases.length - 20} more test cases</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Output Options */}
        <div className="settings-section pt-4 border-t border-primary">
          <h3 className="settings-section-title mb-3">Output Options</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
              <div>
                <div className="text-sm font-medium text-primary">Overwrite existing files</div>
                <div className="text-xs text-muted">Replace files in output directory if they already exist</div>
              </div>
              <input
                type="checkbox"
                checked={overwriteOutput}
                disabled
                className="w-5 h-5 accent-accent"
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
              <div>
                <div className="text-sm font-medium text-primary">Compress to ZIP</div>
                <div className="text-xs text-muted">Create a ZIP archive of all generated test files</div>
              </div>
              <input
                type="checkbox"
                checked={zipEnabled}
                disabled
                className="w-5 h-5 accent-accent"
              />
            </div>
            {zipEnabled && (
              <div className="flex items-center justify-between p-2 bg-secondary rounded-lg ml-6">
                <div>
                  <div className="text-sm font-medium text-primary">ZIP even on errors</div>
                  <div className="text-xs text-muted">Create ZIP archive even if some test cases fail</div>
                </div>
                <input
                  type="checkbox"
                  checked={zipOnError}
                  disabled
                  className="w-5 h-5 accent-accent"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}