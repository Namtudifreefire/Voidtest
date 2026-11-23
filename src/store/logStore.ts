import { create } from 'zustand';
import { LogEntry, LogLevel } from '../types';

interface LogState {
  logs: LogEntry[];
  isEnabled: boolean;
  filterLevel: LogLevel | 'all';
  maxLogs: number;

  addLog: (log: LogEntry) => void;
  setLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
  setEnabled: (enabled: boolean) => void;
  setFilterLevel: (level: LogLevel | 'all') => void;
  getFilteredLogs: () => LogEntry[];
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  isEnabled: true,
  filterLevel: 'all',
  maxLogs: 10000,

  addLog: (log) =>
    set((state) => {
      const newLogs = [...state.logs, log];
      if (newLogs.length > state.maxLogs) {
        newLogs.shift();
      }
      return { logs: newLogs };
    }),

  setLogs: (logs) => set({ logs }),

  clearLogs: () => set({ logs: [] }),

  setEnabled: (enabled) => set({ isEnabled: enabled }),

  setFilterLevel: (level) => set({ filterLevel: level }),

  getFilteredLogs: () => {
    const { logs, filterLevel } = get();
    if (filterLevel === 'all') return logs;
    return logs.filter((log) => log.level === filterLevel);
  },
}));