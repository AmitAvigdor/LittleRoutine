import { vi } from 'vitest';
import type { Baby, SleepSession, AppSettings } from '@/types';

// Mock baby
export const mockBaby: Baby = {
  id: 'baby-1',
  userId: 'user-1',
  name: 'Test Baby',
  birthDate: '2024-01-01',
  color: 'purple',
  photoUrl: null,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Mock settings
export const mockSettings: AppSettings = {
  id: 'settings-1',
  userId: 'user-1',
  userName: null,
  partnerName: null,
  preferredVolumeUnit: 'oz',
  preferredWeightUnit: 'lbs',
  preferredLengthUnit: 'in',
  nightModeEnabled: false,
  nightModeAutoEnabled: false,
  nightModeStartHour: 20,
  nightModeEndHour: 6,
  nightModeSilent: true,
  feedingReminderEnabled: false,
  feedingReminderInterval: 3,
  diaperReminderEnabled: false,
  diaperReminderInterval: 2,
  sleepReminderEnabled: false,
  medicineReminderEnabled: true,
  medicineReminderMinutesBefore: 15,
  dailySummaryEnabled: false,
  morningSummaryEnabled: true,
  morningSummaryHour: 8,
  eveningSummaryEnabled: true,
  eveningSummaryHour: 20,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Create mock sleep session
export const createMockSleepSession = (overrides: Partial<SleepSession> = {}): SleepSession => ({
  id: `session-${Math.random().toString(36).substr(2, 9)}`,
  babyId: 'baby-1',
  userId: 'user-1',
  date: '2024-01-15',
  duration: 3600,
  startTime: '2024-01-15T10:00:00.000Z',
  endTime: '2024-01-15T11:00:00.000Z',
  type: 'nap',
  isActive: false,
  notes: null,
  babyMood: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T11:00:00.000Z',
  ...overrides,
});

// Mock Firestore functions
export const mockSubscribeToSleepSessions = vi.fn();
export const mockCreateSleepSession = vi.fn();
export const mockEndSleepSession = vi.fn();

// Mock auth user
export const mockUser = {
  uid: 'user-1',
  email: 'test@example.com',
};

// Create mock auth context
export const createMockAuthContext = () => ({
  user: mockUser,
  loading: false,
  error: null,
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn(),
});

// Create mock app store
export const createMockAppStore = (overrides = {}) => ({
  userId: 'user-1',
  babies: [mockBaby],
  selectedBaby: mockBaby,
  settings: mockSettings,
  nightMode: false,
  setUserId: vi.fn(),
  setBabies: vi.fn(),
  setSelectedBaby: vi.fn(),
  setSettings: vi.fn(),
  setNightMode: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});
