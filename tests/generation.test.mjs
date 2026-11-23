import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Run with node --test tests/generation.test.mjs; no Electron window is needed.
async function loadTS(relative) {
  const text = await readFile(new URL(relative, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { analyzeCode } = await loadTS('../electron/ipc/code-analysis.ts');
const { generateTestCases } = await loadTS('../electron/ipc/test-generation.ts');
const { generateAndExport } = await loadTS('../src/utils/generationRun.ts');
const logger = { success() {}, info() {}, error() {} };
const namingConfig = { format: 'numeric', prefix: '', padding: 2, startNumber: 1 };
async function config(code, limits = {}) {
  const analysis = await analyzeCode(code, logger);
  assert.ok(analysis.success, analysis.error);
  return { code, analysis, mode: 'input-output', aiAnalysis: { seed: 47 }, namingConfig, totalTestCount: 12, subtasks: [{ id: 1, name: 'Small', testCount: 12, limits, generationStrategy: 'mixed' }] };
}
async function inputs(cfg) {
  const result = await generateTestCases(cfg, logger);
  assert.ok(result.success, result.errors.join('\n'));
  assert.equal(result.testCases.length, cfg.totalTestCount);
  return result.testCases.map(c => c.input);
}
test('repo addition sample: cin order, seeded inputs and per-subtask bounds', async () => {
  const source = await readFile(new URL('../test_add.cpp', import.meta.url), 'utf8');
  const cfg = await config(source, { a: { min: 5, max: 7 }, b: { min: -2, max: -1 } });
  assert.deepEqual(cfg.analysis.inputStructure.variables.map(v => v.name), ['a', 'b']);
  const first = await inputs(cfg);
  assert.deepEqual(first, await inputs(cfg));
  for (const row of first) { const cols = row.split(/\s+/).map(Number); assert.equal(cols.length, 2); assert.ok(cols[0] >= 5 && cols[0] <= 7 && cols[1] >= -2 && cols[1] <= -1); }
});
test('honors strict float and double bounds and scientific powers in comments', async () => {
  for (const type of ['float', 'double']) {
    const cfg = await config(`int main(){ ${type} x; int n; // 1 < x < 5; 1 <= n <= 10^5\n cin >> x >> n; }`);
    const c = cfg.analysis.constraints.find(c => c.variable === 'n');
    assert.equal(c.min, 1); assert.equal(c.max, 100000);
    for (const row of await inputs(cfg)) { const value = Number(row.split(' ')[0]); const x = type === 'float' ? Math.fround(value) : value; assert.ok(x > 1 && x < 5); }
  }
});
test('declared vector lengths match generated element counts', async () => {
  const cfg = await config('int main(){ int n,m; cin >> n >> m; vector<int> a(n),b(m); for(int i=0;i<n;++i)cin>>a[i]; for(int i=0;i<m;++i)cin>>b[i]; }', { n:{min:0,max:4}, m:{min:1,max:4}, a:{min:1,max:1}, b:{min:2,max:2} });
  for (const row of await inputs(cfg)) { const [n,m,...rest] = row.split(' ').map(Number); assert.deepEqual(rest, [...Array(n).fill(1), ...Array(m).fill(2)]); }
});
test('export sends a cloneable batch, writes once, and honors ZIP-on-error', async () => {
  const cfg = await config('int main(){ int a; cin >> a; }');
  for (const zipOnError of [false, true]) {
    let writes = 0, archives = 0;
    const api = { test:{generate:c=>generateTestCases(c,logger)}, compile:{check:async()=>({success:true,executablePath:'fixture'})}, execute:{batch:async payload=>{
      const clone = structuredClone(payload); assert.equal(clone.timeout, 750);
      return { results: clone.testCases.map((c,i)=>i===0?{success:false,timedOut:true,error:'Timeout',executionTime:750}:{success:true,output:c.input,executionTime:1}) };
    }}, file:{writeTestFiles:async payload=>{ writes++; assert.equal(payload.overwrite,false); assert.equal(payload.testCases[0].status,'timeout'); assert.equal(payload.testCases[1].output,payload.testCases[1].input); return {success:true}; },createZip:async payload=>{archives++; assert.match(payload.errorReport,/Test 1: Timeout/);return {success:true};}} };
    const result = await generateAndExport(api,cfg,{outputDir:'output',timeout:750,overwrite:false,zip:true,zipOnError},()=>{});
    assert.equal(writes,1); assert.equal(archives,Number(zipOnError)); assert.equal(result.preview.failedCount,1); assert.equal(result.preview.successCount,11);
  }
});
