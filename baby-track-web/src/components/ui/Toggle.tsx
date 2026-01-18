import { clsx } from 'clsx';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
}: ToggleProps) {
  const sizeConfig = {
    sm: { track: 'w-8 h-5', thumb: 'w-3.5 h-3.5', translate: 'translate-x-3.5' },
    md: { track: 'w-11 h-6', thumb: 'w-4 h-4', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-5 h-5', translate: 'translate-x-7' },
  };

  const config = sizeConfig[size];

  return (
    <label
      className={clsx(
        'flex items-center gap-3 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'relative inline-flex shrink-0 rounded-full transition-colors duration-200',
          config.track,
          checked ? 'bg-primary-500' : 'bg-gray-200'
        )}
      >
        <span
          className={clsx(
            'absolute top-1 left-1 bg-white rounded-full shadow transition-transform duration-200',
            config.thumb,
            checked && config.translate
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-gray-900">{label}</span>
          )}
          {description && (
            <span className="text-xs text-gray-500">{description}</span>
          )}
        </div>
      )}
    </label>
  );
}

// Radio Group
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  direction?: 'horizontal' | 'vertical';
}

export function RadioGroup({
  options,
  value,
  onChange,
  name,
  direction = 'vertical',
}: RadioGroupProps) {
  return (
    <div
      className={clsx(
        'flex gap-3',
        direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <label
            key={option.value}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200',
              isSelected
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
            style={isSelected && option.color ? {
              borderColor: option.color,
              backgroundColor: `${option.color}10`,
            } : undefined}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <div
              className={clsx(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                isSelected ? 'border-primary-500' : 'border-gray-300'
              )}
              style={isSelected && option.color ? { borderColor: option.color } : undefined}
            >
              {isSelected && (
                <div
                  className="w-2.5 h-2.5 rounded-full bg-primary-500"
                  style={option.color ? { backgroundColor: option.color } : undefined}
                />
              )}
            </div>
            {option.icon && (
              <span style={{ color: option.color }}>{option.icon}</span>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {option.label}
              </span>
              {option.description && (
                <span className="text-xs text-gray-500">{option.description}</span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
