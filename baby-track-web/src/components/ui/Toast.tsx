import { useToastStore, type ToastType } from '@/stores/toastStore';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Undo2 } from 'lucide-react';
import { clsx } from 'clsx';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

const styles: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

const actionStyles: Record<ToastType, string> = {
  success: 'bg-green-600 hover:bg-green-700 text-white',
  error: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  info: 'bg-blue-600 hover:bg-blue-700 text-white',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-center gap-3 p-3 rounded-lg border shadow-lg animate-in fade-in slide-in-from-top-2 duration-200',
            styles[toast.type]
          )}
        >
          <span className={iconStyles[toast.type]}>{icons[toast.type]}</span>
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={clsx(
                'flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors',
                actionStyles[toast.type]
              )}
            >
              <Undo2 className="w-3.5 h-3.5" />
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            className="p-0.5 rounded hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
