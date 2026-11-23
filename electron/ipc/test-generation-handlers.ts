import { ipcMain } from 'electron';
import { SettingsManager } from './settings.js';
import { Logger } from './logger.js';
import { generateTestCases, TestGenerationResult, TestGenerationConfig as TestGenConfigType } from './test-generation.js';

export function setupTestGenerationHandlers(_settingsManager: SettingsManager, logger: Logger): void {
  // Validate config structure before passing to generator
  function validateTestGenConfig(config: unknown): config is TestGenConfigType {
    return config !== null && typeof config === 'object' &&
      typeof (config as Record<string, unknown>).code === 'string' &&
      Array.isArray((config as Record<string, unknown>).subtasks);
  }

  ipcMain.handle('test:generate', async (_event, config: unknown): Promise<TestGenerationResult> => {
    if (!validateTestGenConfig(config)) {
      return {
        success: false,
        outputDir: '',
        testCases: [],
        errors: ['Invalid test generation config'],
      };
    }
    logger.info('TestGeneration', 'Received test generation request');
    try {
      const result = await generateTestCases(config, logger);
      return result;
    } catch (error) {
      logger.error('TestGeneration', `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        outputDir: '',
        testCases: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  });

  ipcMain.handle('test:preview', async (_event, outputDir: string): Promise<any> => {
    logger.info('TestGeneration', `Preview requested for ${outputDir}`);
    // Preview functionality would read existing test files
    return { success: false, error: 'Preview not implemented yet' };
  });
}