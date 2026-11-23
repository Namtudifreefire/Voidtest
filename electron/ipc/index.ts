import { SettingsManager } from './settings.js';
import { Logger } from './logger.js';
import { setupCodeAnalysisHandlers } from './code-analysis-handlers.js';
import { setupTestGenerationHandlers } from './test-generation-handlers.js';
import { setupCompilationHandlers } from './compilation-handlers.js';
import { setupExecutionHandlers } from './execution-handlers.js';
import { setupFileHandlers } from './file-manager-handlers.js';
import { setupSettingsHandlers } from './settings-handlers.js';
import { setupLogHandlers } from './log-handlers.js';
import { setupAppHandlers } from './app-handlers.js';

export function setupIpcHandlers(settingsManager: SettingsManager, logger: Logger): void {
  setupSettingsHandlers(settingsManager);
  setupCodeAnalysisHandlers(settingsManager, logger);
  setupTestGenerationHandlers(settingsManager, logger);
  setupCompilationHandlers(settingsManager, logger);
  setupExecutionHandlers(settingsManager, logger);
  setupFileHandlers(settingsManager, logger);
  setupLogHandlers(logger);
  setupAppHandlers();

  // Log handler registration
  logger.info('IPC', 'All IPC handlers registered successfully');
}