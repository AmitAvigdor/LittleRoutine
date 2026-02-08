import { Outlet } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from './BottomNav';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import { subscribeToBabies, subscribeToSettings, getOrCreateSettings, createDiaperChange, createSleepSession } from '@/lib/firestore';
import { useNotifications } from '@/hooks/useNotifications';
import { clsx } from 'clsx';
import { QuickAdd } from '@/components/ui/QuickAdd';
import { toast } from '@/stores/toastStore';
import { useNavigate } from 'react-router-dom';
import { Moon, Droplet, BottleWine, BedDouble, Milk, Circle } from 'lucide-react';

export function MainLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    setBabies,
    setSettings,
    nightMode,
    isLoadingBabies,
    isLoadingSettings,
    setLoadingBabies,
    setLoadingSettings,
    selectedBaby,
  } = useAppStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Initialize notifications/reminders system
  useNotifications();

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

  const quickActions = useMemo(() => {
    const requireContext = async (action: () => Promise<void>) => {
      if (!user || !selectedBaby) {
        toast.error('Select a baby first');
        return;
      }
      await action();
    };

    return [
      {
        id: 'log-wet',
        label: 'Wet Diaper',
        description: 'Log now',
        icon: <Droplet className="w-5 h-5" />,
        color: '#4caf50',
        onClick: () =>
          requireContext(async () => {
            await createDiaperChange(selectedBaby!.id, user!.uid, {
              type: 'wet',
              timestamp: new Date().toISOString(),
              notes: null,
              babyMood: null,
            });
            toast.success('Wet diaper logged');
            setQuickAddOpen(false);
          }),
      },
      {
        id: 'log-full',
        label: 'Full Diaper',
        description: 'Log now',
        icon: <Circle className="w-5 h-5" />,
        color: '#ff9800',
        onClick: () =>
          requireContext(async () => {
            await createDiaperChange(selectedBaby!.id, user!.uid, {
              type: 'full',
              timestamp: new Date().toISOString(),
              notes: null,
              babyMood: null,
            });
            toast.success('Full diaper logged');
            setQuickAddOpen(false);
          }),
      },
      {
        id: 'start-nap',
        label: 'Start Nap',
        description: 'Begin timer',
        icon: <Moon className="w-5 h-5" />,
        color: '#7aa3ff',
        onClick: () =>
          requireContext(async () => {
            await createSleepSession(selectedBaby!.id, user!.uid, {
              startTime: new Date().toISOString(),
              type: 'nap',
            });
            toast.success('Nap started');
            setQuickAddOpen(false);
            navigate('/sleep');
          }),
      },
      {
        id: 'start-night',
        label: 'Start Night',
        description: 'Begin timer',
        icon: <BedDouble className="w-5 h-5" />,
        color: '#3f51b5',
        onClick: () =>
          requireContext(async () => {
            await createSleepSession(selectedBaby!.id, user!.uid, {
              startTime: new Date().toISOString(),
              type: 'night',
            });
            toast.success('Night sleep started');
            setQuickAddOpen(false);
            navigate('/sleep');
          }),
      },
      {
        id: 'feed-breast',
        label: 'Breast Feed',
        description: 'Open feed',
        icon: <Milk className="w-5 h-5" />,
        color: '#ef8fb1',
        onClick: () => {
          setQuickAddOpen(false);
          navigate('/feed?tab=breast');
        },
      },
      {
        id: 'feed-bottle',
        label: 'Bottle Feed',
        description: 'Open bottle',
        icon: <BottleWine className="w-5 h-5" />,
        color: '#e91e63',
        onClick: () => {
          setQuickAddOpen(false);
          navigate('/feed?tab=bottle');
        },
      },
    ];
  }, [navigate, selectedBaby, user]);

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
      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        className={clsx(
          'fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full text-white',
          'shadow-lg shadow-black/20 transition-transform active:scale-95'
        )}
        style={{ background: 'linear-gradient(135deg, #ef8fb1 0%, #a78bfa 100%)' }}
        aria-label="Quick add"
      >
        <span className="text-2xl font-bold leading-none">+</span>
      </button>
      <BottomNav />
      <QuickAdd open={quickAddOpen} onClose={() => setQuickAddOpen(false)} actions={quickActions} />
    </div>
  );
}
