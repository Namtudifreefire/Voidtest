import { useState } from 'react';
import { clsx } from 'clsx';
import { FileText, Code, Search, Download, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from './common/Button';
import { Input, Select } from './common/Input';
import { Dialog } from './common/Dialog';
import { usePreviewStore } from '../store/previewStore';
import type { TestCase } from '../types';

interface TestPreviewDialogProps { isOpen: boolean; onClose: () => void }
export function TestPreviewDialog({ isOpen, onClose }: TestPreviewDialogProps) {
  const { previewData, selectedTestId, isPreviewOpen, setSelectedTestId, getSelectedTest, getTestsBySubtask } = usePreviewStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TestCase['status']>('all');
  const [activeSubtaskId, setActiveSubtaskId] = useState<number | null>(null);
  const [showInput, setShowInput] = useState(true);
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);
  const subtasks = previewData?.subtasks ?? [];
  const activeId = subtasks.some(s => s.id === activeSubtaskId) ? activeSubtaskId : subtasks[0]?.id ?? null;
  const tests = activeId === null ? [] : getTestsBySubtask(activeId);
  const query = searchQuery.trim().toLocaleLowerCase();
  const filteredTests = tests.filter(test => (filterStatus === 'all' || test.status === filterStatus) &&
    (!query || test.input.toLocaleLowerCase().includes(query) || (test.output ?? '').toLocaleLowerCase().includes(query)));
  const selected = getSelectedTest();
  const selectedTest = selected?.subtaskId === activeId && filteredTests.some(test => test.id === selected.id) ? selected : null;
  const statusColors: Record<TestCase['status'], string> = {
    pending: 'bg-muted/20 text-muted', success: 'bg-success/20 text-success',
    failed: 'bg-error/20 text-error', timeout: 'bg-warning/20 text-warning', error: 'bg-error/20 text-error',
  };
  async function handleCopy(text: string) {
    setActionError(''); setCopied(false);
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch (error) { setActionError(error instanceof Error ? `Could not copy: ${error.message}` : 'Could not copy to clipboard.'); }
  }
  function handleExport() {
    if (!previewData) return;
    try {
      const blob = new Blob([JSON.stringify(previewData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `voidtest-preview-${Date.now()}.json`;
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setActionError('');
    } catch (error) { setActionError(error instanceof Error ? `Could not export: ${error.message}` : 'Could not export preview.'); }
  }
  if (!isOpen || !isPreviewOpen) return null;
  return <Dialog isOpen={isOpen} onClose={onClose} title="Test Preview" maxWidth="full" footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={handleExport}><Download className="w-4 h-4" /><span>Export JSON</span></Button><Button variant="primary" onClick={onClose}>Close</Button></div>}>
    {!previewData ? <p className="py-12 text-center text-muted">No test preview is available.</p> : <div className="h-[70vh] min-h-0 flex flex-col">
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-secondary rounded-lg border border-primary">
        <div className="flex-1 min-w-[200px]"><Input aria-label="Search test cases" placeholder="Search test cases..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full" /></div>
        <Select aria-label="Filter by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value as 'all' | TestCase['status'])} options={[{value:'all',label:'All'},{value:'success',label:'Success'},{value:'failed',label:'Failed'},{value:'pending',label:'Pending'},{value:'error',label:'Error'},{value:'timeout',label:'Timeout'}]} />
        <Button variant="ghost" size="icon" onClick={() => setShowInput(v => !v)} aria-label={showInput ? 'Hide input' : 'Show input'}>{showInput ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</Button>
        <Button variant="ghost" size="icon" onClick={handleExport} aria-label="Export preview"><Download className="w-4 h-4" /></Button>
      </div>
      {actionError && <p role="alert" className="text-sm text-error mb-2">{actionError}</p>}
      {copied && <p role="status" className="text-sm text-muted mb-2">Copied to clipboard.</p>}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside className="w-56 min-w-[150px] border-r border-primary bg-secondary/50 flex flex-col">
          <div className="p-3 border-b border-primary"><h2 className="font-medium">Subtasks</h2><p className="text-xs text-muted">{subtasks.length} total</p></div>
          <div className="flex-1 overflow-y-auto p-2">{subtasks.map(subtask => <button key={subtask.id} onClick={() => {setActiveSubtaskId(subtask.id); setSelectedTestId(getTestsBySubtask(subtask.id)[0]?.id ?? null); setActionError('');}} className={clsx('w-full text-left p-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent', activeId === subtask.id ? 'bg-primary/30 text-accent' : 'text-secondary hover:bg-primary/10')}>
            <span className="font-medium">Subtask {subtask.id}</span><span className="block text-xs text-muted">{subtask.name}</span><span className="text-xs text-muted">{subtask.testCount} tests</span>
          </button>)}</div>
        </aside>
        <section className="w-72 min-w-[180px] border-r border-primary bg-secondary/30 flex flex-col">
          <div className="p-3 border-b border-primary"><h2 className="font-medium">Test cases ({filteredTests.length}/{tests.length})</h2></div>
          <div className="flex-1 overflow-y-auto">{filteredTests.length === 0 ? <p className="p-4 text-center text-sm text-muted">No test cases match your filter.</p> : <div className="p-2 space-y-1">{filteredTests.map(test => <button key={test.id} onClick={() => {setSelectedTestId(test.id); setActionError('');}} className={clsx('w-full text-left p-2 rounded-lg text-sm transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent', selectedTestId === test.id ? 'bg-primary/30 text-accent' : 'text-secondary hover:bg-primary/10')}><span className={clsx('w-10 text-center text-xs font-mono',statusColors[test.status])}>#{test.id}</span><span className={clsx('flex-1 truncate text-xs',statusColors[test.status])}>{test.status}</span>{test.executionTime !== undefined && <span className="text-xs text-muted">{test.executionTime}ms</span>}</button>)}</div>}</div>
        </section>
        <section className="flex-1 min-w-0 flex flex-col">{selectedTest ? <>
          <div className="p-3 border-b border-primary bg-secondary/50 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><span className={clsx('px-2 py-1 text-xs font-medium rounded',statusColors[selectedTest.status])}>{selectedTest.status.toUpperCase()}</span><span className="text-sm font-mono">Test #{selectedTest.id}</span><span className="text-xs text-muted">Subtask {selectedTest.subtaskId}</span></div>{selectedTest.error && <span className="text-xs text-error" title={selectedTest.error}>{selectedTest.error}</span>}</div>
          <div className="flex-1 min-h-0 overflow-auto p-3"><div className="flex border-b border-primary mb-2" role="tablist"><button role="tab" aria-selected={showInput} onClick={() => setShowInput(true)} className={clsx('px-3 py-2 text-sm border-b-2',showInput?'border-accent text-accent':'border-transparent text-muted') }><FileText className="w-4 h-4 inline mr-1" />Input</button><button role="tab" aria-selected={!showInput} onClick={() => setShowInput(false)} className={clsx('px-3 py-2 text-sm border-b-2',!showInput?'border-accent text-accent':'border-transparent text-muted')}><Code className="w-4 h-4 inline mr-1" />Output</button></div><pre className="bg-input rounded-lg border border-primary p-3 font-mono text-sm whitespace-pre-wrap break-words min-h-24">{showInput ? selectedTest.input : (selectedTest.output ?? '(No output generated)')}</pre></div>
          <div className="p-3 border-t border-primary flex justify-end"><Button variant="secondary" size="sm" onClick={() => void handleCopy(showInput ? selectedTest.input : (selectedTest.output ?? ''))}><Copy className="w-4 h-4" /><span>Copy</span></Button></div>
        </> : <div className="flex-1 flex items-center justify-center text-muted"><div className="text-center"><Search className="w-8 h-8 mx-auto mb-2" /><p>{filteredTests.length === 0 ? 'No matching test cases.' : 'Select a test case to view details.'}</p></div></div>}</section>
      </div>
    </div>}
  </Dialog>;
}
