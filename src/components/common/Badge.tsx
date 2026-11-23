import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'pending';
  className?: string;
}

export function Badge({ children, variant = 'info', className }: BadgeProps) {
  return (
    <span className={clsx('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'pending' | 'success' | 'failed' | 'timeout' | 'error';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants = {
    pending: 'pending',
    success: 'success',
    failed: 'error',
    timeout: 'warning',
    error: 'error',
  } as const;

  const labels = {
    pending: 'Pending',
    success: 'Success',
    failed: 'Failed',
    timeout: 'Timeout',
    error: 'Error',
  } as const;

  return (
    <Badge variant={variants[status]} className={className}>
      {labels[status]}
    </Badge>
  );
}