import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false,
  variant = 'default',
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const variantColors = {
    default: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
  };

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={clsx('progress-bar w-full bg-secondary/50 rounded-full overflow-hidden', className)}>
      <div
        className={clsx(
          'progress-fill transition-all duration-300 ease-out rounded-full',
          variantColors[variant],
          sizeStyles[size]
        )}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      {showLabel && (
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>{Math.round(percentage)}%</span>
          <span>{value}/{max}</span>
        </div>
      )}
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function CircularProgress({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  className,
  showLabel = false,
  variant = 'default',
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: 'stroke-accent',
    success: 'stroke-success',
    warning: 'stroke-warning',
    error: 'stroke-error',
  };

  return (
    <div className={clsx('circular-progress relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="stroke-primary/20"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={clsx('transition-all duration-500 ease-out', variantColors[variant])}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-mono font-medium text-primary">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}