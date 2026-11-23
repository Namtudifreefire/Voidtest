// Shared types between main and renderer processes

export interface AppSettings {
  outputDir: string;
  enableLog: boolean;
  namingFormat: 'default' | 'numeric' | 'custom';
  customPrefix: string;
  numberPadding: number;
  startNumber: number;
  theme: 'dark' | 'light' | 'system';
  zipEnabled: boolean;
  zipOnError: boolean;
  overwriteOutput: boolean;
  defaultTestCount: number;
  defaultTimeout: number;
  aiProvider: AiProviderConfig | null;
  compilerPath: string | null;
  firstRunComplete: boolean;
}

export interface AiProviderConfig {
  type: 'openai' | 'azure' | 'ollama' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface VariableInfo {
  name: string;
  type: 'int' | 'long' | 'float' | 'double' | 'string' | 'char' | 'bool' | 'array' | 'vector' | 'matrix' | 'unknown';
  isArray: boolean;
  arrayDimensions?: number[];
  isInput: boolean;
  isOutput: boolean;
  description: string;
  line?: number;
}

export interface ConstraintInfo {
  variable: string;
  min?: number | string;
  max?: number | string;
  description: string;
  line?: number;
}

export interface EdgeCaseInfo {
  type: 'empty' | 'boundary' | 'overflow' | 'special' | 'duplicate' | 'sorted' | 'reverse' | 'single' | 'negative' | 'zero' | 'max' | 'min';
  description: string;
  affectedVariables: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface InputStructure {
  format: 'standard' | 'custom';
  variables: VariableInfo[];
  description: string;
  rawStructure: string;
}

export interface OutputStructure {
  format: 'standard' | 'custom';
  variables: VariableInfo[];
  description: string;
  rawStructure: string;
}

export interface CodeAnalysisResult {
  success: boolean;
  inputStructure?: InputStructure;
  outputStructure?: OutputStructure;
  algorithm?: string;
  complexity?: string;
  variables: VariableInfo[];
  constraints: ConstraintInfo[];
  edgeCases: EdgeCaseInfo[];
  includes: string[];
  mainFunctionFound: boolean;
  error?: string;
}

export interface SubtaskSuggestion {
  id: number;
  name: string;
  description: string;
  limits: Record<string, { min: number; max: number }>;
  testCount: number;
  generationStrategy: string;
}

export interface GenerationStrategy {
  subtaskId: number;
  strategy: 'random' | 'boundary' | 'pattern' | 'constraint' | 'mixed';
  parameters: Record<string, unknown>;
}

export interface AiAnalysisResult {
  success: boolean;
  suggestedSubtasks: SubtaskSuggestion[];
  generationStrategies: GenerationStrategy[];
  additionalEdgeCases: EdgeCaseInfo[];
  error?: string;
}

export interface SubtaskConfig {
  id: number;
  name: string;
  limits: Record<string, { min: number; max: number }>;
  testCount: number;
  generationStrategy: string;
}

export interface NamingConfig {
  format: 'default' | 'numeric' | 'custom';
  prefix: string;
  padding: number;
  startNumber: number;
}

export interface TestCase {
  id: number;
  subtaskId: number;
  input: string;
  output?: string;
  status: 'pending' | 'success' | 'failed' | 'timeout' | 'error';
  error?: string;
  executionTime?: number;
}

export interface TestGenerationConfig {
  code: string;
  analysis: CodeAnalysisResult;
  aiAnalysis?: AiAnalysisResult;
  subtasks: SubtaskConfig[];
  mode: 'input-only' | 'input-output';
  totalTestCount: number;
  namingConfig: NamingConfig;
}

export interface TestGenerationResult {
  success: boolean;
  outputDir: string;
  testCases: TestCase[];
  errors: string[];
}

export interface TestPreviewData {
  testCases: TestCase[];
  subtasks: SubtaskPreview[];
  totalCount: number;
  successCount: number;
  failedCount: number;
}

export interface SubtaskPreview {
  id: number;
  name: string;
  testCount: number;
  successCount: number;
  failedCount: number;
}

export interface CompilationResult {
  success: boolean;
  executablePath?: string;
  errors?: string[];
  warnings?: string[];
  compilerUsed: string;
  compileTime: number;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  executionTime: number;
  memoryUsed?: number;
  timedOut: boolean;
}

export interface BatchExecutionConfig {
  executablePath: string;
  testCases: TestCase[];
  timeout: number;
  onProgress: (completed: number, total: number, currentResult: ExecutionResult, testCaseId: number) => void;
}

export interface BatchExecutionResult {
  success: boolean;
  results: ExecutionResult[];
  completedCount: number;
  failedCount: number;
  timeoutCount: number;
}

export interface WriteTestFilesConfig {
  outputDir: string;
  testCases: TestCase[];
  namingConfig: NamingConfig;
  overwrite: boolean;
  mode: 'input-only' | 'input-output';
}

export interface WriteTestFilesResult {
  success: boolean;
  writtenFiles: string[];
  errors: string[];
}

export interface CreateZipConfig {
  sourceDir: string;
  outputPath: string;
  includeErrorReport: boolean;
  errorReport?: string;
}

export interface CreateZipResult {
  success: boolean;
  zipPath?: string;
  error?: string;
}

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

export type GenerationMode = 'input-only' | 'input-output';
export type Theme = 'dark' | 'light' | 'system';