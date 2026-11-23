import type { Logger } from './logger.js';
import type { VariableInfo, SubtaskConfig, CodeAnalysisResult, NamingConfig, TestCase, TestGenerationResult, GenerationStrategy } from './code-analysis.js';
export type { TestGenerationResult } from './code-analysis.js';
export interface TestGenerationConfig {
  code: string; analysis: CodeAnalysisResult; aiAnalysis?: { seed?: number; generationStrategies?: GenerationStrategy[] };
  subtasks: SubtaskConfig[]; mode: 'input-only' | 'input-output'; totalTestCount: number; namingConfig: NamingConfig;
}
function randomStream(seed?: number) {
  if (seed === undefined) return Math.random;
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
const MAX_ELEMENTS = 100000;
export async function generateTestCases(config: TestGenerationConfig, logger: Logger): Promise<TestGenerationResult> {
  const testCases: TestCase[] = [];
  try {
    if (!config.analysis.success) throw new Error('Analyze the source code first');
    const total = config.subtasks.reduce((sum, st) => {
      if (!Number.isSafeInteger(st.testCount) || st.testCount < 0) throw new Error('Invalid subtask test count');
      return sum + st.testCount;
    }, 0);
    if (total < 1 || total > 10000 || total !== config.totalTestCount) throw new Error('Subtask counts must add up to the requested total (1–10000)');
    const variables: VariableInfo[] = (config.analysis.inputStructure?.variables ?? config.analysis.variables).filter(v => v.isInput);
    const random = randomStream(config.aiAnalysis?.seed);
    const pick = <T>(a: T[]) => a[Math.floor(random() * a.length)];
    const integer = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
    let nextId = config.namingConfig.startNumber;
    let bytes = 0;
    for (const st of config.subtasks) {
      if (!st.testCount) continue;
      const params = config.aiAnalysis?.generationStrategies?.find(s => s.subtaskId === st.id)?.parameters ?? {};
      const seen = new Set<string>();
      const specs = variables.map(v => {
        const type = v.type === 'vector' || v.type === 'matrix' ? (v.description.match(/\b(int|long|float|double|char|bool|string)\b/)?.[1] ?? 'int') : v.type;
        const real = type === 'float' || type === 'double';
        const c = config.analysis.constraints.find(c => c.variable === v.name), limit = st.limits[v.name];
        let lo = Math.max(Number(c?.min ?? -Infinity), limit?.min ?? -Infinity), hi = Math.min(Number(c?.max ?? Infinity), limit?.max ?? Infinity);
        if (type === 'bool') { lo = Math.max(0, lo); hi = Math.min(1, hi); }
        if (lo === -Infinity) lo = Math.min(1, hi);
        if (hi === Infinity) hi = Math.max(100, lo);
        if (!real) { lo = Math.ceil(lo); hi = Math.floor(hi); }
        if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) throw new Error(`No valid range for ${v.name} in ${st.name}`);
        const edges = [...new Set([lo, hi, lo + 1, hi - 1, -2, -1, 0, 1, 2])].filter(n => n >= lo && n <= hi && (params.includeZero !== false || n !== 0 || lo === hi));
        return { v, type, real, lo, hi, edges };
      });
      for (let i = 0; i < st.testCount; i++) {
        let input = '';
        for (let attempt = 0; attempt < 50; attempt++) {
          const parts: string[] = [], sizes = new Map<string, number>();
          for (const { v, type, real, lo, hi, edges } of specs) {
            const boundary = st.generationStrategy === 'boundary' || (st.generationStrategy === 'mixed' && random() < Number(params.boundaryRatio ?? 0.3));
            const scalar = (): string => {
              if (type === 'string' || type === 'char') return Array.from({ length: type === 'char' ? 1 : integer(1, 10) }, () => String.fromCharCode(integer(97, 122))).join('');
              return String(boundary && edges.length ? pick(edges) : real ? lo + random() * (hi - lo) : integer(lo, hi));
            };
            if (!v.isArray && v.type !== 'matrix') { const value = scalar(); sizes.set(v.name, Number(value)); parts.push(value); continue; }
            const length = v.lengthVariable ? sizes.get(v.lengthVariable) : v.arrayDimensions?.reduce((a,b) => a*b, 1);
            if (length === undefined || !Number.isSafeInteger(length) || length < 0 || length > MAX_ELEMENTS) throw new Error(`Unsupported or oversized input dimensions for ${v.name}`);
            const values = Array.from({ length }, scalar);
            const pattern = boundary || st.generationStrategy === 'pattern' || (st.generationStrategy === 'mixed' && random() < Number(params.patternRatio ?? 0.2));
            if (pattern && length) {
              const p = pick(['sorted','reverse','duplicate']);
              if (p === 'duplicate') values.fill(values[0]);
              else { values.sort((a,b) => type === 'char' || type === 'string' ? a.localeCompare(b) : Number(a) - Number(b)); if (p === 'reverse') values.reverse(); }
            }
            // cin >> a[i] reads elements, not an implicit length prefix.
            parts.push(values.join(' '));
          }
          input = parts.filter(Boolean).join(' ');
          if (!seen.has(input)) break;
        }
        seen.add(input); bytes += Buffer.byteLength(input);
        if (bytes > 32 * 1024 * 1024) throw new Error('Generated data exceeds 32 MiB; reduce the test count or array sizes');
        testCases.push({ id: nextId++, subtaskId: st.id, status: 'pending', input });
      }
    }
    logger.success('TestGeneration', `Generated ${testCases.length} test cases`);
    return { success: true, outputDir: '', testCases, errors: [] };
  } catch (e) {
    return { success: false, outputDir: '', testCases: [], errors: [e instanceof Error ? e.message : 'Generation failed'] };
  }
}
