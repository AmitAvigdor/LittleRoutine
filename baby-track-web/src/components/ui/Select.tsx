import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  color?: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, onChange, value, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={clsx(
              'w-full rounded-xl border-2 bg-white px-4 py-2.5 text-gray-900',
              'appearance-none cursor-pointer',
              'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
              'transition-all duration-200',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Segmented Control (like iOS)
interface SegmentedControlProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
}: SegmentedControlProps) {
  return (
    <div
      className={clsx(
        'inline-flex rounded-xl bg-gray-100 p-1',
        fullWidth && 'w-full'
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              'flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-200',
              fullWidth && 'flex-1',
              {
                'px-3 py-1.5 text-sm': size === 'sm',
                'px-4 py-2 text-base': size === 'md',
                'px-5 py-2.5 text-lg': size === 'lg',
              },
              isSelected
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
            style={isSelected && option.color ? { color: option.color } : undefined}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Chip Select (multiple selection)
interface ChipSelectProps {
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
}

export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
              'border-2 transition-all duration-200',
              isSelected
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            )}
            style={isSelected && option.color ? {
              borderColor: option.color,
              backgroundColor: `${option.color}15`,
              color: option.color,
            } : undefined}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
