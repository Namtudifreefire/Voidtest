import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { setupIpcHandlers } from './ipc/index.js';
import { Logger } from './ipc/logger.js';
import { SettingsManager } from './ipc/settings';

let mainWindow: BrowserWindow | null = null;
const settingsManager = new SettingsManager();
const logger = new Logger(settingsManager);
function isDev(): boolean { return process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL !== undefined; }
function getRendererUrl(): string | undefined { return process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_RENDERER_URL; }
function isTrustedRendererUrl(candidate: string): boolean {
  const devUrl = isDev() ? getRendererUrl() : undefined;
  if (devUrl) {
    try { return new URL(candidate).origin === new URL(devUrl).origin; } catch { return false; }
  }
  return candidate === pathToFileURL(join(__dirname, '../dist_renderer/index.html')).href;
}
function openWebLink(url: string): void {
  try { if (['https:', 'http:'].includes(new URL(url).protocol)) void shell.openExternal(url); } catch { /* Invalid or unsupported URL */ }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1200, minHeight: 700, show: false, autoHideMenuBar: true,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#1e1e2e', symbolColor: '#cdd6f4', height: 32 },
    webPreferences: {
      preload: join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false,
      sandbox: true, webSecurity: true,
    },
  });
  const window = mainWindow;
  window.webContents.on('will-navigate', (event, url) => {
    if (isTrustedRendererUrl(url)) return;
    event.preventDefault();
    openWebLink(url);
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    openWebLink(url);
    return { action: 'deny' };
  });
  window.on('ready-to-show', () => { window.show(); window.focus(); });
  window.on('closed', () => { if (mainWindow === window) mainWindow = null; });
  const rendererUrl = getRendererUrl();
  if (isDev() && rendererUrl) {
    void window.loadURL(rendererUrl);
    window.webContents.openDevTools();
  } else {
    void window.loadFile(join(__dirname, '../dist_renderer/index.html'));
  }
}

async function initializeApp(): Promise<void> {
  await settingsManager.initialize(); logger.info('App', 'Settings initialized');
  setupIpcHandlers(settingsManager, logger); logger.info('App', 'IPC handlers registered');
}
app.whenReady().then(async () => {
  await initializeApp(); createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
process.on('uncaughtException', (error: Error) => {
  logger.error('App', `Uncaught exception: ${error.message}`, error.stack);
  setTimeout(() => process.exit(1), 1000);
});
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('App', `Unhandled rejection: ${String(reason)}`);
  const isCritical = reason instanceof Error && (reason.message.includes('ENOENT') || reason.message.includes('EACCES') || reason.message.includes('compiler'));
  if (isCritical) setTimeout(() => process.exit(1), 1000);
});
