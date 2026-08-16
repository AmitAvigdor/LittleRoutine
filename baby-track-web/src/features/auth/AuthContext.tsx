import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  subscribeToAuthState,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  User,
} from '@/lib/firebase';
import { useAppStore } from '@/stores/appStore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setUserId, reset } = useAppStore();

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setUser(user);
      setUserId(user?.uid || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUserId]);

  const handleSignInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.googleError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithEmail = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.signInError');
      if (errorMessage.includes('user-not-found')) {
        setError(t('auth.noAccount'));
      } else if (errorMessage.includes('wrong-password')) {
        setError(t('auth.wrongPassword'));
      } else if (errorMessage.includes('invalid-email')) {
        setError(t('auth.invalidEmail'));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.signUpError');
      if (errorMessage.includes('email-already-in-use')) {
        setError(t('auth.emailInUse'));
      } else if (errorMessage.includes('weak-password')) {
        setError(t('auth.weakPassword'));
      } else if (errorMessage.includes('invalid-email')) {
        setError(t('auth.invalidEmail'));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await signOut();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.logoutError'));
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithEmail: handleSignInWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        logout: handleLogout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
