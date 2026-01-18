import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { BottomNav } from './BottomNav';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import { subscribeToBabies, subscribeToSettings, getOrCreateSettings } from '@/lib/firestore';
import { clsx } from 'clsx';

export function MainLayout() {
  const { user } = useAuth();
  const { setBabies, setSettings, nightMode } = useAppStore();

  // Subscribe to babies and settings
  useEffect(() => {
    if (!user) {
      console.log('MainLayout: No user, skipping subscriptions');
      return;
    }

    console.log('MainLayout: Setting up subscriptions for user:', user.uid);

    // Subscribe to babies
    const unsubscribeBabies = subscribeToBabies(user.uid, (babies) => {
      console.log('MainLayout: Received babies:', babies);
      setBabies(babies);
    });

    // Get or create settings, then subscribe
    const initSettings = async () => {
      console.log('MainLayout: Initializing settings...');
      await getOrCreateSettings(user.uid);
    };
    initSettings();

    const unsubscribeSettings = subscribeToSettings(user.uid, (settings) => {
      console.log('MainLayout: Received settings:', settings);
      setSettings(settings);
    });

    return () => {
      console.log('MainLayout: Cleaning up subscriptions');
      unsubscribeBabies();
      unsubscribeSettings();
    };
  }, [user, setBabies, setSettings]);

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
