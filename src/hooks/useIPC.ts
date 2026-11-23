import type {
  AppSettings, CodeAnalysisResult, AiAnalysisResult, TestGenerationConfig,
  TestGenerationResult, CompilationResult, BatchExecutionConfig, BatchExecutionResult,
  WriteTestFilesConfig, WriteTestFilesResult, CreateZipConfig, CreateZipResult, LogEntry,
  ExecutionResult,
} from '../types';

interface VoidtestAPI {
  settings: {
    get(): Promise<AppSettings>;
    set(key: keyof AppSettings, value: unknown): Promise<void>;
    reset(): Promise<void>;
  };
  code: {
    analyze(source: string): Promise<CodeAnalysisResult>;
    analyzeAi(source: string, analysis: CodeAnalysisResult): Promise<AiAnalysisResult>;
  };
  test: {
    generate(config: TestGenerationConfig): Promise<TestGenerationResult>;
    preview(outputDir: string): Promise<unknown>;
  };
  compile: { check(source: string): Promise<CompilationResult> };
  execute: {
    run(executablePath: string, input: string, timeout: number): Promise<ExecutionResult>;
    batch(config: Omit<BatchExecutionConfig, 'onProgress'>): Promise<BatchExecutionResult>;
  };
  file: {
    selectFolder(): Promise<string | null>;
    openFolder(path: string): Promise<void>;
    writeTestFiles(config: WriteTestFilesConfig): Promise<WriteTestFilesResult>;
    createZip(config: CreateZipConfig): Promise<CreateZipResult>;
  };
  log: {
    getAll(): Promise<LogEntry[]>;
    clear(): Promise<void>;
    export(path: string): Promise<void>;
    onEntry(callback: (entry: LogEntry) => void): () => void;
  };
  app: { getVersion(): Promise<string>; getPlatform(): Promise<NodeJS.Platform> };
}

export function useIPC(): VoidtestAPI {
  // The preload bridge exists before React starts. Its namespaces can be used
  // as stable effect dependencies; recreating them retriggers settings reads.
  const api = (window as Window & { voidtest?: VoidtestAPI }).voidtest;
  if (!api) throw new Error('Voidtest API not available. Start the Electron application.');
  return api;
}
