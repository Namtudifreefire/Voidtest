import { ipcMain } from 'electron';
import { SettingsManager } from './settings.js';
import { Logger } from './logger.js';
import { compileCode, cleanupCompilation, CompilationResult } from './compilation.js';

export function setupCompilationHandlers(settingsManager: SettingsManager, logger: Logger): void {
  ipcMain.handle('compile:check', async (_event, sourceCode: string): Promise<CompilationResult> => {
    return compileCode(sourceCode, settingsManager, logger);
  });

  // Cleanup handler
  ipcMain.handle('compile:cleanup', async (_event, executablePath: string): Promise<void> => {
    await cleanupCompilation(executablePath);
  });
}