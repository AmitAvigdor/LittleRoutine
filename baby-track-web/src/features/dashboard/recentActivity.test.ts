import { describe, expect, it } from 'vitest';
import type {
  BottleSession,
  DiaperChange,
  FeedingSession,
  PumpSession,
  SleepSession,
} from '@/types';
import { getLatestEditableActivity } from './recentActivity';

const common = {
  babyId: 'baby-1',
  userId: 'user-1',
  date: '2026-08-16',
  notes: null,
  createdAt: '2026-08-16T10:00:00.000Z',
  updatedAt: '2026-08-16T10:00:00.000Z',
};

const feeding: FeedingSession = {
  ...common,
  id: 'feeding-1',
  duration: 900,
  breastSide: 'left',
  startTime: '2026-08-16T10:00:00.000Z',
  endTime: '2026-08-16T10:15:00.000Z',
  isActive: false,
  isPaused: false,
  pausedAt: null,
  totalPausedDuration: 0,
  babyMood: null,
  momMood: null,
  loggedBy: null,
};

const pump: PumpSession = {
  ...common,
  id: 'pump-1',
  duration: 600,
  startTime: '2026-08-16T10:20:00.000Z',
  endTime: '2026-08-16T10:30:00.000Z',
  isActive: false,
  isPaused: false,
  pausedAt: null,
  totalPausedDuration: 0,
  side: 'both',
  volume: 80,
  volumeUnit: 'ml',
  momMood: null,
};

const bottle: BottleSession = {
  ...common,
  id: 'bottle-1',
  timestamp: '2026-08-16T10:40:00.000Z',
  volume: 90,
  volumeUnit: 'ml',
  contentType: 'formula',
  babyMood: null,
};

const sleep: SleepSession = {
  ...common,
  id: 'sleep-1',
  duration: 1800,
  startTime: '2026-08-16T10:45:00.000Z',
  endTime: '2026-08-16T11:15:00.000Z',
  type: 'nap',
  isActive: false,
  babyMood: null,
};

const diaper: DiaperChange = {
  ...common,
  id: 'diaper-1',
  timestamp: '2026-08-16T11:20:00.000Z',
  type: 'wet',
  babyMood: null,
};

describe('getLatestEditableActivity', () => {
  it('returns the most recent completed activity across dashboard activity types', () => {
    const result = getLatestEditableActivity({
      feedingSessions: [feeding],
      pumpSessions: [pump],
      bottleSessions: [bottle],
      sleepSessions: [sleep],
      diaperChanges: [diaper],
    });

    expect(result?.sessionType).toBe('diaper');
    expect(result?.session.id).toBe('diaper-1');
  });

  it('uses completion time and excludes active timed sessions', () => {
    const result = getLatestEditableActivity({
      feedingSessions: [
        { ...feeding, id: 'active-feed', startTime: '2026-08-16T12:00:00.000Z', endTime: null, isActive: true },
        feeding,
      ],
      pumpSessions: [],
      bottleSessions: [{ ...bottle, timestamp: '2026-08-16T10:10:00.000Z' }],
      sleepSessions: [{ ...sleep, startTime: '2026-08-16T09:00:00.000Z', endTime: '2026-08-16T10:25:00.000Z' }],
      diaperChanges: [],
    });

    expect(result?.sessionType).toBe('sleep');
    expect(result?.timestamp).toBe('2026-08-16T10:25:00.000Z');
  });

  it('returns null when there is nothing safe to edit', () => {
    const result = getLatestEditableActivity({
      feedingSessions: [{ ...feeding, endTime: null, isActive: true }],
      pumpSessions: [],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [],
    });

    expect(result).toBeNull();
  });
});
