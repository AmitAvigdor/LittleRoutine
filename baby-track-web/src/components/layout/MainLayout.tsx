import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { BottomNav } from './BottomNav';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import { subscribeToBabies, subscribeToSettings, getOrCreateSettings } from '@/lib/firestore';
import { clsx } from 'clsx';

export function MainLayout() {
  const { user } = useAuth();
  const {
    setBabies,
    setSettings,
    nightMode,
    isLoadingBabies,
    isLoadingSettings,
    setLoadingBabies,
    setLoadingSettings,
  } = useAppStore();

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
          <p className="text-lg">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'min-h-screen pb-20',
        nightMode && 'night-mode'
      )}
    >
      <main className="max-w-lg mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
