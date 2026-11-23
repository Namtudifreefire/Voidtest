import { Logger } from './logger.js';
import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
import { join, resolve, relative, sep } from 'path';
import { createWriteStream } from 'fs';
import archiver from 'archiver';
import { TestCase, NamingConfig } from './code-analysis.js';
import { getFileName, getSubtaskDir } from './naming.js';

// Validate that a path is within the allowed output directory
function isPathWithinAllowedDirectory(filePath: string, allowedDir: string): boolean {
  try {
    const resolvedPath = resolve(filePath);
    const resolvedAllowed = resolve(allowedDir);
    const relativePath = relative(resolvedAllowed, resolvedPath);
    return !relativePath.startsWith('..') && !relativePath.startsWith(sep);
  } catch {
    return false;
  }
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

export async function writeTestFiles(
  config: WriteTestFilesConfig,
  logger: Logger
): Promise<WriteTestFilesResult> {
  const { outputDir, testCases, namingConfig, overwrite, mode } = config;
  const writtenFiles: string[] = [];
  const errors: string[] = [];

  logger.info('FileManager', `Writing ${testCases.length} test files to ${outputDir} (mode: ${mode})`);

  try {
    // Group test cases by subtask
    const subtaskMap = new Map<number, TestCase[]>();
    for (const tc of testCases) {
      if (!subtaskMap.has(tc.subtaskId)) {
        subtaskMap.set(tc.subtaskId, []);
      }
      subtaskMap.get(tc.subtaskId)!.push(tc);
    }

    // Create subtask directories and write files
    for (const [subtaskId, cases] of subtaskMap) {
      const subtaskDir = getSubtaskDir(outputDir, subtaskId);
      await mkdir(subtaskDir, { recursive: true });

      for (const testCase of cases) {
        // Write .inp file if mode is input-only or input-output
        if (mode === 'input-only' || mode === 'input-output') {
          const inpFileName = getFileName(testCase, namingConfig, 'inp');
          const inpPath = join(subtaskDir, inpFileName);

          try {
            if (!overwrite) {
              // Check if file exists
              const fs = await import('fs/promises');
              try {
                await fs.access(inpPath);
                errors.push(`File already exists (overwrite disabled): ${inpPath}`);
                continue;
              } catch {
                // File doesn't exist, proceed
              }
            }

            await writeFile(inpPath, testCase.input, 'utf-8');
            writtenFiles.push(inpPath);
          } catch (error) {
            errors.push(`Failed to write ${inpPath}: ${error}`);
          }
        }

        // Write .out file if mode is input-output and output exists
        if (mode === 'input-output' && testCase.output !== undefined) {
          const outFileName = getFileName(testCase, namingConfig, 'out');
          const outPath = join(subtaskDir, outFileName);

          try {
            if (!overwrite) {
              const fs = await import('fs/promises');
              try {
                await fs.access(outPath);
                errors.push(`File already exists (overwrite disabled): ${outPath}`);
                continue;
              } catch {
                // File doesn't exist, proceed
              }
            }

            // Write output EXACTLY as produced (preserve whitespace, newlines)
            await writeFile(outPath, testCase.output, 'utf-8');
            writtenFiles.push(outPath);
          } catch (error) {
            errors.push(`Failed to write ${outPath}: ${error}`);
          }
        }
      }
    }

    logger.success('FileManager', `Successfully wrote ${writtenFiles.length} files, ${errors.length} errors`);

    return {
      success: errors.length === 0,
      writtenFiles,
      errors,
    };
  } catch (error) {
    logger.error('FileManager', `Failed to write test files: ${error}`);
    return {
      success: false,
      writtenFiles,
      errors: [`Directory error: ${error}`, ...errors],
    };
  }
}

export async function createZip(
  config: CreateZipConfig,
  logger: Logger
): Promise<CreateZipResult> {
  const { sourceDir, outputPath, includeErrorReport, errorReport } = config;

  logger.info('FileManager', `Creating ZIP archive: ${outputPath}`);

  return new Promise((resolve) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      logger.success('FileManager', `ZIP created successfully: ${archive.pointer()} bytes`);
      resolve({ success: true, zipPath: outputPath });
    });

    archive.on('error', (err) => {
      logger.error('FileManager', `ZIP creation failed: ${err}`);
      resolve({ success: false, error: err.message });
    });

    archive.pipe(output);

    // Add all files from source directory
    archive.directory(sourceDir, false);

    // Add error report if requested
    if (includeErrorReport && errorReport) {
      archive.append(errorReport, { name: 'ERROR_REPORT.txt' });
    }

    archive.finalize();
  });
}

export async function getOutputDirectoryStructure(outputDir: string): Promise<{
  subtasks: Array<{ id: number; name: string; testCount: number; files: string[] }>;
  totalFiles: number;
}> {
  const subtasks: Array<{ id: number; name: string; testCount: number; files: string[] }> = [];
  let totalFiles = 0;

  try {
    const entries = await readdir(outputDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('Subtask-')) {
        const subtaskPath = join(outputDir, entry.name);
        const files = await readdir(subtaskPath);
        const inpFiles = files.filter(f => f.endsWith('.inp')).sort();
        const outFiles = files.filter(f => f.endsWith('.out')).sort();

        const idMatch = entry.name.match(/Subtask-(\d+)/);
        const id = idMatch ? parseInt(idMatch[1], 10) : subtasks.length + 1;

        subtasks.push({
          id,
          name: entry.name,
          testCount: inpFiles.length,
          files: [...inpFiles, ...outFiles],
        });
        totalFiles += files.length;
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return { subtasks, totalFiles };
}

export async function readTestFile(filePath: string, allowedDir: string): Promise<string> {
  // Validate path is within allowed directory to prevent path traversal
  if (!isPathWithinAllowedDirectory(filePath, allowedDir)) {
    throw new Error('Path traversal attempt blocked');
  }
  return readFile(filePath, 'utf-8');
}

export async function openOutputFolder(outputDir: string): Promise<void> {
  const { spawn } = await import('child_process');
  const command = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(command, [outputDir], { detached: true, stdio: 'ignore' }).unref();
}