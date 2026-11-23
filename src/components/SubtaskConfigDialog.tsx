import { useState } from 'react';
import { Button } from './common/Button';
import { Input, Select } from './common/Input';
import { Dialog } from './common/Dialog';
import type { SubtaskConfig } from '../types';
import { validateSubtaskLimits } from '../utils/validation';

interface Props { isOpen: boolean; onClose(): void; onConfirm(items: SubtaskConfig[]): void; initialSubtasks: SubtaskConfig[]; totalTestCount: number }
export function SubtaskConfigDialog({ isOpen, onClose, onConfirm, initialSubtasks, totalTestCount }: Props) {
  const [items, setItems] = useState<SubtaskConfig[]>(() => {
    const source = initialSubtasks.length ? initialSubtasks : [{ id: 1, name: 'Default', limits: {}, testCount: totalTestCount, generationStrategy: 'mixed' }];
    const use = source.slice(0, totalTestCount);
    if (use.every(s => s.testCount > 0) && use.reduce((n,s) => n+s.testCount,0) === totalTestCount) return use;
    return use.map((s,i) => ({...s, testCount: Math.floor(totalTestCount/use.length) + Number(i < totalTestCount%use.length)}));
  });
  const [expanded, setExpanded] = useState<number | null>(null);
  const total = items.reduce((n,s) => n+s.testCount,0);
  const errors = items.flatMap(s => validateSubtaskLimits(s.limits).errors.map(e => `${s.name}: ${e}`));
  const change = (id: number, patch: Partial<SubtaskConfig>) => setItems(prev => prev.map(s => s.id === id ? {...s,...patch} : s));
  function distribute(list: SubtaskConfig[]) { setItems(list.map((s,i) => ({...s, testCount: Math.floor(totalTestCount/list.length) + Number(i < totalTestCount%list.length)}))); }
  function move(i: number, by: number) { const list = [...items]; [list[i],list[i+by]] = [list[i+by],list[i]]; setItems(list); }
  const valid = !errors.length && total === totalTestCount && items.every(s => Number.isSafeInteger(s.testCount) && s.testCount > 0);
  return <Dialog isOpen={isOpen} onClose={onClose} title="Configure Subtasks" maxWidth="xl" footer={<div className="dialog-footer"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={() => onConfirm(items)}>Confirm &amp; Generate</Button></div>}>
    <div className="flex items-center justify-between mb-4"><span>Allocated: {total} / {totalTestCount}</span><Button variant="secondary" onClick={() => distribute(items)}>Auto Distribute</Button></div>
    {errors.map((e,i) => <p role="alert" key={i} className="text-error">{e}</p>)}
    <div className="space-y-3 max-h-[50vh] overflow-y-auto">{items.map((s,i) => <div key={s.id} className="p-3 bg-secondary rounded-lg space-y-2">
      <div className="flex flex-wrap gap-2"><Input label="Subtask name" id={`name-${s.id}`} value={s.name} onChange={e => change(s.id,{name:e.target.value})} />
        <Input label="Tests" id={`count-${s.id}`} type="number" min={1} max={totalTestCount} value={s.testCount} onChange={e => change(s.id,{testCount:Number(e.target.value)})} />
        <Select label="Strategy" id={`strategy-${s.id}`} value={s.generationStrategy} options={['mixed','boundary','random','pattern','constraint'].map(value => ({value,label:value}))} onChange={e => change(s.id,{generationStrategy:e.target.value})} /></div>
      <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setExpanded(expanded===s.id?null:s.id)}>Limits</Button><Button variant="ghost" disabled={!i} onClick={() => move(i,-1)}>Move up</Button><Button variant="ghost" disabled={i===items.length-1} onClick={() => move(i,1)}>Move down</Button><Button variant="ghost" disabled={items.length===1} onClick={() => distribute(items.filter(x => x.id!==s.id))}>Remove</Button></div>
      {expanded===s.id && (Object.keys(s.limits).length ? Object.entries(s.limits).map(([v,r]) => <div className="flex gap-2" key={v}>{(['min','max'] as const).map(k => <Input key={k} id={`${s.id}-${v}-${k}`} label={`${v} ${k}`} type="number" value={r[k]} onChange={e => change(s.id,{limits:{...s.limits,[v]:{...r,[k]:Number(e.target.value)}}})}/>)}</div>) : <p>No custom limits.</p>)}
    </div>)}</div>
    <Button className="mt-4" variant="secondary" disabled={items.length >= Math.min(10,totalTestCount)} onClick={() => {const id=Math.max(0,...items.map(s=>s.id))+1; distribute([...items,{id,name:`Subtask ${id}`,limits:{},testCount:1,generationStrategy:'mixed'}]);}}>Add Subtask</Button>
  </Dialog>;
}
