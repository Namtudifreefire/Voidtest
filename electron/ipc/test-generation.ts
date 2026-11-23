import { Logger } from './logger.js';
import { CodeAnalysisResult, SubtaskConfig, VariableInfo, TestCase, NamingConfig } from './code-analysis.js';

export interface TestGenerationConfig {
  code: string;
  analysis: CodeAnalysisResult;
  aiAnalysis?: any;
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

function generateRandomValue(type: VariableInfo['type'], min: number, max: number): string {
  switch (type) {
    case 'int':
    case 'long':
      return String(Math.floor(Math.random() * (max - min + 1)) + min);
    case 'double':
    case 'float':
      return (Math.random() * (max - min) + min).toFixed(6);
    case 'char':
      return String.fromCharCode(Math.floor(Math.random() * 26) + 97);
    case 'bool':
      // C++ reads bool as 0 or 1
      return Math.random() > 0.5 ? '1' : '0';
    case 'string':
      const length = Math.floor(Math.random() * 10) + 1;
      return Array.from({ length }, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join('');
    default:
      return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }
}

function generateBoundaryValues(min: number, max: number, type: VariableInfo['type'], includeZero = true): string[] {
  const values = new Set<string>();

  // Min and max
  values.add(String(min));
  values.add(String(max));

  // Near boundaries
  if (min > Number.MIN_SAFE_INTEGER) values.add(String(min - 1));
  if (max < Number.MAX_SAFE_INTEGER) values.add(String(max + 1));

  // Zero
  if (includeZero && min <= 0 && max >= 0) {
    values.add('0');
  }

  // Special values for integers
  if (type === 'int' || type === 'long') {
    values.add('1');
    values.add('-1');
    if (max >= 2) values.add('2');
    if (min <= -2) values.add('-2');
  }

  return Array.from(values);
}

type PatternType = 'sorted' | 'reverse' | 'duplicate' | 'random' | 'single';

function generatePatternArray(length: number, pattern: PatternType, valueRange: [number, number]): string[] {
  const [min, max] = valueRange;
  const arr: number[] = [];

  switch (pattern) {
    case 'sorted':
      for (let i = 0; i < length; i++) {
        arr.push(min + Math.floor((max - min) * i / Math.max(1, length - 1)));
      }
      break;
    case 'reverse':
      for (let i = 0; i < length; i++) {
        arr.push(max - Math.floor((max - min) * i / Math.max(1, length - 1)));
      }
      break;
    case 'duplicate':
      const dupValue = Math.floor(Math.random() * (max - min + 1)) + min;
      for (let i = 0; i < length; i++) {
        arr.push(dupValue);
      }
      break;
    case 'single':
      arr.push(Math.floor(Math.random() * (max - min + 1)) + min);
      break;
    case 'random':
    default:
      for (let i = 0; i < length; i++) {
        arr.push(Math.floor(Math.random() * (max - min + 1)) + min);
      }
      break;
  }

  return arr.map(String);
}

function formatInput(context: { variables: VariableInfo[] }, variableValues: Record<string, unknown>): string {
  const { variables } = context;
  const parts: string[] = [];

  for (const variable of variables) {
    // Only include input variables in the test input
    if (!variable.isInput) continue;

    const value = variableValues[variable.name];
    if (value === undefined) continue;

    if (variable.isArray && Array.isArray(value)) {
      // For arrays, output length first then elements
      parts.push(String(value.length));
      parts.push(...value.map(String));
    } else if (variable.type === 'matrix' && Array.isArray(value)) {
      // For 2D arrays
      const matrix = value as string[][];
      parts.push(String(matrix.length));
      if (matrix.length > 0) {
        parts.push(String(matrix[0].length));
      }
      for (const row of matrix) {
        parts.push(...row);
      }
    } else {
      parts.push(String(value));
    }
  }

  return parts.join(' ');
}

// Limit for usedInputs Set per subtask to prevent memory issues
const MAX_USED_INPUTS_PER_SUBTASK = 5000;

function generateTestCase(context: any, _testIndex: number): Record<string, unknown> {
  const { variables, constraints, subtaskLimits, strategy, parameters, usedInputs, seed } = context;
  const result: Record<string, unknown> = {};
  let attempts = 0;
  const maxAttempts = 50; // Reduced from 100 for faster generation

  // Create a seeded random generator if seed is provided
  let random = Math.random;
  if (seed !== undefined) {
    let s = seed;
    random = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  // Pre-calculate min/max for all variables to avoid repeated calculations
  const variableRanges = variables.map((variable: VariableInfo) => {
    const limit = subtaskLimits[variable.name] || { min: 1, max: 100 };
    const constraint = constraints.find((c: any) => c.variable === variable.name);
    let min = (constraint?.min as number) ?? limit.min;
    let max = (constraint?.max as number) ?? limit.max;

    // Validate limits
    if (min > max) {
      console.warn(`Invalid limits for ${variable.name}: min (${min}) > max (${max}), swapping`);
      const temp = min;
      min = max;
      max = temp;
    }
    return { variable, min, max };
  });

  while (attempts < maxAttempts) {
    attempts++;

    for (const { variable, min, max } of variableRanges) {
      if (variable.isArray) {
        // Determine array length - use declared dimensions if available
        let length: number;
        if (variable.arrayDimensions && variable.arrayDimensions.length > 0) {
          length = variable.arrayDimensions[0];
        } else {
          // No declared dimensions - use subtask limits or random within reasonable bounds (1-100)
          const limit = subtaskLimits[variable.name] || { min: 1, max: 100 };
          length = Math.floor(random() * (limit.max - limit.min + 1)) + limit.min;
        }

        // Choose pattern based on strategy
        let pattern: PatternType = 'random';
        if (strategy === 'boundary' || (strategy === 'mixed' && random() < (parameters.boundaryRatio as number || 0.3))) {
          pattern = ['sorted', 'reverse', 'single', 'duplicate'][Math.floor(random() * 4)] as PatternType;
        } else if (strategy === 'pattern' || (strategy === 'mixed' && random() < (parameters.patternRatio as number || 0.2))) {
          pattern = ['sorted', 'reverse', 'duplicate'][Math.floor(random() * 3)] as PatternType;
        }

        result[variable.name] = generatePatternArray(length, pattern, [min, max]);
      } else if (variable.type === 'matrix') {
        // Use declared dimensions if available, otherwise use limits
        let rows: number, cols: number;
        if (variable.arrayDimensions && variable.arrayDimensions.length >= 2) {
          rows = variable.arrayDimensions[0];
          cols = variable.arrayDimensions[1];
        } else if (variable.arrayDimensions && variable.arrayDimensions.length === 1) {
          rows = variable.arrayDimensions[0];
          cols = variable.arrayDimensions[0];
        } else {
          // No declared dimensions - use subtask limits
          const limit = subtaskLimits[variable.name] || { min: 1, max: 5 };
          rows = Math.floor(random() * (limit.max - limit.min + 1)) + limit.min;
          cols = Math.floor(random() * (limit.max - limit.min + 1)) + limit.min;
        }
        const matrix: string[][] = [];
        for (let i = 0; i < rows; i++) {
          matrix.push(generatePatternArray(cols, 'random', [min, max]));
        }
        result[variable.name] = matrix;
      } else {
        // Scalar value
        // Use local variables for min/max to allow swapping
        let localMin = min;
        let localMax = max;

        // Validate limits
        if (localMin > localMax) {
          console.warn(`Invalid limits for ${variable.name}: min (${localMin}) > max (${localMax}), swapping`);
          const temp = localMin;
          localMin = localMax;
          localMax = temp;
        }

        // Scalar value
        let value: string;
        if (strategy === 'boundary' || (strategy === 'mixed' && random() < (parameters.boundaryRatio as number || 0.3))) {
          const boundaries = generateBoundaryValues(localMin, localMax, variable.type, parameters.includeZero as boolean ?? true);
          value = boundaries[Math.floor(random() * boundaries.length)];
        } else {
          value = generateRandomValue(variable.type, localMin, localMax);
        }
        result[variable.name] = value;
      }
    }

    // Check for duplicates
    const inputStr = formatInput({ variables }, result);
    if (!usedInputs.has(inputStr)) {
      usedInputs.add(inputStr);
      // Limit Set size to prevent memory issues
      if (usedInputs.size > MAX_USED_INPUTS_PER_SUBTASK) {
        // Remove oldest entries (first 1000) to make room
        const entries = Array.from(usedInputs);
        usedInputs.clear();
        entries.slice(1000).forEach(e => usedInputs.add(e));
      }
      return result;
    }
  }

  // If we couldn't generate unique input, return anyway
  const inputStr = formatInput({ variables }, result);
  usedInputs.add(inputStr);
  return result;
}

export async function generateTestCases(
  config: TestGenerationConfig,
  logger: Logger
): Promise<any> {
  logger.info('TestGeneration', `Starting test generation for ${config.subtasks.length} subtasks`);

  const { analysis, subtasks, namingConfig } = config;
  const allTestCases: any[] = [];
  const errors: string[] = [];
  let testCounter = namingConfig.startNumber;

  // Extract seed from aiAnalysis if available
  const seed = config.aiAnalysis?.seed;

for (const subtask of subtasks) {
    logger.info('TestGeneration', `Generating ${subtask.testCount} tests for subtask ${subtask.id}: ${subtask.name}`);

    const context = {
      variables: analysis.variables,
      constraints: analysis.constraints,
      edgeCases: analysis.edgeCases,
      subtaskLimits: subtask.limits,
      strategy: subtask.generationStrategy,
      parameters: config.aiAnalysis?.strategies?.find((s: any) => s.subtaskId === subtask.id)?.parameters || {},
      usedInputs: new Set<string>(),
      seed: seed !== undefined ? seed + subtask.id : undefined,
    };

    for (let i = 0; i < subtask.testCount; i++) {
      const variableValues = generateTestCase(context, i);
      const input = formatInput({ variables: analysis.variables }, variableValues);

      allTestCases.push({
        id: testCounter,
        subtaskId: subtask.id,
        input,
        status: 'pending',
      });

      testCounter++;
    }

    // Clear usedInputs between subtasks to limit memory growth
    context.usedInputs.clear();
  }

  logger.success('TestGeneration', `Generated ${allTestCases.length} test cases`);

  return {
    success: true,
    outputDir: '', // Will be set by file manager
    testCases: allTestCases,
    errors,
  };
}