import { useEffect, useRef, useState } from 'react';
import { Button } from './common/Button';
import { Input, Select } from './common/Input';
import { Checkbox } from './common/Checkbox';
import { Dialog } from './common/Dialog';
import { useSettings } from '../hooks/useSettings';
import { useIPC } from '../hooks/useIPC';
import { validateNamingConfig } from '../utils/naming';
import type { AiProviderConfig } from '../types';

type Tab = 'general' | 'output' | 'naming' | 'ai' | 'compiler' | 'appearance';
const tabs: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' }, { id: 'output', label: 'Output' }, { id: 'naming', label: 'Naming' },
  { id: 'ai', label: 'AI Provider' }, { id: 'compiler', label: 'Compiler' }, { id: 'appearance', label: 'Appearance' },
];
export function SettingsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { settings, updateSetting, resetSettings } = useSettings();
  const api = useIPC();
  const [tab, setTab] = useState<Tab>('general');
  const [provider, setProvider] = useState<AiProviderConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const initialized = useRef(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true;
      setProvider(settings.aiProvider);
      setApiKey(settings.aiProvider?.apiKey ?? '');
    }
  }, [settings]);
  async function saveProvider(next: AiProviderConfig | null) {
    setProvider(next);
    await updateSetting('aiProvider', next ? { ...next, apiKey } : null);
  }
  async function saveAiKey() {
    if (provider) await saveProvider({ ...provider, apiKey });
  }
  async function testCompiler() {
    setTesting(true); setTestResult('Testing compiler...');
    try {
      const result = await api.compile.check('#include <iostream>\nint main(){std::cout << "OK";return 0;}');
      setTestResult(result.success ? `Compiler test passed: ${result.compilerUsed} (${result.compileTime}ms)` : result.errors?.join(', ') || 'Compilation failed');
    } catch (error) { setTestResult(error instanceof Error ? error.message : 'Compiler test failed'); }
    finally { setTesting(false); }
  }
  async function reset() {
    if (!window.confirm('Reset all settings to defaults? This cannot be undone.')) return;
    await resetSettings(); setProvider(null); setApiKey('');
  }
  const namingError = settings ? validateNamingConfig({ format: settings.namingFormat, prefix: settings.customPrefix, padding: settings.numberPadding, startNumber: settings.startNumber }).error : undefined;
  return <Dialog isOpen={isOpen} onClose={onClose} title="Settings" maxWidth="xl" footer={<div className="dialog-footer"><Button variant="ghost" onClick={reset}>Reset to Defaults</Button><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onClose}>Done</Button></div>}>
    {!settings ? <p className="p-6 text-muted">Loading settings...</p> : <div className="flex h-[60vh] min-h-[420px]">
      <nav className="w-40 shrink-0 border-r border-primary p-2" role="tablist">{tabs.map(item => <button key={item.id} role="tab" aria-selected={tab===item.id} onClick={()=>setTab(item.id)} className="block w-full text-left px-3 py-2 rounded hover:bg-secondary">{item.label}</button>)}</nav>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {tab==='general' && <><h2 className="settings-section-title">General Settings</h2><Input label="Default Test Count" type="number" min={1} max={10000} value={settings.defaultTestCount} onChange={e=>void updateSetting('defaultTestCount',Math.max(1,Number(e.target.value)||1))} fullWidth/><Input label="Default Timeout (ms)" type="number" min={100} max={300000} value={settings.defaultTimeout} onChange={e=>void updateSetting('defaultTimeout',Math.max(100,Number(e.target.value)||100))} fullWidth/><Checkbox label="Enable Execution Log" description="Show execution log panel in main window" checked={settings.enableLog} onChange={v=>void updateSetting('enableLog',v)}/></>}
        {tab==='output' && <><h2 className="settings-section-title">Output Settings</h2><Input label="Default Output Directory" value={settings.outputDir} readOnly fullWidth/><Button variant="secondary" onClick={async()=>{const dir=await api.file.selectFolder();if(dir) await updateSetting('outputDir',dir);}}>Browse</Button><Checkbox label="Overwrite existing files" description="Replace files in output directory if they already exist" checked={settings.overwriteOutput} onChange={v=>void updateSetting('overwriteOutput',v)}/><Checkbox label="Compress to ZIP" description="Create a ZIP archive of generated test files" checked={settings.zipEnabled} onChange={v=>void updateSetting('zipEnabled',v)}/><Checkbox label="ZIP even on errors" description="Create an archive when some tests fail" checked={settings.zipOnError} disabled={!settings.zipEnabled} onChange={v=>void updateSetting('zipOnError',v)}/></>}
        {tab==='naming' && <><h2 className="settings-section-title">File Naming</h2><Select label="Format" value={settings.namingFormat} options={[{value:'default',label:'TEST01, TEST02...'},{value:'numeric',label:'01, 02, 03...'},{value:'custom',label:'Custom prefix'}]} onChange={e=>void updateSetting('namingFormat',e.target.value as typeof settings.namingFormat)} fullWidth/><Input label="Custom Prefix" value={settings.customPrefix} disabled={settings.namingFormat!=='custom'} error={settings.namingFormat==='custom'?namingError:undefined} onChange={e=>void updateSetting('customPrefix',e.target.value)} fullWidth/><Input label="Padding (digits)" type="number" min={1} max={10} value={settings.numberPadding} onChange={e=>void updateSetting('numberPadding',Math.min(10,Math.max(1,Number(e.target.value)||1)))} fullWidth/><Input label="Start Number" type="number" min={1} value={settings.startNumber} onChange={e=>void updateSetting('startNumber',Math.max(1,Number(e.target.value)||1))} fullWidth/></>}
        {tab==='ai' && <><h2 className="settings-section-title">AI Provider Configuration</h2><Select label="Provider Type" value={provider?.type ?? 'openai'} options={[{value:'openai',label:'OpenAI'},{value:'azure',label:'Azure OpenAI'},{value:'ollama',label:'Ollama (Local)'},{value:'custom',label:'Custom Endpoint'}]} onChange={e=>void saveProvider({...provider,type:e.target.value as AiProviderConfig['type'],apiKey})} fullWidth/><Input label="Model" value={provider?.model ?? ''} onChange={e=>setProvider(p=>p?{...p,model:e.target.value}:{type:'openai',apiKey,baseUrl:'',model:e.target.value})} fullWidth/><Input label="Base URL" value={provider?.baseUrl ?? ''} onChange={e=>setProvider(p=>p?{...p,baseUrl:e.target.value}:{type:'openai',apiKey,baseUrl:e.target.value,model:''})} fullWidth/><Input label="API Key" type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} fullWidth/><Button variant="secondary" onClick={()=>void saveAiKey()}>Save AI Provider</Button></>}
        {tab==='compiler' && <><h2 className="settings-section-title">Compiler Settings</h2><Input label="Custom Compiler Path" value={settings.compilerPath ?? ''} onChange={e=>void updateSetting('compilerPath',e.target.value||null)} placeholder="Leave empty to auto-detect" fullWidth/><Button variant="secondary" disabled={testing} onClick={()=>void testCompiler()}>{testing?'Testing...':'Test Compiler'}</Button>{testResult&&<p role="status">{testResult}</p>}<p className="text-xs text-muted">GCC/Clang: -std=c++17 -O2 · MSVC: /std:c++17 /O2</p></>}
        {tab==='appearance' && <><h2 className="settings-section-title">Appearance</h2><Select label="Theme" value={settings.theme} options={[{value:'dark',label:'Dark'},{value:'light',label:'Light'},{value:'system',label:'System'}]} onChange={e=>void updateSetting('theme',e.target.value as typeof settings.theme)} fullWidth/><p className="text-sm text-muted">Theme changes apply immediately.</p></>}
      </div>
    </div>}
  </Dialog>;
}
