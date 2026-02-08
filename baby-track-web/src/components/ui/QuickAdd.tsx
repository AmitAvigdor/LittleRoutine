import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface QuickAddAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

interface QuickAddProps {
  open: boolean;
  onClose: () => void;
  actions: QuickAddAction[];
}

export function QuickAdd({ open, onClose, actions }: QuickAddProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Close quick add"
      />
      <div className="absolute bottom-0 left-0 right-0">
        <div className="max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl p-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Add</h3>
              <p className="text-xs text-gray-500">Fast shortcuts to common actions</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
              aria-label="Close quick add"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-2xl border border-gray-100',
                  'bg-white shadow-sm hover:shadow-md transition-all text-left'
                )}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                  style={{ background: action.color }}
                >
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                  {action.description && (
                    <p className="text-xs text-gray-500 truncate">{action.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
