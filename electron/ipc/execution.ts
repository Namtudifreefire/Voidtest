import { Logger } from './logger.js';
import { spawn } from 'child_process';

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
  testCases: any[];
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

function runExecutable(
  executablePath: string,
  input: string,
  timeout: number
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const child = spawn(executablePath, [], {
      windowsHide: true,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let killed = false;

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      killed = true;
      child.kill('SIGKILL');
    }, timeout);

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      const executionTime = Date.now() - startTime;

      if (timedOut) {
        resolve({
          success: false,
          error: `Time limit exceeded (${timeout}ms)`,
          exitCode: code ?? -1,
          executionTime,
          timedOut: true,
        });
        return;
      }

      if (code !== 0 && code !== null) {
        resolve({
          success: false,
          output: stdout || undefined,
          error: stderr || `Process exited with code ${code}`,
          exitCode: code,
          executionTime,
          timedOut: false,
        });
        return;
      }

      resolve({
        success: true,
        output: stdout,
        executionTime,
        timedOut: false,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutHandle);
      if (!killed) {
        resolve({
          success: false,
          error: `Execution error: ${error.message}`,
          executionTime: Date.now() - startTime,
          timedOut: false,
        });
      }
    });

    // Write input to stdin
    if (child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

export async function executeTest(
  executablePath: string,
  input: string,
  timeout: number,
  logger: Logger
): Promise<ExecutionResult> {
  logger.info('Execution', `Running test with ${input.length} bytes input, timeout ${timeout}ms`);

  const result = await runExecutable(executablePath, input, timeout);

  if (result.success) {
    logger.success('Execution', `Test completed in ${result.executionTime}ms`);
  } else {
    logger.error('Execution', `Test failed: ${result.error} (${result.executionTime}ms)`);
  }

  return result;
}

export async function executeBatch(
  config: BatchExecutionConfig,
  logger: Logger
): Promise<BatchExecutionResult> {
  const { executablePath, testCases, timeout, onProgress } = config;
  const results: ExecutionResult[] = [];
  let completedCount = 0;
  let failedCount = 0;
  let timeoutCount = 0;

  logger.info('Execution', `Starting batch execution of ${testCases.length} tests`);

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await runExecutable(executablePath, testCase.input, timeout);

    // Update test case with result
    if (result.success) {
      testCase.output = result.output;
      testCase.status = 'success';
      completedCount++;
    } else if (result.timedOut) {
      testCase.status = 'timeout';
      testCase.error = result.error;
      timeoutCount++;
      failedCount++;
    } else {
      testCase.status = 'failed';
      testCase.error = result.error;
      failedCount++;
    }
    testCase.executionTime = result.executionTime;

    results.push(result);

    // Report progress - pass test case ID for proper mapping
    onProgress(i + 1, testCases.length, result, testCase.id);
  }

  logger.success('Execution', `Batch completed: ${completedCount} success, ${failedCount} failed, ${timeoutCount} timeout`);

  return {
    success: failedCount === 0,
    results,
    completedCount,
    failedCount,
    timeoutCount,
  };
}