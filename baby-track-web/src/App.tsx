import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { LoginPage } from '@/features/auth/LoginPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { ToastContainer } from '@/components/ui/Toast';
import { FeedingHub } from '@/features/feeding/FeedingHub';
import { PumpPage } from '@/features/feeding/PumpPage';
import { SleepView } from '@/features/sleep/SleepView';
import { DiaperView } from '@/features/diaper/DiaperView';
import { StatsView } from '@/features/stats/StatsView';
import { MoreView } from '@/features/more/MoreView';
import { BabyManagement } from '@/features/babies/BabyManagement';
import { BabyForm } from '@/features/babies/BabyForm';
import { SettingsView } from '@/features/settings/SettingsView';
import { GrowthView } from '@/features/growth/GrowthView';
import { MilestonesView } from '@/features/growth/MilestonesView';
import { SolidFoodsView } from '@/features/nutrition/SolidFoodsView';
import { VaccinationsView } from '@/features/medical/VaccinationsView';
import { MedicineView } from '@/features/medical/MedicineView';
import { TeethingView } from '@/features/medical/TeethingView';
import { PediatricianNotesView } from '@/features/medical/PediatricianNotesView';
import { MilkStashView } from '@/features/milkstash/MilkStashView';
import { ExportView } from '@/features/export/ExportView';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { PlayTimeView } from '@/features/play/PlayTimeView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
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
        <Route path="/more/pump" element={<PumpPage />} />
        <Route path="/more/play" element={<PlayTimeView />} />
        <Route path="/more/export" element={<ExportView />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
