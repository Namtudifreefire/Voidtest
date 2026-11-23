import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

// Expose IPC API to renderer
contextBridge.exposeInMainWorld('voidtest', {
  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },

  // Code Analysis
  code: {
    analyze: (code: string) => ipcRenderer.invoke('code:analyze', code),
    analyzeAi: (code: string, analysis: unknown) => ipcRenderer.invoke('code:analyze-ai', code, analysis),
  },

  // Test Generation
  test: {
    generate: (config: unknown) => ipcRenderer.invoke('test:generate', config),
    preview: (outputDir: string) => ipcRenderer.invoke('test:preview', outputDir),
  },

  // Compilation & Execution
  compile: {
    check: (code: string) => ipcRenderer.invoke('compile:check', code),
  },
  execute: {
    run: (executablePath: string, input: string, timeout: number) => ipcRenderer.invoke('execute:run', executablePath, input, timeout),
    batch: (config: unknown) => ipcRenderer.invoke('execute:batch', config),
  },

  // File Operations
  file: {
    selectFolder: () => ipcRenderer.invoke('file:select-folder'),
    openFolder: (path: string) => ipcRenderer.invoke('file:open-folder', path),
    writeTestFiles: (config: unknown) => ipcRenderer.invoke('file:write-test-files', config),
    createZip: (config: unknown) => ipcRenderer.invoke('file:create-zip', config),
  },

  // Logging
  log: {
    getAll: () => ipcRenderer.invoke('log:get-all'),
    clear: () => ipcRenderer.invoke('log:clear'),
    export: (path: string) => ipcRenderer.invoke('log:export', path),
    onEntry: (callback: (entry: unknown) => void) => {
      const handler = (_event: IpcRendererEvent, entry: unknown) => callback(entry);
      ipcRenderer.on('log:entry', handler);
      return () => ipcRenderer.off('log:entry', handler);
    },
  },

  // App Info
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  },
});