import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-1.5',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2', className)} role="status" aria-live="polite">
      <svg className={clsx('spinner', sizeClasses[size])} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="var(--border-primary)" strokeWidth="3" />
        <path
          d="M12 2C12 2 12 2 12 2"
          stroke="var(--bg-accent)"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      {label && <span className="text-sm text-secondary">{label}</span>}
    </div>
  );
}

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({ isVisible, message, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isVisible && (
        <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-panel border border-primary rounded-xl p-8 text-center min-w-[200px]">
            <Spinner size="lg" label={message} />
          </div>
        </div>
      )}
    </div>
  );
}