import { app } from 'electron';
import { join } from 'path';
import { SettingsManager } from './settings.js';
import { promises as fs } from 'fs';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

type LogCallback = (entry: LogEntry) => void;

export class Logger {
  private settingsManager: SettingsManager;
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private callbacks: Map<LogCallback, number> = new Map(); // Map to track registration time
  private maxCallbacks = 100; // Prevent memory leak from orphaned subscriptions
  private logFilePath: string;
  private initialized = false;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
    this.logFilePath = join(app.getPath('userData'), 'voidtest-execution.log');
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.loadPersistedLogs();
  }

  private async loadPersistedLogs(): Promise<void> {
    try {
      const data = await fs.readFile(this.logFilePath, 'utf-8');
      const lines = data.trim().split('\n').filter(Boolean);
      const parsedLogs: LogEntry[] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          // Validate log entry structure
          if (parsed && typeof parsed.timestamp === 'string' && typeof parsed.level === 'string' && typeof parsed.category === 'string' && typeof parsed.message === 'string') {
            parsedLogs.push(parsed);
          }
        } catch {
          // Skip malformed lines
        }
      }
      this.logs = parsedLogs.slice(-this.maxLogs);
    } catch {
      // File doesn't exist or is corrupted, start fresh
      this.logs = [];
    }
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    try {
      await fs.appendFile(this.logFilePath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to persist log:', error);
    }
  }

  private emit(entry: LogEntry): void {
    // Add to memory buffer
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notify callbacks (for real-time UI updates)
    const now = Date.now();
    for (const [callback, _registered] of this.callbacks) {
      try {
        callback(entry);
      } catch (error) {
        console.error('Log callback error:', error);
        // Remove callbacks that throw errors
        this.callbacks.delete(callback);
      }
    }

    // Cleanup stale callbacks (older than 1 hour without activity) - prevent memory leak
    if (this.callbacks.size > this.maxCallbacks) {
      const staleThreshold = now - 3600000; // 1 hour
      for (const [callback, registered] of this.callbacks) {
        if (registered < staleThreshold) {
          this.callbacks.delete(callback);
        }
      }
    }

    // Persist to file
    this.persistLog(entry);
  }

  log(level: LogLevel, category: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };
    this.emit(entry);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  success(category: string, message: string, data?: unknown): void {
    this.log('success', category, message, data);
  }

  warning(category: string, message: string, data?: unknown): void {
    this.log('warning', category, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  // Subscribe to real-time log updates
  subscribe(callback: LogCallback): () => void {
    this.callbacks.set(callback, Date.now());
    return () => this.callbacks.delete(callback);
  }

  // Get all logs (for initial load)
  getAll(): LogEntry[] {
    return [...this.logs];
  }

  // Clear logs
  clear(): void {
    this.logs = [];
    // Clear persisted file
    fs.writeFile(this.logFilePath, '').catch(console.error);
    this.info('Logger', 'Logs cleared');
  }

  // Export logs to file
  async export(path: string): Promise<void> {
    const content = this.logs.map(entry =>
      `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.category}] ${entry.message}`
      + (entry.data ? ` ${JSON.stringify(entry.data)}` : '')
    ).join('\n');
    await fs.writeFile(path, content);
    this.info('Logger', `Logs exported to ${path}`);
  }

  // Check if logging is enabled in settings
  isEnabled(): boolean {
    return this.settingsManager.get('enableLog');
  }

  shutdown(): void {
    this.callbacks.clear();
  }
}