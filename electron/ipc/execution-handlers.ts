import { ipcMain } from 'electron';
import { SettingsManager } from './settings.js';
import { Logger } from './logger.js';
import { executeTest, executeBatch, BatchExecutionResult, BatchExecutionConfig, ExecutionResult } from './execution.js';

export function setupExecutionHandlers(_settingsManager: SettingsManager, logger: Logger): void {
  ipcMain.handle('execute:run', async (_event, executablePath: string, input: string, timeout: number) => {
    return executeTest(executablePath, input, timeout, logger);
  });

  ipcMain.handle('execute:batch', async (_event, config: unknown): Promise<BatchExecutionResult> => {
    // Validate batch config
    if (!config || typeof config !== 'object' || !Array.isArray((config as BatchExecutionConfig).testCases)) {
      return {
        success: false,
        results: [],
        completedCount: 0,
        failedCount: 0,
        timeoutCount: 0,
      };
    }
    const validConfig = config as BatchExecutionConfig;
    // Wrap onProgress to send via IPC
    const originalOnProgress = validConfig.onProgress;
    validConfig.onProgress = (completed: number, total: number, currentResult: ExecutionResult, testCaseId: number) => {
      // Send progress event to renderer with test case ID
      originalOnProgress?.(completed, total, currentResult, testCaseId);
    };
    return executeBatch(validConfig, logger);
  });
}