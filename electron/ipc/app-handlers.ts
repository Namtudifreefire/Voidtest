import { ipcMain, app } from 'electron';

export function setupAppHandlers(): void {
  ipcMain.handle('app:get-version', async (): Promise<string> => {
    return app.getVersion();
  });

  ipcMain.handle('app:get-platform', async (): Promise<NodeJS.Platform> => {
    return process.platform;
  });
}