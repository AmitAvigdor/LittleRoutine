import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/types';
import { AlertTriangle, Play, Square, Trash2 } from 'lucide-react';

interface StaleTimerModalProps {
  isOpen: boolean;
  duration: number; // in seconds
  activityName: string; // e.g., "sleep", "walk", "play time"
  onContinue: () => void;
  onStopAndSave: () => void;
  onDiscard: () => void;
}

export function StaleTimerModal({
  isOpen,
  duration,
  activityName,
  onContinue,
  onStopAndSave,
  onDiscard,
}: StaleTimerModalProps) {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.resolvedLanguage === 'he' || i18n.language === 'he';
  const formattedDuration = (() => {
    if (!isHebrew) return formatDuration(duration);

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return minutes > 0 ? `${hours} שע׳ ${minutes} דק׳` : `${hours} שע׳`;
    }
    if (minutes > 0) {
      return seconds > 0 ? `${minutes} דק׳ ${seconds} שנ׳` : `${minutes} דק׳`;
    }
    return `${seconds} שנ׳`;
  })();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('staleTimer.title')}</h3>
            <p className="text-sm text-gray-500">{formattedDuration}</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          {t('staleTimer.message', { activity: activityName })}
        </p>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={onStopAndSave}
            className="w-full justify-center"
          >
            <Square className="w-4 h-4 mr-2" />
            {t('staleTimer.stopAndSave')}
          </Button>

          <Button
            variant="outline"
            onClick={onContinue}
            className="w-full justify-center"
          >
            <Play className="w-4 h-4 mr-2" />
            {t('staleTimer.continueTimer')}
          </Button>

          <Button
            variant="ghost"
            onClick={onDiscard}
            className="w-full justify-center text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('staleTimer.discard')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Threshold for showing the stale timer modal (5 hours in seconds)
export const STALE_TIMER_THRESHOLD = 5 * 60 * 60;
