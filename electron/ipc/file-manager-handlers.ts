import { ipcMain, dialog } from 'electron';
import { SettingsManager } from './settings.js';
import { Logger } from './logger.js';
import { writeTestFiles, createZip, openOutputFolder, readTestFile, WriteTestFilesConfig, WriteTestFilesResult, CreateZipConfig, CreateZipResult } from './file-manager.js';

export function setupFileHandlers(settingsManager: SettingsManager, logger: Logger): void {
  // Select output folder
  ipcMain.handle('file:select-folder', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Select Output Directory',
      buttonLabel: 'Select',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: await settingsManager.getOutputDir(),
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Open folder in file explorer
  ipcMain.handle('file:open-folder', async (_event, path: string): Promise<void> => {
    await openOutputFolder(path);
  });

  // Write test files
  ipcMain.handle('file:write-test-files', async (_event, config: WriteTestFilesConfig): Promise<WriteTestFilesResult> => {
    return writeTestFiles(config, logger);
  });

  // Create ZIP archive
  ipcMain.handle('file:create-zip', async (_event, config: CreateZipConfig): Promise<CreateZipResult> => {
    return createZip(config, logger);
  });

  // Read test file (with path traversal protection)
  ipcMain.handle('file:read-test-file', async (_event, filePath: string): Promise<string> => {
    const outputDir = await settingsManager.getOutputDir();
    return readTestFile(filePath, outputDir);
  });
}