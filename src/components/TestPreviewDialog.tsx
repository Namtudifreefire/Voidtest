import { useState } from 'react';
import { clsx } from 'clsx';
import { FileText, Code, Search, Download, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from './common/Button';
import { Input, Select } from './common/Input';
import { Dialog } from './common/Dialog';
import { usePreviewStore } from '../store/previewStore';
import { TestCase } from '../types';

interface TestPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TestPreviewDialog({ isOpen, onClose }: TestPreviewDialogProps) {
  const { previewData, selectedTestId, isPreviewOpen, setSelectedTestId, getSelectedTest, getTestsBySubtask } = usePreviewStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'pending' | 'error' | 'timeout'>('all');
  const [activeSubtaskId, setActiveSubtaskId] = useState<number | null>(null);
  const [showInput, setShowInput] = useState(true);

  const selectedTest = getSelectedTest();
  const subtasks = previewData?.subtasks || [];

  // Set default active subtask
  if (!activeSubtaskId && subtasks.length > 0) {
    setActiveSubtaskId(subtasks[0].id);
  }

  const testsForActiveSubtask = activeSubtaskId ? getTestsBySubtask(activeSubtaskId) : [];

  const filteredTests = testsForActiveSubtask.filter((test) => {
    const matchesSearch = test.input.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.output?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<TestCase['status'], string> = {
    pending: 'bg-muted/20 text-muted',
    success: 'bg-success/20 text-success',
    failed: 'bg-error/20 text-error',
    timeout: 'bg-warning/20 text-warning',
    error: 'bg-error/20 text-error',
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleExport = async () => {
    if (!previewData) return;
    const content = JSON.stringify(previewData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voidtest-preview-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !isPreviewOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Test Preview"
      maxWidth="full"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </Button>
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {previewData && (
        <div className="h-[70vh] flex flex-col">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-secondary rounded-lg border border-primary">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'success', label: 'Success' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'error', label: 'Error' },
                  { value: 'timeout', label: 'Timeout' },
                ]}
                className="w-32"
              />
            </div>
            <div className="flex items-center gap-2 border-l border-primary pl-3 ml-2">
              <Button variant="ghost" size="icon" onClick={() => setShowInput(!showInput)} aria-label={showInput ? 'Hide input' : 'Show input'}>
                {showInput ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleExport} aria-label="Export">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Subtask sidebar */}
            <div className="w-56 min-w-[200px] border-r border-primary bg-secondary/50 flex flex-col">
              <div className="p-3 border-b border-primary">
                <h4 className="font-medium text-primary">Subtasks</h4>
                <p className="text-xs text-muted mt-1">{subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {subtasks.map((subtask) => (
                  <button
                    key={subtask.id}
                    onClick={() => setActiveSubtaskId(subtask.id)}
                    className={clsx(
                      'w-full text-left p-2 rounded-lg text-sm transition-colors',
                      activeSubtaskId === subtask.id
                        ? 'bg-primary/30 text-accent'
                        : 'text-secondary hover:bg-primary/10'
                    )}
                  >
                    <div className="font-medium">Subtask {subtask.id}</div>
                    <div className="text-xs text-muted">{subtask.name}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      {subtask.successCount > 0 && <span className="text-success">✓ {subtask.successCount}</span>}
                      {subtask.failedCount > 0 && <span className="text-error">✕ {subtask.failedCount}</span>}
                      <span className="text-muted">{subtask.testCount} total</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Test list */}
            <div className="w-72 min-w-[280px] border-r border-primary bg-secondary/30 flex flex-col">
              <div className="p-3 border-b border-primary">
                <h4 className="font-medium text-primary">Test Cases ({filteredTests.length}/{testsForActiveSubtask.length})</h4>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredTests.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No test cases match your filter</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredTests.map((test) => (
                      <button
                        key={test.id}
                        onClick={() => setSelectedTestId(test.id)}
                        className={clsx(
                          'w-full text-left p-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                          selectedTestId === test.id
                            ? 'bg-primary/30 text-accent'
                            : 'text-secondary hover:bg-primary/10'
                        )}
                      >
                        <span className={clsx('w-10 text-center text-xs font-mono', statusColors[test.status])}>
                          #{test.id}
                        </span>
                        <span className={clsx('flex-1 truncate text-[10px]', statusColors[test.status])}>
                          {test.status}
                        </span>
                        {test.executionTime && (
                          <span className="text-[10px] text-muted">{test.executionTime}ms</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Detail panel */}
            <div className="flex-1 flex flex-col min-w-0">
              {selectedTest ? (
                <>
                  <div className="p-3 border-b border-primary bg-secondary/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={clsx('px-2 py-1 text-xs font-medium rounded', statusColors[selectedTest.status])}>
                        {selectedTest.status.toUpperCase()}
                      </span>
                      <span className="text-sm font-mono text-secondary">Test #{selectedTest.id}</span>
                      <span className="text-xs text-muted">Subtask {selectedTest.subtaskId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTest.executionTime && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <span>⚡</span>
                          {selectedTest.executionTime}ms
                        </span>
                      )}
                      {selectedTest.error && (
                        <span className="text-xs text-error flex items-center gap-1">
                          Error: {selectedTest.error.slice(0, 50)}...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden p-3">
                    <div className="flex border-b border-primary mb-2" role="tablist">
                      <button
                        role="tab"
                        aria-selected={showInput}
                        onClick={() => setShowInput(true)}
                        className={clsx(
                          'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                          showInput ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary'
                        )}
                      >
                        <FileText className="w-4 h-4 inline mr-1" />
                        Input
                      </button>
                      <button
                        role="tab"
                        aria-selected={!showInput}
                        onClick={() => setShowInput(false)}
                        className={clsx(
                          'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                          !showInput ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary'
                        )}
                      >
                        <Code className="w-4 h-4 inline mr-1" />
                        Output
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <div className="bg-input rounded-lg border border-primary p-3 font-mono text-sm whitespace-pre-wrap overflow-auto h-full min-h-0">
                        {showInput ? selectedTest.input : (selectedTest.output || '(No output generated)')}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 border-t border-primary bg-secondary/50 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleCopy(showInput ? selectedTest.input : (selectedTest.output || ''))}>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Select a test case to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}