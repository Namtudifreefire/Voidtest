import { ipcMain } from 'electron';
import type { SettingsManager } from './settings.js';
import type { Logger } from './logger.js';
import { generateTestCases, type TestGenerationConfig } from './test-generation.js';
import type { TestGenerationResult } from './code-analysis.js';

export function setupTestGenerationHandlers(_settingsManager: SettingsManager, logger: Logger): void {
  function validateTestGenConfig(config: unknown): config is TestGenerationConfig {
    if (!config || typeof config !== 'object') return false;
    const value = config as Record<string, unknown>;
    return typeof value.code === 'string' && Array.isArray(value.subtasks);
  }

  ipcMain.handle('test:generate', async (_event, config: unknown): Promise<TestGenerationResult> => {
    if (!validateTestGenConfig(config)) {
      return { success: false, outputDir: '', testCases: [], errors: ['Invalid test generation config'] };
    }
    logger.info('TestGeneration', 'Received test generation request');
    try {
      return await generateTestCases(config, logger);
    } catch (error) {
      logger.error('TestGeneration', `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, outputDir: '', testCases: [], errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  });

  ipcMain.handle('test:preview', async (_event, outputDir: string) => {
    logger.info('TestGeneration', `Preview requested for ${outputDir}`);
    return { success: false, error: 'Preview not implemented yet' };
  });
}
