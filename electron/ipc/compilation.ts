import { Logger } from './logger.js';
import { spawn } from 'child_process';
import { writeFile, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { SettingsManager } from './settings.js';

export interface CompilationResult {
  success: boolean;
  executablePath?: string;
  errors?: string[];
  warnings?: string[];
  compilerUsed: string;
  compileTime: number;
}

interface CompilerInfo {
  name: string;
  command: string;
  args: string[];
  outputFlag: string;
  versionFlag: string;
}

const COMPILERS: CompilerInfo[] = [
  // GCC/G++
  { name: 'g++', command: 'g++', args: ['-std=c++17', '-O2', '-pipe', '-Wall', '-Wextra'], outputFlag: '-o', versionFlag: '--version' },
  { name: 'clang++', command: 'clang++', args: ['-std=c++17', '-O2', '-pipe', '-Wall', '-Wextra'], outputFlag: '-o', versionFlag: '--version' },
  // MSVC (Windows)
  { name: 'cl.exe', command: 'cl.exe', args: ['/std:c++17', '/O2', '/EHsc', '/Wall'], outputFlag: '/Fe', versionFlag: '/?' },
];

async function detectCompiler(settingsManager: SettingsManager, logger: Logger): Promise<CompilerInfo | null> {
  // Check user-configured compiler first
  const customPath = settingsManager.get('compilerPath');
  if (customPath) {
    try {
      await runCommand(customPath, ['--version'], { timeout: 3000 });
      logger.info('Compilation', `Using custom compiler: ${customPath}`);
      return {
        name: 'custom',
        command: customPath,
        args: ['-std=c++17', '-O2', '-pipe', '-Wall', '-Wextra'],
        outputFlag: '-o',
        versionFlag: '--version',
      };
    } catch {
      logger.warning('Compilation', `Custom compiler not found: ${customPath}`);
    }
  }

  // Try each known compiler with shorter timeout
  for (const compiler of COMPILERS) {
    try {
      await runCommand(compiler.command, [compiler.versionFlag], { timeout: 3000 });
      logger.info('Compilation', `Detected compiler: ${compiler.name}`);
      return compiler;
    } catch {
      // Compiler not found, try next
    }
  }

  // On Windows, try to find MinGW in common locations (only if no compiler found)
  if (process.platform === 'win32') {
    const mingwPaths = [
      'C:\\mingw64\\bin\\g++.exe',
      'C:\\msys64\\mingw64\\bin\\g++.exe',
      'C:\\Program Files\\mingw64\\bin\\g++.exe',
      join(process.env.USERPROFILE || '', 'scoop', 'apps', 'mingw', 'current', 'bin', 'g++.exe'),
    ];

    for (const path of mingwPaths) {
      try {
        await runCommand(path, ['--version'], { timeout: 2000 });
        logger.info('Compilation', `Found MinGW at: ${path}`);
        return {
          name: 'g++',
          command: path,
          args: ['-std=c++17', '-O2', '-pipe', '-Wall', '-Wextra'],
          outputFlag: '-o',
          versionFlag: '--version',
        };
      } catch {
        // Not found
      }
    }
  }

  logger.error('Compilation', 'No C++ compiler found');
  return null;
}

function runCommand(command: string, args: string[], options: any = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // Use absolute command path when possible to avoid PATH hijacking
    // Never use shell: true with user-controlled or PATH-resolved commands
    const child = spawn(command, args, {
      ...options,
      windowsHide: true,
      shell: false, // Disabled for security - prevents PATH hijacking
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out after ${options.timeout || 30000}ms`));
    }, options.timeout || 30000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

export async function compileCode(
  sourceCode: string,
  settingsManager: SettingsManager,
  logger: Logger
): Promise<CompilationResult> {
  const startTime = Date.now();
  logger.info('Compilation', 'Starting compilation');

  const compiler = await detectCompiler(settingsManager, logger);
  if (!compiler) {
    return {
      success: false,
      errors: ['No C++ compiler found. Please install g++, clang++, or MSVC, or configure a custom compiler path in settings.'],
      compilerUsed: 'none',
      compileTime: Date.now() - startTime,
    };
  }

  // Create temporary directory for compilation
  const tempDir = await mkdtemp(join(tmpdir(), 'voidtest-compile-'));
  const sourceFile = join(tempDir, 'main.cpp');
  const executableName = process.platform === 'win32' ? 'main.exe' : 'main';
  const executablePath = join(tempDir, executableName);

  try {
    // Write source code
    await writeFile(sourceFile, sourceCode, 'utf-8');

    // Build compilation command
    const compileArgs = [
      ...compiler.args,
      compiler.outputFlag,
      executablePath,
      sourceFile,
    ];

    logger.info('Compilation', `Running: ${compiler.command} ${compileArgs.join(' ')}`);

    const { stderr } = await runCommand(compiler.command, compileArgs, { timeout: 60000 });

    // Check if executable was created
    const fs = await import('fs/promises');
    try {
      await fs.access(executablePath);
    } catch {
      return {
        success: false,
        errors: ['Compilation appeared to succeed but executable was not created', stderr],
        warnings: [],
        compilerUsed: compiler.name,
        compileTime: Date.now() - startTime,
      };
    }

    const warnings: string[] = [];
    if (stderr) {
      for (const line of stderr.split('\n')) {
        if (line.includes('warning:')) {
          warnings.push(line.trim());
        }
      }
    }

    logger.success('Compilation', `Compilation successful in ${Date.now() - startTime}ms`);

    return {
      success: true,
      executablePath,
      warnings: warnings.length > 0 ? warnings : undefined,
      compilerUsed: compiler.name,
      compileTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown compilation error';
    logger.error('Compilation', `Compilation failed: ${errorMessage}`);

    // Clean up temp directory on failure
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch { }

    return {
      success: false,
      errors: [errorMessage],
      compilerUsed: compiler.name,
      compileTime: Date.now() - startTime,
    };
  }
}

// Clean up compilation artifacts
export async function cleanupCompilation(executablePath: string): Promise<void> {
  try {
    const tempDir = join(executablePath, '..');
    await rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}