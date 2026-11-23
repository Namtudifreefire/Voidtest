import { ipcMain } from 'electron';
import { SettingsManager } from './settings.js';
import { Logger } from './logger.js';
import { analyzeCode, CodeAnalysisResult } from './code-analysis.js';
import { analyzeWithAi, generateFallbackSubtasks, AiAnalysisResult } from './ai-analysis.js';

export function setupCodeAnalysisHandlers(settingsManager: SettingsManager, logger: Logger): void {
  // Code analysis
  ipcMain.handle('code:analyze', async (_event, sourceCode: string): Promise<CodeAnalysisResult> => {
    return analyzeCode(sourceCode, logger);
  });

  // AI-enhanced analysis
  ipcMain.handle('code:analyze-ai', async (_event, sourceCode: string, analysis: CodeAnalysisResult): Promise<AiAnalysisResult> => {
    const provider = settingsManager.get('aiProvider');

    if (!provider) {
      logger.info('AIAnalysis', 'No AI provider configured, using fallback');
      const totalTestCount = settingsManager.get('defaultTestCount') as number;
      return generateFallbackSubtasks(analysis, totalTestCount);
    }

    const totalTestCount = settingsManager.get('defaultTestCount') as number;
    return analyzeWithAi(sourceCode, analysis, provider, logger, totalTestCount);
  });
}