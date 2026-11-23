import { ipcMain } from 'electron';
import { SettingsManager, AppSettings, AiProviderConfig } from './settings.js';

export function setupSettingsHandlers(settingsManager: SettingsManager): void {
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    return settingsManager.getAll();
  });

  ipcMain.handle('settings:set', async (_event, key: keyof AppSettings, value: unknown): Promise<void> => {
    if (key === 'aiProvider') {
      settingsManager.setAiProvider(value as AiProviderConfig | null);
    } else {
      settingsManager.set(key, value as AppSettings[keyof AppSettings]);
    }
  });

  ipcMain.handle('settings:reset', async (): Promise<void> => {
    settingsManager.reset();
  });

  // Validate and set output directory
  ipcMain.handle('settings:set-output-dir', async (_event, dir: string) => {
    return settingsManager.setOutputDir(dir);
  });

  // Check if first run
  ipcMain.handle('settings:is-first-run', async (): Promise<boolean> => {
    return settingsManager.isFirstRun();
  });

  // Mark first run complete
  ipcMain.handle('settings:set-first-run-complete', async (): Promise<void> => {
    settingsManager.setFirstRunComplete();
  });

  // Get AI provider with decrypted API key
  ipcMain.handle('settings:get-ai-provider', async (): Promise<AiProviderConfig | null> => {
    return settingsManager.getAiProvider();
  });

  // Set AI provider with encrypted API key
  ipcMain.handle('settings:set-ai-provider', async (_event, provider: AiProviderConfig | null): Promise<void> => {
    settingsManager.setAiProvider(provider);
  });
}