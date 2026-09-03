import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface UndoActivityDialogProps {
  activityLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function UndoActivityDialog({
  activityLabel,
  busy,
  onCancel,
  onConfirm,
}: UndoActivityDialogProps) {
  const { t } = useTranslation();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="undo-activity-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id="undo-activity-title" className="text-lg font-bold text-gray-900">
                {t('dashboard.confirmUndoTitle')}
              </h3>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {t('dashboard.confirmUndoDescription', { activity: activityLabel })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            {t('dashboard.keepActivity')}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <LoaderCircle className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="me-2 h-4 w-4" />
            )}
            {busy ? t('common.working') : t('dashboard.confirmUndo')}
          </Button>
        </div>
      </div>
    </div>
  );
}
