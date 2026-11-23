import type { Logger } from './logger.js';
import { spawn } from 'child_process';
import type { TestCase } from './code-analysis.js';

export interface ExecutionResult { success: boolean; output?: string; error?: string; exitCode?: number; executionTime: number; memoryUsed?: number; timedOut: boolean }
export interface BatchExecutionConfig { executablePath: string; testCases: TestCase[]; timeout: number; onProgress?: (completed: number, total: number, result: ExecutionResult, testCaseId: number) => void }
export interface BatchExecutionResult { success: boolean; results: ExecutionResult[]; completedCount: number; failedCount: number; timeoutCount: number }
const MAX_TIMEOUT_MS = 300_000;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

function runExecutable(executablePath: string, input: string, timeout: number): Promise<ExecutionResult> {
  return new Promise(resolve => {
    const start = Date.now();
    const finish = (result: ExecutionResult) => { if (settled) return; settled = true; clearTimeout(timer); resolve(result); };
    let settled = false, timedOut = false, outputLimit = false, outputBytes = 0;
    let stdout = '', stderr = '';
    const child = spawn(executablePath, [], { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
    const collect = (target: 'stdout' | 'stderr', chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        if (!outputLimit) { outputLimit = true; child.kill('SIGKILL'); }
        return;
      }
      if (target === 'stdout') stdout += chunk.toString(); else stderr += chunk.toString();
    };
    child.stdout?.on('data', (chunk: Buffer) => collect('stdout', chunk));
    child.stderr?.on('data', (chunk: Buffer) => collect('stderr', chunk));
    child.stdin?.on('error', () => { /* The program may exit without reading all input. */ });
    child.once('error', error => finish({ success: false, error: `Execution error: ${error.message}`, executionTime: Date.now() - start, timedOut: false }));
    child.once('close', code => {
      const elapsed = Date.now() - start;
      if (timedOut) return finish({ success: false, error: `Time limit exceeded (${timeout}ms)`, exitCode: code ?? -1, executionTime: elapsed, timedOut: true });
      if (outputLimit) return finish({ success: false, output: stdout || undefined, error: `Program output exceeded the ${MAX_OUTPUT_BYTES / (1024 * 1024)} MiB limit`, exitCode: code ?? -1, executionTime: elapsed, timedOut: false });
      if (code !== 0) return finish({ success: false, output: stdout || undefined, error: stderr.trim() || `Process exited with ${code === null ? 'a signal' : `code ${code}`}`, exitCode: code ?? -1, executionTime: elapsed, timedOut: false });
      finish({ success: true, output: stdout, executionTime: elapsed, timedOut: false });
    });
    try { child.stdin?.end(input); }
    catch (error) { child.kill('SIGKILL'); finish({ success: false, error: `Could not send input: ${error instanceof Error ? error.message : String(error)}`, executionTime: Date.now() - start, timedOut: false }); }
  });
}
function invalidTimeout(timeout: number): string | null {
  return Number.isSafeInteger(timeout) && timeout >= 100 && timeout <= MAX_TIMEOUT_MS ? null : `Timeout must be an integer between 100 and ${MAX_TIMEOUT_MS}ms`;
}
export async function executeTest(executablePath: string, input: string, timeout: number, logger: Logger): Promise<ExecutionResult> {
  const invalid = invalidTimeout(timeout);
  if (invalid) return { success: false, error: invalid, executionTime: 0, timedOut: false };
  logger.info('Execution', `Running test with ${input.length} bytes input, timeout ${timeout}ms`);
  const result = await runExecutable(executablePath, input, timeout);
  if (result.success) logger.success('Execution', `Test completed in ${result.executionTime}ms`);
  else logger.error('Execution', `Test failed: ${result.error} (${result.executionTime}ms)`);
  return result;
}
export async function executeBatch(config: BatchExecutionConfig, logger: Logger): Promise<BatchExecutionResult> {
  const { executablePath, testCases, timeout, onProgress } = config;
  const results: ExecutionResult[] = [];
  let completedCount = 0, failedCount = 0, timeoutCount = 0;
  const invalid = invalidTimeout(timeout);
  if (invalid) return { success: false, results: testCases.map(() => ({ success: false, error: invalid, executionTime: 0, timedOut: false })), completedCount: 0, failedCount: testCases.length, timeoutCount: 0 };
  logger.info('Execution', `Starting batch execution of ${testCases.length} tests`);
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await runExecutable(executablePath, testCase.input, timeout);
    if (result.success) { testCase.output = result.output; testCase.status = 'success'; completedCount++; }
    else if (result.timedOut) { testCase.status = 'timeout'; testCase.error = result.error; timeoutCount++; failedCount++; }
    else { testCase.status = 'failed'; testCase.error = result.error; failedCount++; }
    testCase.executionTime = result.executionTime;
    results.push(result);
    onProgress?.(i + 1, testCases.length, result, testCase.id);
  }
  logger.success('Execution', `Batch completed: ${completedCount} success, ${failedCount} failed, ${timeoutCount} timeout`);
  return { success: failedCount === 0, results, completedCount, failedCount, timeoutCount };
}
