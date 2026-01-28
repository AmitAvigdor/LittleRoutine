import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-2xl bg-white border border-gray-100',
          {
            // Variants
            'shadow-sm': variant === 'default',
            'shadow-lg': variant === 'elevated',
            'border-2 border-gray-200': variant === 'outline',
            // Padding
            'p-0': padding === 'none',
            'p-3': padding === 'sm',
            'p-5': padding === 'md',
            'p-6': padding === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  emoji?: string;
}

export function CardHeader({ title, subtitle, action, emoji, className, ...props }: CardHeaderProps) {
  return (
    <div className={clsx('flex items-center justify-between mb-5', className)} {...props}>
      <div className="flex items-center gap-2">
        {emoji && <span className="text-xl">{emoji}</span>}
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// Stat Card
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  emoji?: string;
  color?: string;
  trend?: { value: number; label: string };
}

export function StatCard({ label, value, icon, emoji, color, trend }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      {color && (
        <div
          className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl"
          style={{ backgroundColor: color }}
        />
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={clsx(
              'text-xs font-medium mt-2',
              trend.value >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        {(icon || emoji) && (
          <div
            className="p-3 rounded-xl"
            style={{ backgroundColor: color ? `${color}15` : '#f3f4f6' }}
          >
            {emoji ? <span className="text-2xl">{emoji}</span> : icon}
          </div>
        )}
      </div>
    </Card>
  );
}
