import { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[5px] border-transparent border-t-tertiary',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[5px] border-transparent border-b-tertiary',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[5px] border-transparent border-l-tertiary',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[5px] border-transparent border-r-tertiary',
  };

  return (
    <div className="relative inline-block" style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <div
        className="absolute z-50 whitespace-nowrap text-xs px-2 py-1 rounded-sm shadow-lg opacity-0 invisible transition-all duration-150 pointer-events-none"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
          [positionStyles[position].split(' ')[0]]: positionStyles[position].split(' ')[1],
          [positionStyles[position].split(' ')[2]]: positionStyles[position].split(' ')[3],
        }}
        role="tooltip"
      >
        {content}
        <div
          className="absolute w-0 h-0 border-solid"
          style={{
            borderWidth: '5px',
            [arrowStyles[position].split(' ')[0]]: arrowStyles[position].split(' ')[1],
            [arrowStyles[position].split(' ')[2]]: arrowStyles[position].split(' ')[3],
            [arrowStyles[position].split(' ')[4]]: arrowStyles[position].split(' ')[5],
          }}
        />
      </div>
    </div>
  );
}