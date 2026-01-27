import { WifiOff, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/stores/appStore';

export function OfflineIndicator() {
  const { isOnline, hasPendingWrites } = useAppStore();

  // Don't show anything if online and no pending writes
  if (isOnline && !hasPendingWrites) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md safe-top">
          <WifiOff className="w-4 h-4" />
          <span>You're offline. Changes will sync when connected.</span>
        </div>
      )}

      {/* Sync Indicator - show when online but has pending writes */}
      {isOnline && hasPendingWrites && (
        <div className="bg-blue-500 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium safe-top">
          <RefreshCw className={clsx('w-3 h-3', 'animate-spin')} />
          <span>Syncing changes...</span>
        </div>
      )}
    </div>
  );
}
