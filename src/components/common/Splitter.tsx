import { useRef, useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { GripVertical, GripHorizontal } from 'lucide-react';

interface SplitterProps {
  direction: 'horizontal' | 'vertical';
  minSize?: number;
  maxSize?: number;
  defaultSize?: number;
  onChange?: (size: number) => void;
  children: [React.ReactNode, React.ReactNode];
  className?: string;
}

export function Splitter({ direction, minSize = 100, maxSize, defaultSize = 300, onChange, children, className }: SplitterProps) {
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);
  const startSize = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSize(defaultSize);
  }, [defaultSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = size;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction, size]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPos.current;
    const newSize = Math.max(minSize, Math.min(maxSize || Infinity, startSize.current + delta));
    setSize(newSize);
    onChange?.(newSize);
  }, [isDragging, direction, minSize, maxSize, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const [first, second] = children;

  if (direction === 'horizontal') {
    return (
      <div className={clsx('flex h-full', className)} ref={containerRef}>
        <div className="flex-1 min-w-0 overflow-hidden" style={{ flexBasis: `${size}px`, flexGrow: 0, flexShrink: 0 }}>
          {first}
        </div>
        <button
          className={clsx('splitter splitter-vertical', isDragging && 'bg-accent')}
          onMouseDown={handleMouseDown}
          aria-label="Resize panel"
          tabIndex={0}
          role="separator"
          aria-orientation="vertical"
        >
          <GripVertical className="w-4 h-4 mx-auto text-muted" />
        </button>
        <div className="flex-1 min-w-0 overflow-hidden">
          {second}
        </div>
      </div>
    );
  } else {
    return (
      <div className={clsx('flex flex-col h-full', className)} ref={containerRef}>
        <div className="flex-1 min-h-0 overflow-hidden" style={{ flexBasis: `${size}px`, flexGrow: 0, flexShrink: 0 }}>
          {first}
        </div>
        <button
          className={clsx('splitter splitter-horizontal', isDragging && 'bg-accent')}
          onMouseDown={handleMouseDown}
          aria-label="Resize panel"
          tabIndex={0}
          role="separator"
          aria-orientation="horizontal"
        >
          <GripHorizontal className="w-4 h-4 mx-auto text-muted" />
        </button>
        <div className="flex-1 min-h-0 overflow-hidden">
          {second}
        </div>
      </div>
    );
  }
}