import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { ToastContainer } from '@/components/ui/Toast';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAppStore } from '@/stores/appStore';
import { changeAppLanguage } from '@/i18n';

const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const MainLayout = lazy(() => import('@/components/layout/MainLayout').then((module) => ({ default: module.MainLayout })));
const DashboardView = lazy(() => import('@/features/dashboard/DashboardView').then((module) => ({ default: module.DashboardView })));
const FeedingHub = lazy(() => import('@/features/feeding/FeedingHub').then((module) => ({ default: module.FeedingHub })));
const PumpPage = lazy(() => import('@/features/feeding/PumpPage').then((module) => ({ default: module.PumpPage })));
const SleepView = lazy(() => import('@/features/sleep/SleepView').then((module) => ({ default: module.SleepView })));
const DiaperView = lazy(() => import('@/features/diaper/DiaperView').then((module) => ({ default: module.DiaperView })));
const StatsView = lazy(() => import('@/features/stats/StatsView').then((module) => ({ default: module.StatsView })));
const MoreView = lazy(() => import('@/features/more/MoreView').then((module) => ({ default: module.MoreView })));
const BabyManagement = lazy(() => import('@/features/babies/BabyManagement').then((module) => ({ default: module.BabyManagement })));
const BabyForm = lazy(() => import('@/features/babies/BabyForm').then((module) => ({ default: module.BabyForm })));
const SettingsView = lazy(() => import('@/features/settings/SettingsView').then((module) => ({ default: module.SettingsView })));
const GrowthView = lazy(() => import('@/features/growth/GrowthView').then((module) => ({ default: module.GrowthView })));
const MilestonesView = lazy(() => import('@/features/growth/MilestonesView').then((module) => ({ default: module.MilestonesView })));
const SolidFoodsView = lazy(() => import('@/features/nutrition/SolidFoodsView').then((module) => ({ default: module.SolidFoodsView })));
const VaccinationsView = lazy(() => import('@/features/medical/VaccinationsView').then((module) => ({ default: module.VaccinationsView })));
const MedicineView = lazy(() => import('@/features/medical/MedicineView').then((module) => ({ default: module.MedicineView })));
const TeethingView = lazy(() => import('@/features/medical/TeethingView').then((module) => ({ default: module.TeethingView })));
const PediatricianNotesView = lazy(() => import('@/features/medical/PediatricianNotesView').then((module) => ({ default: module.PediatricianNotesView })));
const MilkStashView = lazy(() => import('@/features/milkstash/MilkStashView').then((module) => ({ default: module.MilkStashView })));
const ExportView = lazy(() => import('@/features/export/ExportView').then((module) => ({ default: module.ExportView })));
const PlayTimeView = lazy(() => import('@/features/play/PlayTimeView').then((module) => ({ default: module.PlayTimeView })));
const WalksView = lazy(() => import('@/features/walks/WalksView').then((module) => ({ default: module.WalksView })));
const DiaperBagChecklistView = lazy(() => import('@/features/diaper/DiaperBagChecklistView').then((module) => ({ default: module.DiaperBagChecklistView })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function OnlineStatusMonitor() {
  const isOnline = useOnlineStatus();
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus);

  useEffect(() => {
    setOnlineStatus(isOnline);
  }, [isOnline, setOnlineStatus]);

  return null;
}

function LanguageMonitor() {
  const languagePreference = useAppStore((state) => state.settings?.languagePreference);

  useEffect(() => {
    changeAppLanguage(languagePreference);
  }, [languagePreference]);

  return null;
}

function FullPageLoading() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center gradient-primary" role="status" aria-live="polite">
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg">{t('common.loading')}</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageLoading />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<DashboardView />} />
          <Route path="/feed" element={<FeedingHub />} />
          <Route path="/sleep" element={<SleepView />} />
          <Route path="/diaper" element={<DiaperView />} />
          <Route path="/stats" element={<StatsView />} />
          <Route path="/more" element={<MoreView />} />
          <Route path="/more/babies" element={<BabyManagement />} />
          <Route path="/more/babies/new" element={<BabyForm />} />
          <Route path="/more/babies/:id/edit" element={<BabyForm />} />
          <Route path="/more/settings" element={<SettingsView />} />
          <Route path="/more/growth" element={<GrowthView />} />
          <Route path="/more/milestones" element={<MilestonesView />} />
          <Route path="/more/solid-foods" element={<SolidFoodsView />} />
          <Route path="/more/vaccinations" element={<VaccinationsView />} />
          <Route path="/more/medicine" element={<MedicineView />} />
          <Route path="/more/teething" element={<TeethingView />} />
          <Route path="/more/pediatrician" element={<PediatricianNotesView />} />
          <Route path="/more/milk-stash" element={<MilkStashView />} />
          <Route path="/more/diaper-bag" element={<DiaperBagChecklistView />} />
          <Route path="/more/pump" element={<PumpPage />} />
          <Route path="/more/play" element={<PlayTimeView />} />
          <Route path="/more/walks" element={<WalksView />} />
          <Route path="/more/export" element={<ExportView />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <LanguageMonitor />
          <OnlineStatusMonitor />
          <OfflineIndicator />
          <AppRoutes />
          <ToastContainer />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
