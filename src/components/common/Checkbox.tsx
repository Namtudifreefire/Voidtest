import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: string;
  description?: string;
  onChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, onChange, ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.target.checked);
      }
    };

    return (
      <label className={clsx('checkbox-wrapper', className)} htmlFor={checkboxId}>
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className="sr-only peer"
          onChange={handleChange}
          {...props}
        />
        <div className="relative w-5 h-5 border border-primary rounded-sm flex items-center justify-center peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-checked:bg-accent peer-checked:border-accent peer-disabled:opacity-50 transition-colors">
          <svg className="w-3.5 h-3.5 text-inverse peer-checked:block peer-unchecked:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <span className="checkbox-label">{label}</span>
          {description && <p className="text-xs text-muted mt-1">{description}</p>}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function RadioGroup({ name, value, onChange, options, direction = 'vertical', className }: RadioGroupProps) {
  return (
    <div className={clsx('radio-group', direction === 'horizontal' ? 'flex gap-6' : 'flex flex-col gap-3', className)} role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <label key={opt.value} className="radio-wrapper">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only peer"
          />
          <div className="relative w-5 h-5 border border-primary rounded-full flex items-center justify-center peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-checked:border-accent peer-disabled:opacity-50 transition-colors">
            <div className="w-2.5 h-2.5 rounded-full bg-accent peer-checked:block peer-unchecked:hidden"></div>
          </div>
          <div>
            <span className="radio-label">{opt.label}</span>
            {opt.description && <p className="text-xs text-muted mt-1">{opt.description}</p>}
          </div>
        </label>
      ))}
    </div>
  );
}