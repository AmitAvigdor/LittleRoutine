import { Outlet } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { onSnapshotsInSync } from 'firebase/firestore';
import { BottomNav } from './BottomNav';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import { useHomeDataSync } from '@/features/dashboard/homeDataSync';
import { subscribeToBabies, subscribeToSettings, getOrCreateSettings } from '@/lib/firestore';
import { db } from '@/lib/firestoreClient';
import { useNotifications } from '@/hooks/useNotifications';
import { clsx } from 'clsx';

export function MainLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    setBabies,
    setSettings,
    selectedBabyId,
    nightMode,
    isLoadingBabies,
    isLoadingSettings,
    setLoadingBabies,
    setLoadingSettings,
    setPendingWrites,
    dataRefreshVersion,
  } = useAppStore();

  // Initialize notifications/reminders system
  useNotifications();
  useHomeDataSync(user?.uid ?? null, selectedBabyId);

  useEffect(() => {
    return onSnapshotsInSync(db, () => {
      setPendingWrites(false);
    });
  }, [setPendingWrites]);

  useEffect(() => {
    document.documentElement.classList.toggle('night-mode-root', nightMode);

    return () => {
      document.documentElement.classList.remove('night-mode-root');
    };
  }, [nightMode]);

  // Subscribe to babies and settings
  useEffect(() => {
    if (!user) {
      return;
    }

    // Reset loading states when user changes
    setLoadingBabies(true);
    setLoadingSettings(true);

    // Subscribe to babies
    const unsubscribeBabies = subscribeToBabies(user.uid, (babies) => {
      setBabies(babies);
    });

    // Get or create settings, then subscribe
    const initSettings = async () => {
      await getOrCreateSettings(user.uid);
    };
    initSettings();

    const unsubscribeSettings = subscribeToSettings(user.uid, (settings) => {
      setSettings(settings);
    });

    return () => {
      unsubscribeBabies();
      unsubscribeSettings();
    };
  }, [user, setBabies, setSettings, setLoadingBabies, setLoadingSettings]);

  const isLoading = isLoadingBabies || isLoadingSettings;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">{t('common.loadingData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'app-shell min-h-screen',
        nightMode && 'night-mode'
      )}
    >
      <main className="max-w-lg mx-auto">
        <Suspense
          fallback={
            <div
              className="min-h-[calc(100dvh-5rem)] flex items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <div className="text-center text-gray-500">
                <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
                <p>{t('common.loading')}</p>
              </div>
            </div>
          }
        >
          <Outlet key={dataRefreshVersion} />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
