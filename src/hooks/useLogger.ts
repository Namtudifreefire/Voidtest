import { useCallback, useEffect, useRef, useState } from 'react';
import { useIPC } from './useIPC';
import { useLogStore } from '../store/logStore';
import { LogEntry } from '../types';

export function useLogger() {
  const { log } = useIPC();
  const { logs, addLog, setLogs, clearLogs, setEnabled, setFilterLevel, getFilteredLogs, isEnabled, filterLevel, maxLogs } = useLogStore();
  const initializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load logs on mount
  const loadLogs = useCallback(async () => {
    if (initializedRef.current) return;
    try {
      setIsLoading(true);
      const entries = await log.getAll();
      setLogs(entries);
      initializedRef.current = true;
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [log, setLogs]);

  // Subscribe to log entries from main process
  useEffect(() => {
    const unsubscribe = log.onEntry((entry: LogEntry) => {
      if (isEnabled) {
        addLog(entry);
      }
    });
    return unsubscribe;
  }, [log, isEnabled, addLog]);

  const addLogEntry = useCallback((level: LogEntry['level'], category: string, message: string, data?: unknown) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };
    addLog(entry);
  }, [addLog]);

  const logInfo = useCallback((category: string, message: string, data?: unknown) => {
    addLogEntry('info', category, message, data);
  }, [addLogEntry]);

  const logSuccess = useCallback((category: string, message: string, data?: unknown) => {
    addLogEntry('success', category, message, data);
  }, [addLogEntry]);

  const logWarning = useCallback((category: string, message: string, data?: unknown) => {
    addLogEntry('warning', category, message, data);
  }, [addLogEntry]);

  const logError = useCallback((category: string, message: string, data?: unknown) => {
    addLogEntry('error', category, message, data);
  }, [addLogEntry]);

  const clear = useCallback(async () => {
    clearLogs();
    try {
      await log.clear();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }, [clearLogs, log]);

  const exportLogs = useCallback(async (path: string) => {
    try {
      await log.export(path);
    } catch (error) {
      console.error('Failed to export logs:', error);
      throw error;
    }
  }, [log]);

  return {
    // State
    logs: getFilteredLogs(),
    allLogs: logs,
    isEnabled,
    filterLevel,
    maxLogs,
    isLoading,

    // Actions
    loadLogs,
    addLog: addLogEntry,
    info: logInfo,
    success: logSuccess,
    warning: logWarning,
    error: logError,
    clear,
    export: exportLogs,
    setEnabled,
    setFilterLevel,
  };
}