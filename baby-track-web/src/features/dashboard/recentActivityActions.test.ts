import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BottleSession, DiaperChange, FeedingSession } from '@/types';
import type { DashboardRecentActivity } from './recentActivity';
import {
  deleteDashboardRecentActivity,
  restoreDashboardRecentActivity,
} from './recentActivityActions';

const firestoreMocks = vi.hoisted(() => ({
  createBottleSession: vi.fn(),
  createBottleSessionFromMilkStash: vi.fn(),
  createCompleteSleepSession: vi.fn(),
  createDiaperChange: vi.fn(),
  createFeedingSession: vi.fn(),
  createPumpSession: vi.fn(),
  deleteBottleSession: vi.fn(),
  deleteDiaperChange: vi.fn(),
  deleteFeedingSession: vi.fn(),
  deletePumpSession: vi.fn(),
  deleteSleepSession: vi.fn(),
}));

vi.mock('@/lib/firestore', () => firestoreMocks);

const common = {
  babyId: 'baby-1',
  userId: 'user-1',
  date: '2026-08-16',
  notes: 'Keep this detail',
  createdAt: '2026-08-16T10:00:00.000Z',
  updatedAt: '2026-08-16T10:20:00.000Z',
};

const feeding: FeedingSession = {
  ...common,
  id: 'feeding-1',
  duration: 1200,
  breastSide: 'right',
  startTime: '2026-08-16T10:00:00.000Z',
  endTime: '2026-08-16T10:20:00.000Z',
  isActive: false,
  isPaused: false,
  pausedAt: null,
  totalPausedDuration: 0,
  babyMood: 'calm',
  momMood: 'happy',
  loggedBy: 'Amit',
};

const diaper: DiaperChange = {
  ...common,
  id: 'diaper-1',
  type: 'wet',
  timestamp: '2026-08-16T11:00:00.000Z',
  babyMood: 'happy',
};

const bottle: BottleSession = {
  ...common,
  id: 'bottle-1',
  timestamp: '2026-08-16T12:00:00.000Z',
  volume: 90,
  volumeUnit: 'ml',
  contentType: 'breastMilk',
  milkStashId: 'stash-1',
  babyMood: 'calm',
};

describe('dashboard recent activity actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the matching Firestore record', async () => {
    const activity: DashboardRecentActivity = {
      sessionType: 'diaper',
      session: diaper,
      timestamp: diaper.timestamp,
    };

    await deleteDashboardRecentActivity(activity);

    expect(firestoreMocks.deleteDiaperChange).toHaveBeenCalledWith('diaper-1');
    expect(firestoreMocks.deleteFeedingSession).not.toHaveBeenCalled();
  });

  it('restores every feeding detail under the new Firestore id', async () => {
    firestoreMocks.createFeedingSession.mockResolvedValue('feeding-restored');
    const activity: DashboardRecentActivity = {
      sessionType: 'breastfeeding',
      session: feeding,
      timestamp: feeding.endTime!,
    };

    const restored = await restoreDashboardRecentActivity(activity);

    expect(firestoreMocks.createFeedingSession).toHaveBeenCalledWith(
      'baby-1',
      'user-1',
      expect.objectContaining({
        breastSide: 'right',
        startTime: feeding.startTime,
        endTime: feeding.endTime,
        notes: feeding.notes,
        babyMood: feeding.babyMood,
        momMood: feeding.momMood,
        loggedBy: feeding.loggedBy,
      })
    );
    expect(restored.session.id).toBe('feeding-restored');
  });

  it('preserves a bottle milk-stash link when restoring', async () => {
    firestoreMocks.createBottleSessionFromMilkStash.mockResolvedValue('bottle-restored');
    const activity: DashboardRecentActivity = {
      sessionType: 'bottle',
      session: bottle,
      timestamp: bottle.timestamp,
    };

    await restoreDashboardRecentActivity(activity);

    expect(firestoreMocks.createBottleSessionFromMilkStash).toHaveBeenCalledWith(
      'baby-1',
      'user-1',
      expect.objectContaining({ milkStashId: 'stash-1', volume: 90, volumeUnit: 'ml' })
    );
  });
});
