import { describe, expect, it } from 'vitest';
import type {
  BottleSession,
  DiaperChange,
  FeedingSession,
  PlaySession,
  PumpSession,
  SleepSession,
  WalkSession,
} from '@/types';
import {
  buildInsights,
  buildStatsSummary,
  formatHoursAsFriendlyDuration,
  getDateRange,
  getFilteredStatsData,
  type StatsDataSnapshot,
} from './statsProcessing';

function createFeedingSession(overrides: Partial<FeedingSession> = {}): FeedingSession {
  return {
    id: crypto.randomUUID(),
    babyId: 'baby-1',
    userId: 'user-1',
    date: '2026-03-24',
    breastSide: 'left',
    startTime: '2026-03-24T08:00:00.000Z',
    endTime: '2026-03-24T08:20:00.000Z',
    duration: 1200,
    isActive: false,
    isPaused: false,
    pausedAt: null,
    totalPausedDuration: 0,
    notes: null,
    momMood: null,
    babyMood: null,
    loggedBy: null,
    createdAt: '2026-03-24T08:00:00.000Z',
    updatedAt: '2026-03-24T08:20:00.000Z',
    ...overrides,
  };
}

function createBottleSession(overrides: Partial<BottleSession> = {}): BottleSession {
  return {
    id: crypto.randomUUID(),
    babyId: 'baby-1',
    userId: 'user-1',
    timestamp: '2026-03-24T10:00:00.000Z',
    volume: 4,
    volumeUnit: 'oz',
    contentType: 'formula',
    notes: null,
    babyMood: null,
    createdAt: '2026-03-24T10:00:00.000Z',
    updatedAt: '2026-03-24T10:00:00.000Z',
    date: '2026-03-24',
    ...overrides,
  };
}

function createSleepSession(overrides: Partial<SleepSession> = {}): SleepSession {
  return {
    id: crypto.randomUUID(),
    babyId: 'baby-1',
    userId: 'user-1',
    date: '2026-03-24',
    duration: 3600,
    startTime: '2026-03-24T12:00:00.000Z',
    endTime: '2026-03-24T13:00:00.000Z',
    type: 'nap',
    isActive: false,
    notes: null,
    babyMood: null,
    createdAt: '2026-03-24T12:00:00.000Z',
    updatedAt: '2026-03-24T13:00:00.000Z',
    ...overrides,
  };
}

function createSnapshot(overrides: Partial<StatsDataSnapshot> = {}): StatsDataSnapshot {
  return {
    feedingSessions: [],
    pumpSessions: [] as PumpSession[],
    bottleSessions: [],
    sleepSessions: [],
    diaperChanges: [] as DiaperChange[],
    playSessions: [] as PlaySession[],
    walkSessions: [] as WalkSession[],
    ...overrides,
  };
}

describe('statsProcessing', () => {
  it('formats decimal hours into a friendlier duration', () => {
    expect(formatHoursAsFriendlyDuration(1.7)).toBe('1 hr 42 min');
    expect(formatHoursAsFriendlyDuration(1.5)).toBe('1 hr 30 min');
    expect(formatHoursAsFriendlyDuration(0.75)).toBe('45 min');
  });

  it('separates nursing and bottle insights in weekly comparisons', () => {
    const now = new Date('2026-03-24T12:00:00.000Z');
    const snapshot = createSnapshot({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
      ],
      bottleSessions: [
        createBottleSession({ timestamp: '2026-03-24T10:00:00.000Z' }),
        createBottleSession({ timestamp: '2026-03-24T14:00:00.000Z' }),
        createBottleSession({ timestamp: '2026-03-18T14:00:00.000Z' }),
      ],
      sleepSessions: Array.from({ length: 5 }, (_, index) =>
        createSleepSession({
          startTime: `2026-03-${20 + index}T12:00:00.000Z`,
          endTime: `2026-03-${20 + index}T13:00:00.000Z`,
        })
      ),
    });

    const insights = buildInsights(snapshot, now);

    expect(insights.weekly.nursing.currentValue).toBe(2);
    expect(insights.weekly.bottle.currentValue).toBe(2);
    expect(insights.weekly.nursing.previousValue).toBe(0);
    expect(insights.weekly.bottle.previousValue).toBe(1);
  });

  it('ignores short nap outliers when building nap patterns', () => {
    const snapshot = createSnapshot({
      sleepSessions: [
        createSleepSession({ startTime: '2026-03-20T09:00:00.000Z', endTime: '2026-03-20T10:00:00.000Z', duration: 3600 }),
        createSleepSession({ startTime: '2026-03-21T09:15:00.000Z', endTime: '2026-03-21T10:00:00.000Z', duration: 2700 }),
        createSleepSession({ startTime: '2026-03-22T09:05:00.000Z', endTime: '2026-03-22T10:05:00.000Z', duration: 3600 }),
        createSleepSession({ startTime: '2026-03-23T09:10:00.000Z', endTime: '2026-03-23T10:00:00.000Z', duration: 3000 }),
        createSleepSession({ startTime: '2026-03-24T09:20:00.000Z', endTime: '2026-03-24T10:15:00.000Z', duration: 3300 }),
        createSleepSession({ startTime: '2026-03-24T15:00:00.000Z', endTime: '2026-03-24T15:08:00.000Z', duration: 480 }),
      ],
      feedingSessions: Array.from({ length: 5 }, (_, index) =>
        createFeedingSession({
          startTime: `2026-03-${20 + index}T07:00:00.000Z`,
          endTime: `2026-03-${20 + index}T07:20:00.000Z`,
        })
      ),
    });

    const insights = buildInsights(snapshot, new Date('2026-03-24T12:00:00.000Z'));

    expect(insights.patternCards.find((card) => card.id === 'nap-length')?.value).toBe('54 min');
    expect(insights.routineSummary.some((item) => item.includes('9AM'))).toBe(true);
  });

  it('calculates typical-day averages using tracked days across the insight window', () => {
    const snapshot = createSnapshot({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T11:00:00.000Z' }),
      ],
      bottleSessions: [
        createBottleSession({ timestamp: '2026-03-23T10:00:00.000Z' }),
      ],
      sleepSessions: [
        createSleepSession({ startTime: '2026-03-22T12:00:00.000Z', endTime: '2026-03-22T13:00:00.000Z', duration: 3600 }),
        createSleepSession({ startTime: '2026-03-24T12:00:00.000Z', endTime: '2026-03-24T14:00:00.000Z', duration: 7200 }),
        createSleepSession({ startTime: '2026-03-20T09:00:00.000Z', endTime: '2026-03-20T10:00:00.000Z', duration: 3600 }),
        createSleepSession({ startTime: '2026-03-21T09:00:00.000Z', endTime: '2026-03-21T10:00:00.000Z', duration: 3600 }),
        createSleepSession({ startTime: '2026-03-23T09:00:00.000Z', endTime: '2026-03-23T10:00:00.000Z', duration: 3600 }),
      ],
    });

    const insights = buildInsights(snapshot, new Date('2026-03-24T12:00:00.000Z'));

    expect(insights.averages.nursingPerDay).toBeCloseTo(2 / 3);
    expect(insights.averages.bottlePerDay).toBeCloseTo(1 / 3);
    expect(insights.averages.sleepPerDay).toBe(4800);
  });

  it('does not inflate bottle averages when bottles were only logged on one tracked day', () => {
    const snapshot = createSnapshot({
      bottleSessions: [
        createBottleSession({ timestamp: '2026-03-24T10:00:00.000Z' }),
        createBottleSession({ timestamp: '2026-03-24T14:00:00.000Z' }),
      ],
      sleepSessions: [
        createSleepSession({
          startTime: '2026-03-23T09:00:00.000Z',
          endTime: '2026-03-23T10:00:00.000Z',
          duration: 3600,
        }),
        createSleepSession({
          startTime: '2026-03-24T12:00:00.000Z',
          endTime: '2026-03-24T13:00:00.000Z',
          duration: 3600,
        }),
      ],
    });

    const insights = buildInsights(snapshot, new Date('2026-03-24T12:00:00.000Z'));

    expect(insights.averages.bottlePerDay).toBe(1);
  });

  it('ignores tiny bottle and nursing outliers in feeding patterns', () => {
    const snapshot = createSnapshot({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-20T08:00:00.000Z', duration: 900 }),
        createFeedingSession({ startTime: '2026-03-21T08:10:00.000Z', duration: 900 }),
        createFeedingSession({ startTime: '2026-03-22T08:05:00.000Z', duration: 900 }),
        createFeedingSession({ startTime: '2026-03-23T08:15:00.000Z', duration: 900 }),
        createFeedingSession({ startTime: '2026-03-24T08:20:00.000Z', duration: 900 }),
        createFeedingSession({ startTime: '2026-03-24T14:00:00.000Z', duration: 120 }),
      ],
      bottleSessions: [
        createBottleSession({ timestamp: '2026-03-24T15:00:00.000Z', volume: 5, volumeUnit: 'ml' }),
      ],
      sleepSessions: Array.from({ length: 5 }, (_, index) =>
        createSleepSession({
          startTime: `2026-03-${20 + index}T12:00:00.000Z`,
          endTime: `2026-03-${20 + index}T13:00:00.000Z`,
          duration: 3600,
        })
      ),
    });

    const insights = buildInsights(snapshot, new Date('2026-03-24T12:00:00.000Z'));

    expect(insights.patternCards.find((card) => card.id === 'feeding-window')?.value).toContain('10AM');
    expect(insights.patternCards.find((card) => card.id === 'feeding-window')?.value).not.toContain('4PM');
    expect(insights.patternCards.find((card) => card.id === 'feeding-window')?.value).not.toContain('5PM');
    expect(insights.patternCards.find((card) => card.id === 'feeding-window')?.title).toBe('Most Common Feeding Times');
    expect(insights.patternCards.find((card) => card.id === 'feeding-window')?.description).toContain('not every feed');
  });

  it('ignores overnight sleep gaps when calculating feeding rhythm', () => {
    const snapshot = createSnapshot({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-20T08:00:00.000Z', endTime: '2026-03-20T08:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T10:00:00.000Z', endTime: '2026-03-20T10:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T12:00:00.000Z', endTime: '2026-03-20T12:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T14:00:00.000Z', endTime: '2026-03-20T14:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T16:00:00.000Z', endTime: '2026-03-20T16:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T18:00:00.000Z', endTime: '2026-03-20T18:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T20:00:00.000Z', endTime: '2026-03-20T20:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-21T06:00:00.000Z', endTime: '2026-03-21T06:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-21T08:00:00.000Z', endTime: '2026-03-21T08:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-21T10:00:00.000Z', endTime: '2026-03-21T10:20:00.000Z' }),
      ],
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: '2026-03-20T21:00:00.000Z',
          endTime: '2026-03-21T05:00:00.000Z',
          duration: 28800,
        }),
      ],
    });

    const insights = buildInsights(snapshot, new Date('2026-03-21T12:00:00.000Z'));

    expect(insights.routineSummary.some((item) => item.includes('While awake, usually feeds about every 2 hr'))).toBe(true);
    expect(insights.patternCards.find((card) => card.id === 'feeding-window')?.description).toContain('While awake, usually feeds about every 2 hr');
  });

  it('prefers a wake-window pattern when naps are steady but spread across different hours', () => {
    const snapshot = createSnapshot({
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: '2026-03-20T00:00:00.000Z',
          endTime: '2026-03-20T06:00:00.000Z',
          duration: 21600,
        }),
        createSleepSession({
          startTime: '2026-03-20T07:30:00.000Z',
          endTime: '2026-03-20T08:15:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-20T09:45:00.000Z',
          endTime: '2026-03-20T10:30:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-20T12:00:00.000Z',
          endTime: '2026-03-20T12:45:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-20T14:15:00.000Z',
          endTime: '2026-03-20T15:00:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-20T16:30:00.000Z',
          endTime: '2026-03-20T17:15:00.000Z',
          duration: 2700,
        }),
      ],
      feedingSessions: Array.from({ length: 5 }, (_, index) =>
        createFeedingSession({
          startTime: `2026-03-${20 + index}T07:00:00.000Z`,
          endTime: `2026-03-${20 + index}T07:20:00.000Z`,
        })
      ),
    });

    const insights = buildInsights(snapshot, new Date('2026-03-24T12:00:00.000Z'));

    expect(insights.patternCards.find((card) => card.id === 'wake-window')?.value).toBe('1 hr 30 min awake');
    expect(insights.patternCards.some((card) => card.id === 'nap-window')).toBe(false);
    expect(insights.routineSummary.some((item) => item.includes('1 hr 30 min after waking'))).toBe(true);
  });

  it('calculates a sweet spot nap recommendation from average wake windows', () => {
    const snapshot = createSnapshot({
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: '2026-03-20T02:00:00.000Z',
          endTime: '2026-03-20T06:00:00.000Z',
          duration: 14400,
        }),
        createSleepSession({
          startTime: '2026-03-20T08:00:00.000Z',
          endTime: '2026-03-20T09:00:00.000Z',
          duration: 3600,
        }),
        createSleepSession({
          startTime: '2026-03-20T11:00:00.000Z',
          endTime: '2026-03-20T12:00:00.000Z',
          duration: 3600,
        }),
        createSleepSession({
          startTime: '2026-03-20T14:00:00.000Z',
          endTime: '2026-03-20T15:00:00.000Z',
          duration: 3600,
        }),
        createSleepSession({
          startTime: '2026-03-21T08:00:00.000Z',
          endTime: '2026-03-21T09:00:00.000Z',
          duration: 3600,
        }),
      ],
      feedingSessions: Array.from({ length: 5 }, (_, index) =>
        createFeedingSession({
          startTime: `2026-03-${20 + index}T07:00:00.000Z`,
          endTime: `2026-03-${20 + index}T07:20:00.000Z`,
        })
      ),
    });

    const insights = buildInsights(snapshot, new Date('2026-03-21T10:00:00.000Z'));

    expect(insights.sweetSpot.averageWakeWindowHours?.toFixed(1)).toBe('2.0');
    expect(insights.sweetSpot.recommendedTime).toBe('2026-03-21T11:00:00.000Z');
  });

  it('calculates a feeding sweet spot recommendation from the average awake feeding gap', () => {
    const snapshot = createSnapshot({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-20T08:00:00.000Z', endTime: '2026-03-20T08:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T10:00:00.000Z', endTime: '2026-03-20T10:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T12:00:00.000Z', endTime: '2026-03-20T12:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T14:00:00.000Z', endTime: '2026-03-20T14:20:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T16:00:00.000Z', endTime: '2026-03-20T16:20:00.000Z' }),
      ],
    });

    const insights = buildInsights(snapshot, new Date('2026-03-20T17:00:00.000Z'));

    expect(insights.feedingSweetSpot.averageGapHours).toBe(2);
    expect(insights.feedingSweetSpot.recommendedTime).toBe('2026-03-20T18:00:00.000Z');
    expect(insights.feedingSweetSpot.lastFeedingTime).toBe('2026-03-20T16:00:00.000Z');
  });

  it('returns a high consistency score for a steady week', () => {
    const snapshot = createSnapshot({
      sleepSessions: Array.from({ length: 7 }, (_, index) =>
        createSleepSession({
          startTime: `2026-03-${18 + index}T09:00:00.000Z`,
          endTime: `2026-03-${18 + index}T10:00:00.000Z`,
          duration: 3600,
        })
      ),
      feedingSessions: Array.from({ length: 7 }, (_, index) =>
        createFeedingSession({
          startTime: `2026-03-${18 + index}T07:00:00.000Z`,
          endTime: `2026-03-${18 + index}T07:20:00.000Z`,
        })
      ),
      bottleSessions: Array.from({ length: 7 }, (_, index) =>
        createBottleSession({
          timestamp: `2026-03-${18 + index}T11:00:00.000Z`,
          volume: 4,
          volumeUnit: 'oz',
        })
      ),
    });

    const insights = buildInsights(snapshot, new Date('2026-03-24T12:00:00.000Z'));

    expect(insights.consistencyScore).toBeGreaterThanOrEqual(80);
    expect(insights.timeline.sleep.hourlyIntensity.length).toBe(24);
    expect(insights.timeline.feeding.hourlyIntensity.length).toBe(24);
  });

  it('builds stats from filtered data without mutating the base snapshot', () => {
    const snapshot = createSnapshot({
      feedingSessions: [createFeedingSession()],
      bottleSessions: [createBottleSession()],
      sleepSessions: [createSleepSession()],
    });

    const filtered = getFilteredStatsData(snapshot, getDateRange('week', new Date('2026-03-24T12:00:00.000Z')));
    const summary = buildStatsSummary(filtered, 'oz');

    expect(summary.nursingCount).toBe(1);
    expect(summary.bottleCount).toBe(1);
    expect(summary.napCount).toBe(1);
    expect(snapshot.feedingSessions).toHaveLength(1);
  });
});
