import { clsx } from 'clsx';

interface QuickTimeChipsProps {
  onSelect: (minutesAgo: number) => void;
  className?: string;
  options?: number[];
}

export function QuickTimeChips({
  onSelect,
  className,
  options = [0, 5, 10, 15, 30],
}: QuickTimeChipsProps) {
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {options.map((minutes) => (
        <button
          key={minutes}
          type="button"
          onClick={() => onSelect(minutes)}
          className={clsx(
            'px-3 py-1.5 rounded-full text-xs font-semibold',
            'border border-gray-200 bg-white text-gray-600',
            'hover:border-gray-300 hover:text-gray-800'
          )}
        >
          {minutes === 0 ? 'Now' : `-${minutes}m`}
        </button>
      ))}
    </div>
  );
}
