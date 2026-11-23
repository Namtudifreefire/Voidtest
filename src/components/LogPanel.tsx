import { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Trash2, Download, Filter, ChevronDown, Copy } from 'lucide-react';
import { useLogger } from '../hooks/useLogger';
import { LogLevel } from '../types';
import { Button } from './common/Button';
import { Select } from './common/Input';
import { Tooltip } from './common/Tooltip';
import { formatTimestamp } from '../utils/format';

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

const LEVEL_ICONS: Record<LogLevel, React.ReactNode> = {
  info: <span className="text-info">ℹ</span>,
  success: <span className="text-success">✓</span>,
  warning: <span className="text-warning">⚠</span>,
  error: <span className="text-error">✕</span>,
};

export function LogPanel() {
  const { logs, isEnabled, filterLevel, clear, export: exportLogs, setEnabled, setFilterLevel } = useLogger();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportPath, setExportPath] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
    }
  }, []);

  const handleClear = useCallback(async () => {
    await clear();
  }, [clear]);

  const handleExport = useCallback(async () => {
    try {
      setShowExportDialog(true);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  const handleExportConfirm = useCallback(async () => {
    if (!exportPath.trim()) return;
    try {
      await exportLogs(exportPath);
      setShowExportDialog(false);
      setExportPath('');
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [exportLogs, exportPath]);

  const filteredLogs = logs;

  return (
    <div className="panel flex flex-col" style={{ height: 'var(--log-panel-height, 200px)', minHeight: '120px', maxHeight: '400px' }}>
      {/* Header */}
      <div className="panel-header flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="panel-title">Execution Log</span>
            <Tooltip content={isEnabled ? 'Logging enabled' : 'Logging disabled'}>
              <span className={clsx('w-2 h-2 rounded-full', isEnabled ? 'bg-success' : 'bg-muted')}></span>
            </Tooltip>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content="Filter by level">
            <Select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
              options={[
                { value: 'all', label: 'All' },
                { value: 'error', label: 'Error' },
                { value: 'warning', label: 'Warning' },
                { value: 'success', label: 'Success' },
                { value: 'info', label: 'Info' },
              ]}
              className="w-28 text-xs"
            />
          </Tooltip>
          <Tooltip content="Toggle logging">
            <Button variant="ghost" size="icon" onClick={() => setEnabled(!isEnabled)} aria-label={isEnabled ? 'Disable logging' : 'Enable logging'}>
              {isEnabled ? <Filter className="w-4 h-4 text-primary" /> : <Filter className="w-4 h-4 text-muted" />}
            </Button>
          </Tooltip>
          <Tooltip content="Clear all logs">
            <Button variant="ghost" size="icon" onClick={handleClear} aria-label="Clear logs">
              <Trash2 className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Export logs">
            <Button variant="ghost" size="icon" onClick={handleExport} aria-label="Export logs">
              <Download className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content={isExpanded ? 'Collapse' : 'Expand'}>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} aria-label={isExpanded ? 'Collapse log panel' : 'Expand log panel'}>
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 rotate-180" />}
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Log entries */}
      {isExpanded && (
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs"
          onScroll={handleScroll}
          style={{ minHeight: 0 }}
          role="log"
          aria-live="polite"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center text-muted py-8">
              <p>No logs yet</p>
              <p className="text-[10px]">Logs will appear here during test generation</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={index}
                className={clsx('log-entry flex items-start gap-2 px-2 py-1 rounded hover:bg-primary/30 transition-colors', `log-${log.level}`)}
              >
                <span className={clsx('flex-shrink-0 w-4 text-center', LEVEL_COLORS[log.level])}>
                  {LEVEL_ICONS[log.level]}
                </span>
                <span className="text-muted flex-shrink-0 w-16 font-mono">{formatTimestamp(log.timestamp)}</span>
                <span className="text-secondary/70 flex-shrink-0 w-20 font-medium">{log.category}</span>
                <span className={clsx('flex-1 break-all min-w-0', LEVEL_COLORS[log.level])}>{log.message}</span>
                {log.data !== undefined && log.data !== null && (
                  <Tooltip content={JSON.stringify(log.data, null, 2)}>
                    <Button variant="ghost" size="icon" className="p-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigator.clipboard.writeText(JSON.stringify(log.data, null, 2))} aria-label="Copy details">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Export dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowExportDialog(false)}>
          <div className="bg-secondary rounded-xl border border-primary p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-primary mb-4">Export Logs</h3>
            <p className="text-sm text-muted mb-4">Enter the file path to export logs (JSON format):</p>
            <input
              type="text"
              value={exportPath}
              onChange={(e) => setExportPath(e.target.value)}
              placeholder="/path/to/logs.json"
              className="w-full px-3 py-2 bg-input border border-primary rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowExportDialog(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleExportConfirm}>Export</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}