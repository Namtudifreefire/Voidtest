import { useCallback, useEffect, useRef } from 'react';
import {
  AppSettings,
  CodeAnalysisResult,
  AiAnalysisResult,
  TestGenerationConfig,
  TestGenerationResult,
  CompilationResult,
  BatchExecutionConfig,
  BatchExecutionResult,
  WriteTestFilesConfig,
  WriteTestFilesResult,
  CreateZipConfig,
  CreateZipResult,
  LogEntry,
} from '../types';

// Type for the exposed API
interface VoidtestAPI {
  settings: {
    get: () => Promise<AppSettings>;
    set: (key: keyof AppSettings, value: unknown) => Promise<void>;
    reset: () => Promise<void>;
  };
  code: {
    analyze: (code: string) => Promise<CodeAnalysisResult>;
    analyzeAi: (code: string, analysis: CodeAnalysisResult) => Promise<AiAnalysisResult>;
  };
  test: {
    generate: (config: TestGenerationConfig) => Promise<TestGenerationResult>;
    preview: (outputDir: string) => Promise<any>;
  };
  compile: {
    check: (code: string) => Promise<CompilationResult>;
  };
  execute: {
    run: (executablePath: string, input: string, timeout: number) => Promise<any>;
    batch: (config: BatchExecutionConfig) => Promise<BatchExecutionResult>;
  };
  file: {
    selectFolder: () => Promise<string | null>;
    openFolder: (path: string) => Promise<void>;
    writeTestFiles: (config: WriteTestFilesConfig) => Promise<WriteTestFilesResult>;
    createZip: (config: CreateZipConfig) => Promise<CreateZipResult>;
  };
  log: {
    getAll: () => Promise<LogEntry[]>;
    clear: () => Promise<void>;
    export: (path: string) => Promise<void>;
    onEntry: (callback: (entry: LogEntry) => void) => () => void;
  };
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<NodeJS.Platform>;
  };
}

// Get the API from window
function getAPI(): VoidtestAPI {
  if (typeof window !== 'undefined' && 'voidtest' in window) {
    return (window as any).voidtest;
  }
  throw new Error('Voidtest API not available. Make sure preload script is loaded.');
}

export function useIPC() {
  const apiRef = useRef<VoidtestAPI | null>(null);

  useEffect(() => {
    try {
      apiRef.current = getAPI();
    } catch (error) {
      console.error('Failed to get Voidtest API:', error);
    }
  }, []);

  const getApi = useCallback(() => {
    if (!apiRef.current) {
      try {
        apiRef.current = getAPI();
      } catch (error) {
        throw new Error('Voidtest API not initialized');
      }
    }
    return apiRef.current;
  }, []);

  // Settings
  const settings = {
    get: useCallback(async () => getApi().settings.get(), []),
    set: useCallback(async (key: keyof AppSettings, value: unknown) => getApi().settings.set(key, value), []),
    reset: useCallback(async () => getApi().settings.reset(), []),
  };

  // Code Analysis
  const code = {
    analyze: useCallback(async (sourceCode: string) => getApi().code.analyze(sourceCode), []),
    analyzeAi: useCallback(async (sourceCode: string, analysis: CodeAnalysisResult) => getApi().code.analyzeAi(sourceCode, analysis), []),
  };

  // Test Generation
  const test = {
    generate: useCallback(async (config: TestGenerationConfig) => getApi().test.generate(config), []),
    preview: useCallback(async (outputDir: string) => getApi().test.preview(outputDir), []),
  };

  // Compilation
  const compile = {
    check: useCallback(async (sourceCode: string) => getApi().compile.check(sourceCode), []),
  };

  // Execution
  const execute = {
    run: useCallback(async (executablePath: string, input: string, timeout: number) => getApi().execute.run(executablePath, input, timeout), []),
    batch: useCallback(async (config: BatchExecutionConfig) => getApi().execute.batch(config), []),
  };

  // File Operations
  const file = {
    selectFolder: useCallback(async () => getApi().file.selectFolder(), []),
    openFolder: useCallback(async (path: string) => getApi().file.openFolder(path), []),
    writeTestFiles: useCallback(async (config: WriteTestFilesConfig) => getApi().file.writeTestFiles(config), []),
    createZip: useCallback(async (config: CreateZipConfig) => getApi().file.createZip(config), []),
  };

  // Logging
  const log = {
    getAll: useCallback(async () => getApi().log.getAll(), []),
    clear: useCallback(async () => getApi().log.clear(), []),
    export: useCallback(async (path: string) => getApi().log.export(path), []),
    onEntry: useCallback((callback: (entry: LogEntry) => void) => getApi().log.onEntry(callback), []),
  };

  // App Info
  const app = {
    getVersion: useCallback(async () => getApi().app.getVersion(), []),
    getPlatform: useCallback(async () => getApi().app.getPlatform(), []),
  };

  return {
    settings,
    code,
    test,
    compile,
    execute,
    file,
    log,
    app,
  };
}