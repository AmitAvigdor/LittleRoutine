import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { useAppStore } from '@/stores/appStore';

const signInWithGoogle = vi.fn();
const signInWithEmail = vi.fn();
const signUpWithEmail = vi.fn();
const signOut = vi.fn();
const subscribeToAuthState = vi.fn();

vi.mock('@/lib/firebase', () => ({
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
  signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
  signUpWithEmail: (...args: unknown[]) => signUpWithEmail(...args),
  signOut: (...args: unknown[]) => signOut(...args),
  subscribeToAuthState: (...args: unknown[]) => subscribeToAuthState(...args),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    signInWithGoogle.mockReset();
    signInWithEmail.mockReset();
    signUpWithEmail.mockReset();
    signOut.mockReset();
    subscribeToAuthState.mockReset();
    useAppStore.getState().reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws if used outside provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
  });

  it('updates user from auth subscription', () => {
    subscribeToAuthState.mockImplementation((cb: (user: { uid: string } | null) => void) => {
      cb({ uid: 'user1' });
      return () => {};
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user?.uid).toBe('user1');
    expect(result.current.loading).toBe(false);
    expect(useAppStore.getState().userId).toBe('user1');
  });

  it('maps sign-in errors to friendly messages', async () => {
    subscribeToAuthState.mockImplementation((cb: (user: null) => void) => {
      cb(null);
      return () => {};
    });

    signInWithEmail.mockRejectedValueOnce(new Error('wrong-password'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithEmail('test@example.com', 'bad');
    });

    expect(result.current.error).toBe('Incorrect password');
  });

  it('clears store on logout', async () => {
    subscribeToAuthState.mockImplementation((cb: (user: { uid: string } | null) => void) => {
      cb({ uid: 'user1' });
      return () => {};
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(signOut).toHaveBeenCalled();
    expect(useAppStore.getState().userId).toBeNull();
  });
});
