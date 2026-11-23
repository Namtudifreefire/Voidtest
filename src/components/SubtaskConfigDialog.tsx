import { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { Plus, Trash2, ArrowUp, ArrowDown, Minimize2, Maximize2, Info, RotateCcw } from 'lucide-react';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Select } from './common/Input';
import { Dialog } from './common/Dialog';
import { SubtaskConfig } from '../types';
import { validateSubtaskLimits } from '../utils/validation';

interface SubtaskConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subtasks: SubtaskConfig[]) => void;
  initialSubtasks: SubtaskConfig[];
  totalTestCount: number;
}

export function SubtaskConfigDialog({
  isOpen,
  onClose,
  onConfirm,
  initialSubtasks,
  totalTestCount,
}: SubtaskConfigDialogProps) {
  const [subtasks, setSubtasks] = useState<SubtaskConfig[]>(() =>
    initialSubtasks.length > 0
      ? initialSubtasks
      : [
          {
            id: 1,
            name: 'Default',
            limits: {},
            testCount: totalTestCount,
            generationStrategy: 'mixed',
          },
        ]
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Auto-distribute test counts when totalTestCount changes
  useEffect(() => {
    if (subtasks.length > 0) {
      const totalAllocated = subtasks.reduce((sum, s) => sum + s.testCount, 0);
      if (totalAllocated !== totalTestCount) {
        // Use largest remainder method (Hamilton method) for fair apportionment
        const ratio = totalTestCount / Math.max(1, totalAllocated);
        const exactShares = subtasks.map(s => s.testCount * ratio);
        const floorShares = exactShares.map(s => Math.max(1, Math.floor(s)));
        const remainders = exactShares.map((s, i) => ({ index: i, remainder: s - floorShares[i] }));

        // Sort by remainder descending
        remainders.sort((a, b) => b.remainder - a.remainder);

        // Distribute remaining tests to largest remainders
        let remaining = totalTestCount - floorShares.reduce((sum, s) => sum + s, 0);
        for (let i = 0; i < remaining && i < remainders.length; i++) {
          floorShares[remainders[i].index]++;
        }

        const newSubtasks = subtasks.map((s, i) => ({
          ...s,
          testCount: floorShares[i],
        }));
        setSubtasks(newSubtasks);
      }
    }
  }, [totalTestCount, subtasks]);

  const addSubtask = useCallback(() => {
    const newId = Math.max(0, ...subtasks.map((s) => s.id)) + 1;
    const remainingTests = totalTestCount - subtasks.reduce((sum, s) => sum + s.testCount, 0);
    setSubtasks([
      ...subtasks,
      {
        id: newId,
        name: `Subtask ${newId}`,
        limits: {},
        testCount: Math.max(1, remainingTests),
        generationStrategy: 'mixed',
      },
    ]);
  }, [subtasks, totalTestCount]);

  const removeSubtask = useCallback((id: number) => {
    if (subtasks.length <= 1) return;
    const removed = subtasks.find(s => s.id === id);
    const remainingTests = removed ? removed.testCount : 0;
    setSubtasks(prev => {
      const filtered = prev.filter((s) => s.id !== id);
      // Redistribute removed tests to remaining subtasks
      if (filtered.length > 0 && remainingTests > 0) {
        const perSubtask = Math.floor(remainingTests / filtered.length);
        const remainder = remainingTests % filtered.length;
        return filtered.map((s, i) => ({
          ...s,
          testCount: s.testCount + perSubtask + (i < remainder ? 1 : 0),
        }));
      }
      return filtered;
    });
  }, [subtasks]);

  const updateSubtask = useCallback((id: number, updates: Partial<SubtaskConfig>) => {
    setSubtasks(subtasks.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, [subtasks]);

  const moveSubtask = useCallback((id: number, direction: 'up' | 'down') => {
    const index = subtasks.findIndex((s) => s.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subtasks.length) return;
    const newSubtasks = [...subtasks];
    [newSubtasks[index], newSubtasks[newIndex]] = [newSubtasks[newIndex], newSubtasks[index]];
    setSubtasks(newSubtasks);
  }, [subtasks]);

  const autoDistribute = useCallback(() => {
    if (subtasks.length === 0) return;
    const perSubtask = Math.floor(totalTestCount / subtasks.length);
    const remainder = totalTestCount % subtasks.length;
    const newSubtasks = subtasks.map((s, i) => {
      return {
        ...s,
        testCount: perSubtask + (i < remainder ? 1 : 0),
      };
    });
    setSubtasks(newSubtasks);
  }, [subtasks, totalTestCount]);

  // Convert limits to validation format
  const limitsForValidation = subtasks.reduce((acc, s) => {
    for (const [v, r] of Object.entries(s.limits)) {
      acc[v] = r;
    }
    return acc;
  }, {} as Record<string, { min: number; max: number }>);
  const validation = validateSubtaskLimits(limitsForValidation);

  const totalAllocated = subtasks.reduce((sum, s) => sum + s.testCount, 0);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Subtasks"
      maxWidth="xl"
      footer={
        <div className="dialog-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(subtasks)}
            disabled={validation.errors.length > 0 || totalAllocated !== totalTestCount}
          >
            Confirm & Generate
          </Button>
        </div>
      }
    >
      {validation.errors.length > 0 && (
        <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
          <strong>Validation Errors:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            {validation.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 p-3 bg-secondary rounded-lg">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium">Total Test Count: {totalTestCount}</span>
          <span className={clsx('font-mono', totalAllocated !== totalTestCount && 'text-warning')}>
            Allocated: {totalAllocated} / {totalTestCount}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={autoDistribute} disabled={subtasks.length === 0} title="Auto-distribute evenly">
            <RotateCcw className="w-4 h-4" />
            <span>Auto Distribute</span>
          </Button>
          <div className="text-xs text-muted ml-auto">
            Adjust test counts per subtask. Total must equal {totalTestCount}.
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {subtasks.map((subtask, index) => {
          const isExpanded = expandedId === subtask.id;
          return (
            <div key={subtask.id} className="subtask-row">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => moveSubtask(subtask.id, 'up')} disabled={index === 0} aria-label="Move up">
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => moveSubtask(subtask.id, 'down')} disabled={index === subtasks.length - 1} aria-label="Move down">
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setExpandedId(isExpanded ? null : subtask.id)} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeSubtask(subtask.id)} disabled={subtasks.length <= 1} aria-label="Remove subtask">
                  <Trash2 className="w-4 h-4 text-error" />
                </Button>
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Input
                  type="text"
                  label=""
                  value={subtask.name}
                  onChange={(e) => updateSubtask(subtask.id, { name: e.target.value })}
                  placeholder="Subtask name"
                  className="w-48"
                />
                <Input
                  type="number"
                  label=""
                  value={subtask.testCount}
                  onChange={(e) => updateSubtask(subtask.id, { testCount: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={totalTestCount}
                  className="w-24"
                />
                <Select
                  label=""
                  value={subtask.generationStrategy}
                  onChange={(e) => updateSubtask(subtask.id, { generationStrategy: e.target.value })}
                  options={[
                    { value: 'mixed', label: 'Mixed' },
                    { value: 'boundary', label: 'Boundary' },
                    { value: 'random', label: 'Random' },
                    { value: 'pattern', label: 'Pattern' },
                    { value: 'constraint', label: 'Constraint' },
                  ]}
                  className="w-36"
                />
              </div>

              <Button variant="ghost" size="icon" onClick={() => setExpandedId(isExpanded ? null : subtask.id)} className="ml-2">
                <Info className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {subtasks.length < 10 && (
        <Button variant="secondary" onClick={addSubtask} className="w-full mt-4" fullWidth>
          <Plus className="w-4 h-4" />
          <span>Add Subtask</span>
        </Button>
      )}

      <div className="mt-4 p-3 bg-secondary rounded-lg text-sm text-muted">
        <strong>Generation Strategies:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li><strong>Mixed:</strong> Balanced combination of boundary, random, and pattern tests</li>
          <li><strong>Boundary:</strong> Focus on min/max values, zero, and edge cases</li>
          <li><strong>Random:</strong> Uniformly random values within limits</li>
          <li><strong>Pattern:</strong> Structured patterns (sorted, reverse, duplicates)</li>
          <li><strong>Constraint:</strong> Based on detected code constraints</li>
        </ul>
      </div>
    </Dialog>
  );
}