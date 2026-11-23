// Lightweight recognition of common competitive-programming input patterns; not a C++ parser.
import type { VariableInfo as SharedVariable, CodeAnalysisResult, ConstraintInfo, EdgeCaseInfo } from '../../src/types';
export type { CodeAnalysisResult, ConstraintInfo, EdgeCaseInfo, InputStructure, OutputStructure, AiAnalysisResult, AiProviderConfig, SubtaskSuggestion, GenerationStrategy, TestCase, TestGenerationConfig, TestGenerationResult, SubtaskConfig, NamingConfig } from '../../src/types';
export type VariableInfo = SharedVariable & { lengthVariable?: string };

const algorithms: [RegExp, string, string][] = [
  [/\bsort\b/, 'Sorting', 'O(n log n)'], [/\b(binary_search|lower_bound|upper_bound)\b/, 'Binary Search', 'O(log n)'],
  [/\bdfs\b/, 'DFS', 'O(V + E)'], [/\bbfs\b/, 'BFS', 'O(V + E)'], [/\bdijkstra\b/, 'Dijkstra', 'O(E log V)'],
  [/\bfloyd\b/, 'Floyd-Warshall', 'O(V^3)'], [/\bkmp\b/, 'KMP', 'O(n + m)'], [/\b(dp|memoization|tabulation)\b/, 'Dynamic Programming', 'Varies'],
  [/segment.tree|fenwick|\bbit\b/, 'Segment Tree / BIT', 'O(log n)'], [/union.find|disjoint.set/, 'Union Find', 'O(α(n))'],
  [/\b(prim|kruskal)\b/, 'Minimum Spanning Tree', 'O(E log V)'], [/topological.sort/, 'Topological Sort', 'O(V + E)'],
  [/two.pointers?/, 'Two Pointers', 'O(n)'], [/sliding.window/, 'Sliding Window', 'O(n)'], [/backtracking/, 'Backtracking', 'Exponential'], [/bitmask/, 'Bitmask DP', 'O(2^n)'],
];

function declaredType(raw: string): VariableInfo['type'] {
  if (/vector|array/.test(raw)) return 'vector';
  if (/long/.test(raw)) return 'long';
  if (/float|double|char|string|bool/.test(raw)) return raw.replace('std::', '') as VariableInfo['type'];
  return 'int';
}
function boundValue(raw: string): number {
  const power = /^(.*?)\s*\^\s*(\d+)$/.exec(raw);
  return power ? Number(power[1]) ** Number(power[2]) : Number(raw);
}
function bounds(comments: string[], variables: VariableInfo[]): ConstraintInfo[] {
  const result = new Map<string, ConstraintInfo>();
  const number = '-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?(?:\\s*\\^\\s*\\d+)?';
  for (const v of variables.filter(v => v.isInput)) {
    const apply = (direction: 'min' | 'max', op: string, value: number, description: string) => {
      const integer = ['int', 'long', 'bool'].includes(v.type);
      if (!Number.isFinite(value) || (!integer && op.length === 1)) return;
      if (integer) value = direction === 'min' ? (op.length === 1 ? Math.floor(value) + 1 : Math.ceil(value)) : (op.length === 1 ? Math.ceil(value) - 1 : Math.floor(value));
      const c = result.get(v.name) ?? { variable: v.name, description };
      c[direction] = direction === 'min' ? Math.max(Number(c.min ?? -Infinity), value) : Math.min(Number(c.max ?? Infinity), value);
      result.set(v.name, c);
    };
    for (const comment of comments) {
      for (const m of comment.matchAll(new RegExp(`\\b${v.name}\\s*(<=|>=|<|>)\\s*(${number})(?![\\w.])`, 'g'))) apply(m[1][0] === '<' ? 'max' : 'min', m[1], boundValue(m[2]), comment.trim());
      for (const m of comment.matchAll(new RegExp(`(?<![\\w.^])(${number})\\s*(<=|>=|<|>)\\s*${v.name}\\b`, 'g'))) apply(m[2][0] === '<' ? 'min' : 'max', m[2], boundValue(m[1]), comment.trim());
    }
  }
  return [...result.values()];
}

export async function analyzeCode(sourceCode: string, _logger: unknown): Promise<CodeAnalysisResult> {
  const comments: string[] = [];
  const code = sourceCode.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, token => {
    if (token.startsWith('/')) comments.push(token);
    return token.replace(/[^\n]/g, ' ');
  });
  const declarations = new Map<string, VariableInfo>();
  const declaration = /\b((?:std::)?(?:vector\s*<\s*\w+\s*>|array\s*<\s*\w+\s*,\s*\d+\s*>|string)|long\s+long|int|long|short|double|float|char|bool)\s+([^;{}]+);/g;
  for (const m of code.matchAll(declaration)) {
    for (const item of m[2].split(',')) {
      const d = /^\s*([A-Za-z_]\w*)\s*((?:\[\s*\d+\s*\]\s*)*)(?:\(\s*(\w+)\s*\))?\s*(?:=[\s\S]*)?$/.exec(item);
      if (!d) continue;
      const type = declaredType(m[1]);
      const dims = [...d[2].matchAll(/\d+/g)].map(n => Number(n[0]));
      const fixed = m[1].match(/,\s*(\d+)\s*>/);
      if (fixed) dims.push(Number(fixed[1]));
      if (type === 'vector' && d[3] && /^\d+$/.test(d[3])) dims.push(Number(d[3]));
      declarations.set(d[1], { name: d[1], type: dims.length === 2 ? 'matrix' : type, isArray: !!dims.length || type === 'vector', arrayDimensions: dims.length ? dims : undefined,
        lengthVariable: type === 'vector' && d[3] && !/^\d+$/.test(d[3]) ? d[3] : undefined, isInput: false, isOutput: false, description: `${m[1]} ${d[1]}` });
    }
  }
  const inputs = new Set<string>();
  for (const m of code.matchAll(/\bcin\b((?:\s*>>\s*[A-Za-z_]\w*(?:\s*\[[^\];]*\])*)+)/g)) {
    for (const part of m[1].matchAll(/>>\s*([A-Za-z_]\w*)/g)) inputs.add(part[1]);
  }
  for (const m of code.matchAll(/\bcout\s*<<([^;]*)/g)) {
    for (const id of m[1].match(/[A-Za-z_]\w*/g) ?? []) { const v = declarations.get(id); if (v) v.isOutput = true; }
  }
  const ordered: VariableInfo[] = [];
  for (const name of inputs) { const v = declarations.get(name); if (v) { v.isInput = true; ordered.push(v); } }
  const variables = [...ordered, ...[...declarations.values()].filter(v => !v.isInput)];
  const constraints = bounds(comments, variables);
  const edgeCases: EdgeCaseInfo[] = [];
  for (const v of ordered) {
    const add = (type: EdgeCaseInfo['type'], description: string) => edgeCases.push({ type, description, affectedVariables: [v.name], priority: 'medium' });
    if (v.isArray) { for (const k of ['empty', 'single', 'sorted', 'reverse', 'duplicate'] as const) add(k, `${k}: ${v.name}`); }
    const c = constraints.find(c => c.variable === v.name);
    if (c?.min !== undefined) add('min', `${v.name} = ${c.min}`);
    if (c?.max !== undefined) add('max', `${v.name} = ${c.max}`);
    if (!v.isArray && ['int','long','float','double'].includes(v.type) && Number(c?.min ?? 0) <= 0 && Number(c?.max ?? 0) >= 0) add('zero', `${v.name} = 0`);
  }
  const structure = (vs: VariableInfo[]) => ({ format: 'standard' as const, variables: vs, description: `${vs.length} variable(s)`, rawStructure: vs.map(v => v.description).join(', ') });
  const algo = algorithms.find(([pattern]) => pattern.test(code.toLowerCase()));
  const mainFunctionFound = /\bint\s+main\s*\([^)]*\)\s*\{/.test(code);
  const unsupported = [...inputs].filter(name => !declarations.has(name));
  const error = !mainFunctionFound ? 'No main function found' : unsupported.length ? `Cannot infer input declaration: ${unsupported.join(', ')}` : undefined;
  return { success: !error, error, variables, constraints, edgeCases, inputStructure: structure(ordered), outputStructure: structure(variables.filter(v => v.isOutput)), includes: sourceCode.match(/#include\s*[<"][^>"\n]+[>"]/g) ?? [], algorithm: algo?.[1] ?? 'Unknown', complexity: algo?.[2] ?? 'Unknown', mainFunctionFound };
}
