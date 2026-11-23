import { ipcMain } from 'electron';
import { Logger, LogEntry } from './logger.js';

export function setupLogHandlers(logger: Logger): void {
  ipcMain.handle('log:get-all', async (): Promise<LogEntry[]> => {
    return logger.getAll();
  });

  ipcMain.handle('log:clear', async (): Promise<void> => {
    logger.clear();
  });

  ipcMain.handle('log:export', async (_event, path: string): Promise<void> => {
    await logger.export(path);
  });
}