import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { LoginPage } from '@/features/auth/LoginPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { FeedingHub } from '@/features/feeding/FeedingHub';
import { SleepView } from '@/features/sleep/SleepView';
import { DiaperView } from '@/features/diaper/DiaperView';
import { StatsView } from '@/features/stats/StatsView';
import { MoreView } from '@/features/more/MoreView';
import { BabyManagement } from '@/features/babies/BabyManagement';
import { BabyForm } from '@/features/babies/BabyForm';
import { SettingsView } from '@/features/settings/SettingsView';

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
    return <Navigate to="/feed" replace />;
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
        <Route path="/feed" element={<FeedingHub />} />
        <Route path="/sleep" element={<SleepView />} />
        <Route path="/diaper" element={<DiaperView />} />
        <Route path="/stats" element={<StatsView />} />
        <Route path="/more" element={<MoreView />} />
        <Route path="/more/babies" element={<BabyManagement />} />
        <Route path="/more/babies/new" element={<BabyForm />} />
        <Route path="/more/babies/:id/edit" element={<BabyForm />} />
        <Route path="/more/settings" element={<SettingsView />} />
        {/* TODO: Add more routes for Growth, Vaccinations, etc. */}
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
