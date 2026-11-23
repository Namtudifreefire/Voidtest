import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { FolderOpen, Save, RotateCcw, Palette, Code, Archive, Hash, Globe, Key } from 'lucide-react';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Select } from './common/Input';
import { Checkbox } from './common/Checkbox';
import { Dialog } from './common/Dialog';
import { useSettings } from '../hooks/useSettings';
import { useIPC } from '../hooks/useIPC';
import { validateNamingConfig } from '../utils/naming';

type SettingsTab = 'general' | 'output' | 'naming' | 'ai' | 'compiler' | 'appearance';

export function SettingsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { settings: appSettings, updateSetting, resetSettings } = useSettings();
  const { file, compile } = useIPC();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [outputDir, setOutputDir] = useState<string>(appSettings?.outputDir || '');
  const [selectingFolder, setSelectingFolder] = useState(false);
  const [aiProvider, setAiProvider] = useState<any>(appSettings?.aiProvider || null);
  const [aiApiKey, setAiApiKey] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [testingCompiler, setTestingCompiler] = useState(false);
  const [compilerTestResult, setCompilerTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const namingValidation = validateNamingConfig({
    format: appSettings?.namingFormat || 'default',
    prefix: appSettings?.customPrefix || 'TEST',
    padding: appSettings?.numberPadding || 2,
    startNumber: appSettings?.startNumber || 1,
  });

  const handleSelectOutputDir = useCallback(async () => {
    setSelectingFolder(true);
    try {
      const dir = await file.selectFolder();
      if (dir) {
        setOutputDir(dir);
        await updateSetting('outputDir', dir);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    } finally {
      setSelectingFolder(false);
    }
  }, [file, updateSetting]);

  const handleAiProviderChange = useCallback(async (provider: any) => {
    setAiProvider(provider);
    if (provider) {
      setAiApiKey(provider.apiKey);
    }
    await updateSetting('aiProvider', provider);
  }, [updateSetting]);

  const handleTestCompiler = useCallback(async () => {
    setTestingCompiler(true);
    setCompilerTestResult({ success: false, message: 'Testing compiler...' });
    try {
      // Compile a simple test program to verify compiler works
      const testCode = `#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`;
      const result = await compile.check(testCode);
      if (result.success) {
        setCompilerTestResult({ success: true, message: `Compiler test passed! ${result.compilerUsed} (${result.compileTime}ms)` });
      } else {
        setCompilerTestResult({ success: false, message: result.errors?.join(', ') || 'Compilation failed' });
      }
    } catch (error) {
      setCompilerTestResult({ success: false, message: error instanceof Error ? error.message : 'Test failed' });
    } finally {
      setTestingCompiler(false);
    }
  }, [compile]);

  const handleSave = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleReset = useCallback(async () => {
    if (window.confirm('Reset all settings to defaults? This cannot be undone.')) {
      await resetSettings();
    }
  }, [resetSettings]);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Code className="w-4 h-4" /> },
  { id: 'output', label: 'Output', icon: <Archive className="w-4 h-4" /> },
  { id: 'naming', label: 'Naming', icon: <Hash className="w-4 h-4" /> },
  { id: 'ai', label: 'AI Provider', icon: <Globe className="w-4 h-4" /> },
  { id: 'compiler', label: 'Compiler', icon: <Code className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
];

return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      maxWidth="xl"
      footer={
        <div className="dialog-footer">
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            <Save className="w-4 h-4" />
            <span>Save</span>
          </Button>
        </div>
      }
    >
      <div className="flex h-[60vh] min-h-[500px]">
        {/* Sidebar */}
        <div className="w-48 min-w-[180px] border-r border-primary bg-secondary/50">
          <nav className="p-2" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary/20 text-accent'
                    : 'text-secondary hover:bg-primary/10 hover:text-primary'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* General Tab */}
          <div role="tabpanel" className={clsx('space-y-6', activeTab !== 'general' && 'hidden')}>
            <h3 className="settings-section-title">General Settings</h3>

            <div className="settings-grid">
              <div className="settings-item">
                <label>Default Test Count</label>
                <Input
                  type="number"
                  value={appSettings?.defaultTestCount || 50}
                  onChange={(e) => updateSetting('defaultTestCount', parseInt(e.target.value) || 50)}
                  min={1}
                  max={10000}
                  fullWidth
                />
              </div>

              <div className="settings-item">
                <label>Default Timeout (ms)</label>
                <Input
                  type="number"
                  value={appSettings?.defaultTimeout || 2000}
                  onChange={(e) => updateSetting('defaultTimeout', parseInt(e.target.value) || 2000)}
                  min={100}
                  max={300000}
                  step={100}
                  fullWidth
                />
              </div>
            </div>

            <div className="settings-item settings-item-full">
              <Checkbox
                label="Enable Execution Log"
                description="Show execution log panel in main window"
                checked={appSettings?.enableLog ?? true}
                onChange={(v) => updateSetting('enableLog', v)}
              />
            </div>
          </div>

          {/* Output Tab */}
          <div role="tabpanel" className={clsx('space-y-6', activeTab !== 'output' && 'hidden')}>
            <h3 className="settings-section-title">Output Settings</h3>

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

            <div className="space-y-3">
              <Checkbox
                label="Overwrite existing files"
                description="Replace files in output directory if they already exist"
                checked={appSettings?.overwriteOutput ?? false}
                onChange={(v) => updateSetting('overwriteOutput', v)}
              />
              <Checkbox
                label="Compress to ZIP"
                description="Create a ZIP archive of all generated test files"
                checked={appSettings?.zipEnabled ?? false}
                onChange={(v) => updateSetting('zipEnabled', v)}
              />
              <Checkbox
                label="ZIP even on errors"
                description="Create ZIP archive even if some test cases fail"
                checked={appSettings?.zipOnError ?? false}
                onChange={(v) => updateSetting('zipOnError', v)}
                disabled={!appSettings?.zipEnabled}
              />
            </div>
          </div>

          {/* Naming Tab */}
          <div role="tabpanel" className={clsx('space-y-6', activeTab !== 'naming' && 'hidden')}>
            <h3 className="settings-section-title">File Naming</h3>

            <div className="settings-grid">
              <div className="settings-item">
                <label>Format</label>
                <Select
                  value={appSettings?.namingFormat || 'default'}
                  onChange={(e) => updateSetting('namingFormat', e.target.value as any)}
                  options={[
                    { value: 'default', label: 'TEST01, TEST02...' },
                    { value: 'numeric', label: '01, 02, 03...' },
                    { value: 'custom', label: 'Custom prefix' },
                  ]}
                  fullWidth
                />
              </div>

              <div className="settings-item">
                <label>Padding (digits)</label>
                <Input
                  type="number"
                  value={appSettings?.numberPadding || 2}
                  onChange={(e) => updateSetting('numberPadding', parseInt(e.target.value) || 2)}
                  min={1}
                  max={10}
                  fullWidth
                />
              </div>

              <div className="settings-item">
                <label>Start Number</label>
                <Input
                  type="number"
                  value={appSettings?.startNumber || 1}
                  onChange={(e) => updateSetting('startNumber', parseInt(e.target.value) || 1)}
                  min={1}
                  max={10000}
                  fullWidth
                />
              </div>
            </div>

            <div className="settings-item settings-item-full">
              <label>Custom Prefix</label>
              <Input
                value={appSettings?.customPrefix || 'TEST'}
                onChange={(e) => updateSetting('customPrefix', e.target.value)}
                placeholder="TEST"
                disabled={appSettings?.namingFormat !== 'custom'}
                error={appSettings?.namingFormat === 'custom' && !namingValidation.valid ? namingValidation.error : undefined}
                fullWidth
              />
            </div>

            <div className="p-3 bg-secondary rounded-lg border border-primary">
              <div className="text-sm text-muted mb-2">Preview:</div>
              <div className="flex flex-wrap gap-1 font-mono text-xs text-secondary">
                {Array.from({ length: 5 }, (_, i) => {
                  const num = (appSettings?.startNumber || 1) + i;
                  let name: string;
                  switch (appSettings?.namingFormat) {
                    case 'numeric':
                      name = String(num).padStart(appSettings?.numberPadding || 2, '0');
                      break;
                    case 'custom':
                      name = `${appSettings?.customPrefix || 'TEST'}${String(num).padStart(appSettings?.numberPadding || 2, '0')}`;
                      break;
                    default:
                      name = `TEST${String(num).padStart(appSettings?.numberPadding || 2, '0')}`;
                  }
                  return <span key={i} className="px-2 py-1 bg-input rounded border border-primary">{name}.inp</span>;
                })}
              </div>
            </div>
          </div>

          {/* AI Provider Tab */}
          <div role="tabpanel" className={clsx('space-y-6', activeTab !== 'ai' && 'hidden')}>
            <h3 className="settings-section-title">AI Provider Configuration</h3>
            <p className="text-sm text-muted mb-4">
              Configure an OpenAI-compatible API endpoint for enhanced code analysis and test generation suggestions.
              Supports OpenAI, Azure OpenAI, Ollama, and other compatible services.
            </p>

            <div className="settings-grid">
              <div className="settings-item">
                <label>Provider Type</label>
                <Select
                  value={aiProvider?.type || 'openai'}
                  onChange={(e) => handleAiProviderChange({ ...(aiProvider || { type: 'openai', apiKey: '', baseUrl: '', model: '' }), type: e.target.value as any })}
                  options={[
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'azure', label: 'Azure OpenAI' },
                    { value: 'ollama', label: 'Ollama (Local)' },
                    { value: 'custom', label: 'Custom Endpoint' },
                  ]}
                  fullWidth
                />
              </div>

              <div className="settings-item">
                <label>Model</label>
                <Input
                  value={aiProvider?.model || ''}
                  onChange={(e) => handleAiProviderChange({ ...(aiProvider || { type: 'openai', apiKey: '', baseUrl: '', model: '' }), model: e.target.value })}
                  placeholder="gpt-4, gpt-3.5-turbo, llama2, etc."
                  fullWidth
                />
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-item settings-item-full">
                <label>Base URL</label>
                <Input
                  value={aiProvider?.baseUrl || ''}
                  onChange={(e) => handleAiProviderChange({ ...(aiProvider || { type: 'openai', apiKey: '', baseUrl: '', model: '' }), baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                  fullWidth
                />
              </div>
            </div>

            <div className="settings-item settings-item-full">
              <label className="flex items-center justify-between">
                <span>API Key</span>
                <Button variant="ghost" size="sm" onClick={() => setShowAiKey(!showAiKey)}>
                  {showAiKey ? 'Hide' : 'Show'}
                </Button>
              </label>
              <Input
                type={showAiKey ? 'text' : 'password'}
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="Enter your API key"
                fullWidth
              />
              <p className="text-xs text-muted mt-1">API key is stored securely in your local settings</p>
            </div>

            <div className="settings-item settings-item-full">
              <Button variant="secondary" onClick={() => handleAiProviderChange(aiProvider)}>
                <Key className="w-4 h-4" />
                <span>Save AI Provider</span>
              </Button>
            </div>

            {aiProvider && (
              <div className="p-3 bg-secondary rounded-lg border border-primary text-sm text-muted">
                <strong>Current Provider:</strong> {aiProvider.type} - {aiProvider.model} @ {aiProvider.baseUrl}
              </div>
            )}
          </div>

          {/* Compiler Tab */}
          <div role="tabpanel" className={clsx('space-y-6', activeTab !== 'compiler' && 'hidden')}>
            <h3 className="settings-section-title">Compiler Settings</h3>

            <div className="settings-item settings-item-full">
              <label className="flex items-center justify-between">
                <span>Custom Compiler Path</span>
                <Button variant="secondary" size="sm" onClick={handleTestCompiler} disabled={testingCompiler}>
                  {testingCompiler ? 'Testing...' : 'Test Compiler'}
                </Button>
              </label>
              <Input
                value={appSettings?.compilerPath || ''}
                onChange={(e) => updateSetting('compilerPath', e.target.value || null)}
                placeholder="Leave empty to auto-detect (g++, clang++, cl.exe, MinGW)"
                fullWidth
              />
              <p className="text-xs text-muted mt-1">
                Auto-detects g++, clang++, or MSVC. Specify a custom path if needed (e.g., C:\\mingw64\\bin\\g++.exe).
              </p>
            </div>

            {compilerTestResult && (
              <div className={clsx('p-3 rounded-lg', compilerTestResult.success ? 'bg-success/10 border border-success/30 text-success' : 'bg-error/10 border border-error/30 text-error')}>
                {compilerTestResult.message}
              </div>
            )}

            <div className="p-3 bg-secondary rounded-lg border border-primary">
              <h4 className="font-medium text-primary mb-2">Default Compilation Flags</h4>
              <div className="font-mono text-xs text-secondary space-y-1">
                <div>GCC/Clang: <code>-std=c++17 -O2 -pipe -Wall -Wextra</code></div>
                <div>MSVC: <code>/std:c++17 /O2 /EHsc /Wall</code></div>
              </div>
            </div>
          </div>

          {/* Appearance Tab */}
          <div role="tabpanel" className={clsx('space-y-6', activeTab !== 'appearance' && 'hidden')}>
            <h3 className="settings-section-title">Appearance</h3>

            <div className="settings-item">
              <label>Theme</label>
              <Select
                value={appSettings?.theme || 'dark'}
                onChange={(e) => updateSetting('theme', e.target.value as any)}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                  { value: 'system', label: 'System' },
                ]}
                fullWidth
              />
            </div>

            <div className="p-3 bg-secondary rounded-lg border border-primary text-sm text-muted">
              Theme changes apply immediately. System theme follows your OS preference.
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}