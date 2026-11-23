import type { useIPC } from '../hooks/useIPC';
import type { SubtaskConfig, TestCase, TestGenerationConfig, TestPreviewData } from '../types';

type Bridge = Pick<ReturnType<typeof useIPC>, 'test' | 'compile' | 'execute' | 'file'>;
interface Options { outputDir: string; timeout: number; overwrite: boolean; zip: boolean; zipOnError: boolean }

export function summarize(testCases: TestCase[], subtasks: SubtaskConfig[]): TestPreviewData {
  const groups = new Map(subtasks.map(st => [st.id, { id: st.id, name: st.name, testCount: 0, successCount: 0, failedCount: 0 }]));
  let successCount = 0, failedCount = 0;
  for (const tc of testCases) {
    const group = groups.get(tc.subtaskId);
    if (!group) throw new Error(`Unknown subtask: ${tc.subtaskId}`);
    group.testCount++;
    if (tc.status === 'success') { group.successCount++; successCount++; }
    else if (tc.status !== 'pending') { group.failedCount++; failedCount++; }
  }
  return { testCases, subtasks: [...groups.values()], totalCount: testCases.length, successCount, failedCount };
}

export async function generateAndExport(api: Bridge, config: TestGenerationConfig, options: Options, stage: (message: string) => void) {
  if (!options.outputDir.trim()) throw new Error('Select an output directory first.');
  const outputDir = `${options.outputDir.replace(/[/\\]+$/, '')}/Output-test`;
  stage('Generating test inputs...');
  const generated = await api.test.generate(config);
  if (!generated.success) throw new Error(generated.errors.join('\n') || 'Test generation failed');
  let cases = generated.testCases;
  if (!cases.length) throw new Error('No tests generated');
  if (config.mode === 'input-output') {
    stage('Compiling source code...');
    const compiled = await api.compile.check(config.code);
    if (!compiled.success || !compiled.executablePath) throw new Error(compiled.errors?.join('\n') || 'Compilation failed');
    stage('Executing tests...');
    const batch = await api.execute.batch({ executablePath: compiled.executablePath, testCases: cases, timeout: options.timeout });
    if (batch.results.length !== cases.length) throw new Error('Incomplete batch execution');
    // executeBatch returns one result per input, in submission order.
    cases = cases.map((tc, index): TestCase => {
      const result = batch.results[index];
      return { ...tc, executionTime: result.executionTime,
        status: result.success ? 'success' : result.timedOut ? 'timeout' : 'failed',
        output: result.success ? result.output : undefined,
        error: result.success ? undefined : result.error || 'Execution failed' };
    });
  }
  const preview = summarize(cases, config.subtasks);
  const errors = cases.filter(tc => tc.error).map(tc => `Test ${tc.id}: ${tc.error}`);
  stage('Writing test files...');
  const written = await api.file.writeTestFiles({ outputDir, testCases: cases, namingConfig: config.namingConfig, overwrite: options.overwrite, mode: config.mode });
  if (!written.success) throw new Error(written.errors.join('\n') || 'Could not write tests');
  if (options.zip && (!errors.length || options.zipOnError)) {
    stage('Creating ZIP archive...');
    const zipped = await api.file.createZip({ sourceDir: outputDir, outputPath: `${outputDir}.zip`, includeErrorReport: errors.length > 0, errorReport: errors.join('\n') });
    if (!zipped.success) throw new Error(zipped.error || 'ZIP creation failed');
  }
  return { outputDir, preview, errors };
}
