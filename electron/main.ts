import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { setupIpcHandlers } from './ipc/index.js';
import { Logger } from './ipc/logger.js';
import { SettingsManager } from './ipc/settings';

let mainWindow: BrowserWindow | null = null;
const settingsManager = new SettingsManager();
const logger = new Logger(settingsManager);

function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL !== undefined;
}

function getRendererUrl(): string | undefined {
  return process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_RENDERER_URL;
}

// Create the main window
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1e2e',
      symbolColor: '#cdd6f4',
      height: 32,
    },
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler((details: { url: string }) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load the app
  const rendererUrl = getRendererUrl();
  if (isDev() && rendererUrl) {
    mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist_renderer/index.html'));
  }
}

// Initialize settings and IPC
async function initializeApp(): Promise<void> {
  await settingsManager.initialize();
  logger.info('App', 'Settings initialized');
  setupIpcHandlers(settingsManager, logger);
  logger.info('App', 'IPC handlers registered');
}

// App lifecycle
app.whenReady().then(async () => {
  await initializeApp();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Security: Prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  // @ts-expect-error - Electron types issue with new-window event
  contents.on('new-window', (_event: Electron.Event, navigationUrl: string) => {
    _event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle unhandled errors
process.on('uncaughtException', (error: Error) => {
  logger.error('App', `Uncaught exception: ${error.message}`, error.stack);
  // Don't exit immediately - let Electron handle cleanup
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('App', `Unhandled rejection: ${String(reason)}`);
  // Log and continue for non-critical rejections, exit for critical ones
  const isCritical = reason instanceof Error && (
    reason.message.includes('ENOENT') ||
    reason.message.includes('EACCES') ||
    reason.message.includes('compiler')
  );
  if (isCritical) {
    setTimeout(() => process.exit(1), 1000);
  }
});