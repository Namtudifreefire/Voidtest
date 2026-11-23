// Simple regex-based C++ code analysis (fallback when tree-sitter is not available)

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

// Export types for AI analysis
export type SubtaskSuggestion = {
  id: number;
  name: string;
  description: string;
  limits: Record<string, { min: number; max: number }>;
  testCount: number;
  generationStrategy: string;
};

export type GenerationStrategy = {
  subtaskId: number;
  strategy: 'random' | 'boundary' | 'pattern' | 'constraint' | 'mixed';
  parameters: Record<string, unknown>;
};

export type AiProviderConfig = {
  type: 'openai' | 'azure' | 'ollama' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
};

// Test types for other modules
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

// Simple regex-based C++ code analysis (fallback when tree-sitter is not available)
function analyzeConstraints(source: string, variables: VariableInfo[]): ConstraintInfo[] {
  const constraints: ConstraintInfo[] = [];
  const varNames = new Set(variables.map(v => v.name));

  // Look for common constraint patterns in comments and code
  const constraintPatterns = [
    // Pattern: variable <= value, variable >= value, etc.
    /(\w+)\s*(<=|>=|<|>)\s*(\d+)/g,
    // Pattern: #define NAME VALUE
    /#define\s+(\w+)\s+(\d+)/g,
    // Pattern: const int NAME = VALUE
    /const\s+(?:int|long|long\s+long)\s+(\w+)\s*=\s*(\d+)/g,
    // Pattern: constexpr int NAME = VALUE
    /constexpr\s+(?:int|long|long\s+long)\s+(\w+)\s*=\s*(\d+)/g,
    // Pattern: variable = value in constraints context
    /(?:constraint|limit|range)\s*[:=]\s*(\w+)\s*[<>=]+\s*(\d+)/gi,
  ];

  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of constraintPatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        if (match.length >= 3) {
          const varName = match[1];
          // Only add constraints for known variables
          if (!varNames.has(varName)) continue;

          const value = parseInt(match[2] || match[3] || '0', 10);
          const isMax = line.includes('max') || line.includes('>=') || line.includes('<=') || (match[1] && (match[1].includes('>') || match[1].includes('<')) && line.includes('>'));
          const existing = constraints.find(c => c.variable === varName);
          if (existing) {
            if (isMax && (existing.max === undefined || value > (existing.max as number))) {
              existing.max = value;
            } else if (!isMax && (existing.min === undefined || value < (existing.min as number))) {
              existing.min = value;
            }
          } else {
            constraints.push({
              variable: varName,
              [isMax ? 'max' : 'min']: value,
              description: `Found in line ${i + 1}: ${line.trim()}`,
              line: i + 1,
            });
          }
        }
      }
    }
  }

  // Infer constraints from loop bounds (but only for loop counters, not for problem constraints)
  const loopPatterns = [
    /for\s*\(\s*(?:int|long|auto)\s+(\w+)\s*=\s*(\d+)\s*;\s*\w+\s*[<>=]+\s*(\d+)/g,
    /while\s*\(\s*(\w+)\s*[<>=]+\s*(\d+)/g,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of loopPatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        if (match.length >= 3) {
          const varName = match[1];
          // Only add if it's a loop counter variable
          if (!varNames.has(varName)) continue;
          const start = parseInt(match[2], 10);
          const end = parseInt(match[3], 10);
          constraints.push({
            variable: varName,
            min: start,
            max: end,
            description: `Loop bounds in line ${i + 1}`,
            line: i + 1,
          });
        }
      }
    }
  }

  return constraints;
}

function detectAlgorithm(source: string): { algorithm: string; complexity: string } {
  const algorithms = [
    { pattern: /\bsort\b|\bstd::sort\b/, name: 'Sorting', complexity: 'O(n log n)' },
    { pattern: /\bbinary_search\b|\blower_bound\b|\bupper_bound\b/, name: 'Binary Search', complexity: 'O(log n)' },
    { pattern: /\bdfs\b|\bdepth.first.search\b/, name: 'DFS', complexity: 'O(V + E)' },
    { pattern: /\bbfs\b|\bbreadth.first.search\b/, name: 'BFS', complexity: 'O(V + E)' },
    { pattern: /\bdijkstra\b/, name: 'Dijkstra', complexity: 'O(E log V)' },
    { pattern: /\bfloyd.warshall\b|\bfloyd\b/, name: 'Floyd-Warshall', complexity: 'O(V^3)' },
    { pattern: /\bkmp\b|\bknuth.morris.pratt\b/, name: 'KMP', complexity: 'O(n + m)' },
    { pattern: /\bdp\b|dynamic.programming|memoization|tabulation/, name: 'Dynamic Programming', complexity: 'Varies' },
    { pattern: /\bsegment.tree\b|\bbit\b|\bfenwick\b/, name: 'Segment Tree / BIT', complexity: 'O(log n)' },
    { pattern: /\bunion.find\b|\bdisjoint.set\b/, name: 'Union Find', complexity: 'O(α(n))' },
    { pattern: /\bprim\b|\bkruskal\b/, name: 'Minimum Spanning Tree', complexity: 'O(E log V)' },
    { pattern: /\btopological.sort\b/, name: 'Topological Sort', complexity: 'O(V + E)' },
    { pattern: /\btwo.pointers?\b/, name: 'Two Pointers', complexity: 'O(n)' },
    { pattern: /\bsliding.window\b/, name: 'Sliding Window', complexity: 'O(n)' },
    { pattern: /\bbacktracking\b|\bdfs.*recursive\b/, name: 'Backtracking', complexity: 'Exponential' },
    { pattern: /\bbitmask\b|\bbit.manipulation\b/, name: 'Bitmask DP', complexity: 'O(2^n)' },
  ];

  const lowerSource = source.toLowerCase();
  for (const { pattern, name, complexity } of algorithms) {
    if (pattern.test(lowerSource)) {
      return { algorithm: name, complexity };
    }
  }

  return { algorithm: 'Unknown', complexity: 'Unknown' };
}

function generateEdgeCases(variables: VariableInfo[], constraints: ConstraintInfo[]): EdgeCaseInfo[] {
  const edgeCases: EdgeCaseInfo[] = [];

  for (const variable of variables) {
    const constraint = constraints.find(c => c.variable === variable.name);

    // Empty/Zero cases
    if (variable.type === 'vector' || variable.type === 'array' || variable.type === 'matrix') {
      edgeCases.push({
        type: 'empty',
        description: `Empty ${variable.name}`,
        affectedVariables: [variable.name],
        priority: 'high',
      });
      edgeCases.push({
        type: 'single',
        description: `Single element in ${variable.name}`,
        affectedVariables: [variable.name],
        priority: 'high',
      });
    }

    // Boundary cases
    if (constraint) {
      if (constraint.min !== undefined) {
        edgeCases.push({
          type: 'min',
          description: `Minimum value for ${variable.name} (${constraint.min})`,
          affectedVariables: [variable.name],
          priority: 'high',
        });
        edgeCases.push({
          type: 'boundary',
          description: `Boundary: ${variable.name} = ${Number(constraint.min) - 1}`,
          affectedVariables: [variable.name],
          priority: 'medium',
        });
      }
      if (constraint.max !== undefined) {
        edgeCases.push({
          type: 'max',
          description: `Maximum value for ${variable.name} (${constraint.max})`,
          affectedVariables: [variable.name],
          priority: 'high',
        });
        edgeCases.push({
          type: 'boundary',
          description: `Boundary: ${variable.name} = ${Number(constraint.max) + 1}`,
          affectedVariables: [variable.name],
          priority: 'medium',
        });
      }
    } else {
      // Default boundaries for numeric types
      if (['int', 'long', 'double', 'float'].includes(variable.type)) {
        edgeCases.push({
          type: 'zero',
          description: `Zero value for ${variable.name}`,
          affectedVariables: [variable.name],
          priority: 'high',
        });
        edgeCases.push({
          type: 'negative',
          description: `Negative value for ${variable.name}`,
          affectedVariables: [variable.name],
          priority: 'medium',
        });
        edgeCases.push({
          type: 'max',
          description: `Large value for ${variable.name} (near INT_MAX)`,
          affectedVariables: [variable.name],
          priority: 'medium',
        });
      }
    }

    // Special patterns for arrays/vectors
    if (variable.type === 'vector' || variable.type === 'array') {
      edgeCases.push({
        type: 'sorted',
        description: `Sorted ${variable.name} (ascending)`,
        affectedVariables: [variable.name],
        priority: 'medium',
      });
      edgeCases.push({
        type: 'reverse',
        description: `Reverse sorted ${variable.name} (descending)`,
        affectedVariables: [variable.name],
        priority: 'medium',
      });
      edgeCases.push({
        type: 'duplicate',
        description: `Duplicate elements in ${variable.name}`,
        affectedVariables: [variable.name],
        priority: 'medium',
      });
    }
  }

  return edgeCases;
}

export interface EdgeCaseInfo {
  type: 'empty' | 'boundary' | 'overflow' | 'special' | 'duplicate' | 'sorted' | 'reverse' | 'single' | 'negative' | 'zero' | 'max' | 'min';
  description: string;
  affectedVariables: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface AiAnalysisResult {
  success: boolean;
  suggestedSubtasks: SubtaskSuggestion[];
  generationStrategies: GenerationStrategy[];
  additionalEdgeCases: EdgeCaseInfo[];
  error?: string;
}

// Simple regex-based C++ code analysis
export async function analyzeCode(sourceCode: string, _logger: any): Promise<CodeAnalysisResult> {
  try {
    // Extract includes
    const includes: string[] = [];
    const includeRegex = /#include\s+[<"]([^>"]+)[>"]/g;
    let includeMatch;
    while ((includeMatch = includeRegex.exec(sourceCode)) !== null) {
      includes.push(includeMatch[0]);
    }

    // Find main function
    const mainFunctionRegex = /int\s+main\s*\([^)]*\)\s*\{/;
    const mainFunctionFound = mainFunctionRegex.test(sourceCode);

    // Extract variables from main function scope (simple regex-based)
    const variables: VariableInfo[] = [];
    const variableRegex = /\b(int|long|long\s+long|short|float|double|char|bool|string|vector\s*<\s*\w+\s*>|array\s*<\s*\w+\s*,\s*\d+\s*>)\s+(\w+)\s*(?:\[(\d+)\])?\s*(?:=\s*[^;]+)?\s*;/g;
    let varMatch;
    while ((varMatch = variableRegex.exec(sourceCode)) !== null) {
      const typeStr = varMatch[1].toLowerCase().replace(/\s+/g, ' ');
      const varName = varMatch[2];
      const arraySize = varMatch[3] ? parseInt(varMatch[3], 10) : undefined;

      let varType: VariableInfo['type'] = 'unknown';
      const baseType = typeStr.replace(/\s+/g, '').replace(/std::/g, '');

      if (baseType.includes('vector') || baseType.includes('array')) {
        varType = 'vector';
      } else if (['int', 'int32_t', 'int64_t', 'long', 'longlong', 'short', 'signed'].some(t => baseType.includes(t))) {
        varType = 'int';
      } else if (['unsigned', 'uint32_t', 'uint64_t', 'size_t'].some(t => baseType.includes(t))) {
        varType = 'int';
      } else if (['float', 'double', 'longdouble'].some(t => baseType.includes(t))) {
        varType = 'double';
      } else if (['string', 'stdstring'].some(t => baseType.includes(t))) {
        varType = 'string';
      } else if (['char', 'char16_t', 'char32_t', 'wchar_t'].some(t => baseType.includes(t))) {
        varType = 'char';
      } else if (['bool', 'boolean'].some(t => baseType.includes(t))) {
        varType = 'bool';
      }

      variables.push({
        name: varName,
        type: varType,
        isArray: !!arraySize || varType === 'vector',
        arrayDimensions: arraySize ? [arraySize] : undefined,
        isInput: false, // Will be determined by cin/cout analysis
        isOutput: false,
        description: `${varType}${arraySize ? ' array' : ''} variable`,
      });
    }

    // Also look for cin/cout patterns to understand input/output structure
    const inputVars = new Set<string>();
    const outputVars = new Set<string>();

    const cinRegex = /cin\s*>>\s*(\w+)/g;
    let cinMatch;
    while ((cinMatch = cinRegex.exec(sourceCode)) !== null) {
      inputVars.add(cinMatch[1]);
    }

    const coutRegex = /cout\s*<<\s*(\w+)/g;
    let coutMatch;
    while ((coutMatch = coutRegex.exec(sourceCode)) !== null) {
      outputVars.add(coutMatch[1]);
    }

    // Also detect chained cin >> a >> b
    const chainedCinRegex = /cin\s*>>\s*(\w+)(?:\s*>>\s*(\w+))*/g;
    while ((cinMatch = chainedCinRegex.exec(sourceCode)) !== null) {
      for (let i = 1; i < cinMatch.length; i++) {
        if (cinMatch[i]) inputVars.add(cinMatch[i]);
      }
    }

    // Also detect chained cout << a << b
    const chainedCoutRegex = /cout\s*<<\s*(\w+)(?:\s*<<\s*(\w+))*/g;
    while ((coutMatch = chainedCoutRegex.exec(sourceCode)) !== null) {
      for (let i = 1; i < coutMatch.length; i++) {
        if (coutMatch[i]) outputVars.add(coutMatch[i]);
      }
    }

    // Mark variables as input/output based on cin/cout usage
    for (const variable of variables) {
      variable.isInput = inputVars.has(variable.name);
      variable.isOutput = outputVars.has(variable.name);
    }

    // For variables not explicitly in cin/cout, infer from usage
    // Variables used in cin are input, variables used in cout are output
    // Variables neither in cin nor cout but declared - default to input if not output
    for (const variable of variables) {
      if (!variable.isInput && !variable.isOutput) {
        variable.isInput = true; // Default assumption
      }
    }

    // Analyze constraints
    const constraints = analyzeConstraints(sourceCode, variables);

    // Detect algorithm
    const { algorithm, complexity } = detectAlgorithm(sourceCode);

    // Generate edge cases
    const edgeCases = generateEdgeCases(variables, constraints);

    // Build input/output structure
    const inputVariables = variables.filter(v => v.isInput);
    const outputVariables = variables.filter(v => v.isOutput);

    const inputStructure: InputStructure = {
      format: 'standard',
      variables: inputVariables,
      description: `Input contains ${inputVariables.length} variable(s)`,
      rawStructure: inputVariables.map(v => `${v.type} ${v.name}${v.isArray ? '[]' : ''}`).join(', '),
    };

    const outputStructure: OutputStructure = {
      format: 'standard',
      variables: outputVariables.length > 0 ? outputVariables : variables.filter(v => !v.isInput),
      description: `Output contains ${outputVariables.length || variables.filter(v => !v.isInput).length} variable(s)`,
      rawStructure: outputVariables.length > 0
        ? outputVariables.map(v => `${v.type} ${v.name}${v.isArray ? '[]' : ''}`).join(', ')
        : variables.filter(v => !v.isInput).map(v => `${v.type} ${v.name}${v.isArray ? '[]' : ''}`).join(', '),
    };

    return {
      success: true,
      inputStructure,
      outputStructure,
      algorithm,
      complexity,
      variables,
      constraints,
      edgeCases,
      includes,
      mainFunctionFound,
    };
  } catch (error) {
    return {
      success: false,
      variables: [],
      constraints: [],
      edgeCases: [],
      includes: [],
      mainFunctionFound: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}