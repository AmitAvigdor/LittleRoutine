import { describe, expect, it } from 'vitest';
import type { BottleSession, DiaperChange, FeedingSession, SleepSession } from '@/types';
import { buildSmartSuggestion } from './smartSuggestions';

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

function createDiaperChange(overrides: Partial<DiaperChange> = {}): DiaperChange {
  return {
    id: crypto.randomUUID(),
    babyId: 'baby-1',
    userId: 'user-1',
    date: '2026-03-24',
    type: 'wet',
    timestamp: '2026-03-24T09:00:00.000Z',
    notes: null,
    babyMood: null,
    createdAt: '2026-03-24T09:00:00.000Z',
    updatedAt: '2026-03-24T09:00:00.000Z',
    ...overrides,
  };
}

function localIso(year: number, month: number, day: number, hour: number, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function durationSeconds(startTime: string, endTime: string): number {
  return Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
}

describe('buildSmartSuggestion', () => {
  it('shows learning state when there is less than two days of data', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [createFeedingSession()],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [],
      now: new Date('2026-03-24T12:00:00.000Z'),
    });

    expect(suggestion?.kind).toBe('learning');
  });

  it('switches to a sleep suggestion immediately when a sleep is active, even with limited history', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [createFeedingSession()],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          startTime: '2026-03-24T12:15:00.000Z',
          endTime: null,
          isActive: true,
          duration: 0,
        }),
      ],
      diaperChanges: [],
      hasActiveSleep: true,
      now: new Date('2026-03-24T12:45:00.000Z'),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.title).toBe('Sleeping Now');
    expect(suggestion?.message).toContain('in progress');
  });

  it('suggests feeding when the baby is close to the recent feeding interval', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T10:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T12:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T14:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T10:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T09:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T10:30:00.000Z' }),
      ],
      now: new Date('2026-03-24T11:40:00.000Z'),
    });

    expect(suggestion?.kind).toBe('feeding');
    expect(suggestion?.title).toBe('Hungry Soon');
    expect(suggestion?.actionKind).toBe('start-feeding');
  });

  it('ignores future feeding logs when deciding the latest feeding window', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T10:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T12:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T14:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T10:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T16:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T09:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T10:30:00.000Z' }),
      ],
      now: new Date('2026-03-24T11:40:00.000Z'),
    });

    expect(suggestion?.kind).toBe('feeding');
    expect(suggestion?.title).toBe('Hungry Soon');
    expect(suggestion?.detail).toContain('Last feeding was 1 hr 40 min ago');
  });

  it('uses similar-time feeding gaps and resists one unusually long gap', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-21T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-21T10:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-21T15:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-21T19:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-22T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-22T10:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-22T15:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-22T19:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T16:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [],
      now: new Date('2026-03-24T09:35:00.000Z'),
    });

    expect(suggestion?.kind).toBe('feeding');
    expect(suggestion?.title).toBe('Hungry Soon');
    expect(suggestion?.detail).toContain('recent morning feeding rhythm');
    expect(suggestion?.detail).toContain('every 2 hr');
  });

  it('does not call old feeding data overdue after tracking has gone quiet', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-20T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-20T10:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-21T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-21T10:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [],
      now: new Date('2026-03-24T10:00:00.000Z'),
    });

    expect(suggestion?.title).toBe('Looking Ahead');
    expect(suggestion?.isOverdue).toBe(false);
    expect(suggestion?.actionKind).toBeNull();
  });

  it('suggests a nap based on the recent three-day wake window', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: '2026-03-22T00:00:00.000Z',
          endTime: '2026-03-22T06:00:00.000Z',
          duration: 21600,
        }),
        createSleepSession({
          startTime: '2026-03-22T08:00:00.000Z',
          endTime: '2026-03-22T09:00:00.000Z',
        }),
        createSleepSession({
          startTime: '2026-03-23T08:15:00.000Z',
          endTime: '2026-03-23T09:00:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-24T08:10:00.000Z',
          endTime: '2026-03-24T09:00:00.000Z',
          duration: 3000,
        }),
      ],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T09:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T09:00:00.000Z' }),
      ],
      now: new Date('2026-03-24T10:50:00.000Z'),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.title).toBe('Time for a Nap');
  });

  it('uses the matching time-of-day wake window instead of mixing in longer afternoon wake windows', () => {
    const firstNightStart = localIso(2026, 3, 21, 20);
    const firstNightEnd = localIso(2026, 3, 22, 8);
    const firstMorningNapStart = localIso(2026, 3, 22, 8, 50);
    const firstMorningNapEnd = localIso(2026, 3, 22, 9, 30);
    const firstMiddayNapStart = localIso(2026, 3, 22, 13);
    const firstMiddayNapEnd = localIso(2026, 3, 22, 14);
    const secondNightStart = localIso(2026, 3, 22, 20);
    const secondNightEnd = localIso(2026, 3, 23, 8);
    const secondMorningNapStart = localIso(2026, 3, 23, 8, 50);
    const secondMorningNapEnd = localIso(2026, 3, 23, 9, 30);
    const secondMiddayNapStart = localIso(2026, 3, 23, 13);
    const secondMiddayNapEnd = localIso(2026, 3, 23, 14);
    const currentNightStart = localIso(2026, 3, 23, 20);
    const currentNightEnd = localIso(2026, 3, 24, 8);

    const suggestion = buildSmartSuggestion({
      feedingSessions: [],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: firstNightStart,
          endTime: firstNightEnd,
          duration: durationSeconds(firstNightStart, firstNightEnd),
        }),
        createSleepSession({
          startTime: firstMorningNapStart,
          endTime: firstMorningNapEnd,
          duration: durationSeconds(firstMorningNapStart, firstMorningNapEnd),
        }),
        createSleepSession({
          startTime: firstMiddayNapStart,
          endTime: firstMiddayNapEnd,
          duration: durationSeconds(firstMiddayNapStart, firstMiddayNapEnd),
        }),
        createSleepSession({
          type: 'night',
          startTime: secondNightStart,
          endTime: secondNightEnd,
          duration: durationSeconds(secondNightStart, secondNightEnd),
        }),
        createSleepSession({
          startTime: secondMorningNapStart,
          endTime: secondMorningNapEnd,
          duration: durationSeconds(secondMorningNapStart, secondMorningNapEnd),
        }),
        createSleepSession({
          startTime: secondMiddayNapStart,
          endTime: secondMiddayNapEnd,
          duration: durationSeconds(secondMiddayNapStart, secondMiddayNapEnd),
        }),
        createSleepSession({
          type: 'night',
          startTime: currentNightStart,
          endTime: currentNightEnd,
          duration: durationSeconds(currentNightStart, currentNightEnd),
        }),
      ],
      diaperChanges: [],
      now: new Date(localIso(2026, 3, 24, 8, 45)),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.title).toBe('Time for a Nap');
    expect(suggestion?.detail).toContain('recent morning wake window is about 50 min');
  });

  it('derives wake time from sleep duration when completed sleep has no endTime', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: '2026-03-22T00:00:00.000Z',
          endTime: null,
          duration: 21600,
        }),
        createSleepSession({
          startTime: '2026-03-22T08:00:00.000Z',
          endTime: null,
          duration: 3600,
        }),
        createSleepSession({
          startTime: '2026-03-23T08:15:00.000Z',
          endTime: null,
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-24T08:10:00.000Z',
          endTime: null,
          duration: 3000,
        }),
      ],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T09:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T09:00:00.000Z' }),
      ],
      now: new Date('2026-03-24T10:50:00.000Z'),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.title).toBe('Time for a Nap');
    expect(suggestion?.detail).toContain('Baby has been awake for 1 hr 50 min');
  });

  it('switches to bedtime language when the next sleep matches recent night sleep starts', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-22T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: '2026-03-21T20:50:00.000Z',
          endTime: '2026-03-22T06:00:00.000Z',
          duration: 33000,
        }),
        createSleepSession({
          type: 'night',
          startTime: '2026-03-22T21:00:00.000Z',
          endTime: '2026-03-23T06:05:00.000Z',
          duration: 32700,
        }),
        createSleepSession({
          type: 'night',
          startTime: '2026-03-23T20:55:00.000Z',
          endTime: '2026-03-24T06:10:00.000Z',
          duration: 33300,
        }),
        createSleepSession({
          startTime: '2026-03-22T14:30:00.000Z',
          endTime: '2026-03-22T15:15:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-22T18:00:00.000Z',
          endTime: '2026-03-22T18:45:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-23T14:20:00.000Z',
          endTime: '2026-03-23T15:05:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-23T17:55:00.000Z',
          endTime: '2026-03-23T18:40:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-24T14:25:00.000Z',
          endTime: '2026-03-24T15:10:00.000Z',
          duration: 2700,
        }),
        createSleepSession({
          startTime: '2026-03-24T18:05:00.000Z',
          endTime: '2026-03-24T18:50:00.000Z',
          duration: 2700,
        }),
      ],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T09:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T19:30:00.000Z' }),
      ],
      now: new Date('2026-03-24T21:40:00.000Z'),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.title).toBe('Time for Bed');
    expect(suggestion?.message).toContain('bedtime');
    expect(suggestion?.actionLabel).toBe('Start Bedtime');
    expect(suggestion?.actionKind).toBe('start-sleep');
    expect(suggestion?.sleepType).toBe('night');
  });

  it('formats typical bedtime using the local clock time instead of shifting through UTC', () => {
    const firstNightStart = localIso(2026, 3, 21, 21);
    const firstNightEnd = localIso(2026, 3, 22, 6);
    const secondNightStart = localIso(2026, 3, 22, 21);
    const secondNightEnd = localIso(2026, 3, 23, 6);
    const firstNapStart = localIso(2026, 3, 21, 18);
    const firstNapEnd = localIso(2026, 3, 21, 18, 45);
    const secondNapStart = localIso(2026, 3, 22, 18);
    const secondNapEnd = localIso(2026, 3, 22, 18, 45);
    const todayNapStart = localIso(2026, 3, 23, 18);
    const todayNapEnd = localIso(2026, 3, 23, 18, 45);

    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: localIso(2026, 3, 22, 8) }),
        createFeedingSession({ startTime: localIso(2026, 3, 23, 8) }),
      ],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: firstNightStart,
          endTime: firstNightEnd,
          duration: durationSeconds(firstNightStart, firstNightEnd),
        }),
        createSleepSession({
          type: 'night',
          startTime: secondNightStart,
          endTime: secondNightEnd,
          duration: durationSeconds(secondNightStart, secondNightEnd),
        }),
        createSleepSession({
          startTime: firstNapStart,
          endTime: firstNapEnd,
          duration: durationSeconds(firstNapStart, firstNapEnd),
        }),
        createSleepSession({
          startTime: secondNapStart,
          endTime: secondNapEnd,
          duration: durationSeconds(secondNapStart, secondNapEnd),
        }),
        createSleepSession({
          startTime: todayNapStart,
          endTime: todayNapEnd,
          duration: durationSeconds(todayNapStart, todayNapEnd),
        }),
      ],
      diaperChanges: [
        createDiaperChange({ timestamp: localIso(2026, 3, 22, 9) }),
        createDiaperChange({ timestamp: localIso(2026, 3, 23, 9) }),
      ],
      now: new Date(localIso(2026, 3, 23, 21, 5)),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.title).toBe('Time for Bed');
    expect(suggestion?.detail).toContain('night sleep often starts around 9:00 PM');
  });

  it('uses the bedtime clock target when the pre-bed wake window prediction is stale', () => {
    const firstNightStart = localIso(2026, 3, 21, 21);
    const firstNightEnd = localIso(2026, 3, 22, 6);
    const secondNightStart = localIso(2026, 3, 22, 21);
    const secondNightEnd = localIso(2026, 3, 23, 6);
    const firstNapStart = localIso(2026, 3, 21, 17);
    const firstNapEnd = localIso(2026, 3, 21, 18);
    const secondNapStart = localIso(2026, 3, 22, 17);
    const secondNapEnd = localIso(2026, 3, 22, 18);
    const todayNapStart = localIso(2026, 3, 23, 14);
    const todayNapEnd = localIso(2026, 3, 23, 15);

    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: localIso(2026, 3, 22, 13, 30) }),
        createFeedingSession({ startTime: localIso(2026, 3, 22, 16) }),
        createFeedingSession({ startTime: localIso(2026, 3, 22, 18, 30) }),
        createFeedingSession({ startTime: localIso(2026, 3, 23, 13, 30) }),
        createFeedingSession({ startTime: localIso(2026, 3, 23, 16) }),
        createFeedingSession({ startTime: localIso(2026, 3, 23, 18, 30) }),
      ],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: firstNightStart,
          endTime: firstNightEnd,
          duration: durationSeconds(firstNightStart, firstNightEnd),
        }),
        createSleepSession({
          type: 'night',
          startTime: secondNightStart,
          endTime: secondNightEnd,
          duration: durationSeconds(secondNightStart, secondNightEnd),
        }),
        createSleepSession({
          startTime: firstNapStart,
          endTime: firstNapEnd,
          duration: durationSeconds(firstNapStart, firstNapEnd),
        }),
        createSleepSession({
          startTime: secondNapStart,
          endTime: secondNapEnd,
          duration: durationSeconds(secondNapStart, secondNapEnd),
        }),
        createSleepSession({
          startTime: todayNapStart,
          endTime: todayNapEnd,
          duration: durationSeconds(todayNapStart, todayNapEnd),
        }),
      ],
      diaperChanges: [
        createDiaperChange({ timestamp: localIso(2026, 3, 22, 9) }),
        createDiaperChange({ timestamp: localIso(2026, 3, 23, 9) }),
      ],
      now: new Date(localIso(2026, 3, 23, 20, 30)),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.title).toBe('Feed, Then Bedtime');
    expect(suggestion?.detail).toContain('bedtime usually follows around 9:00 PM');
    expect(suggestion?.actionKind).toBe('start-feeding');
  });

  it('learns bedtime from whole nights instead of treating resumed sleep as a new bedtime', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: localIso(2026, 3, 20, 21),
          endTime: localIso(2026, 3, 21, 1),
          duration: 4 * 60 * 60,
        }),
        createSleepSession({
          type: 'night',
          startTime: localIso(2026, 3, 21, 1, 30),
          endTime: localIso(2026, 3, 21, 6, 30),
          duration: 5 * 60 * 60,
        }),
        createSleepSession({
          startTime: localIso(2026, 3, 21, 18),
          endTime: localIso(2026, 3, 21, 18, 30),
          duration: 30 * 60,
        }),
        createSleepSession({
          type: 'night',
          startTime: localIso(2026, 3, 21, 21),
          endTime: localIso(2026, 3, 22, 1),
          duration: 4 * 60 * 60,
        }),
        createSleepSession({
          type: 'night',
          startTime: localIso(2026, 3, 22, 1, 30),
          endTime: localIso(2026, 3, 22, 6, 30),
          duration: 5 * 60 * 60,
        }),
        createSleepSession({
          startTime: localIso(2026, 3, 22, 18),
          endTime: localIso(2026, 3, 22, 18, 45),
          duration: 45 * 60,
        }),
      ],
      diaperChanges: [],
      now: new Date(localIso(2026, 3, 22, 20, 50)),
    });

    expect(suggestion?.title).toBe('Time for Bed');
    expect(suggestion?.detail).toContain('night sleep often starts around 9:00 PM');
    expect(suggestion?.sleepType).toBe('night');
  });

  it('combines feeding and bedtime when both windows land together', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T10:33:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T13:06:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T15:39:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T18:12:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T10:33:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T13:06:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T15:39:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T18:12:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          type: 'night',
          startTime: '2026-03-22T21:00:00.000Z',
          endTime: '2026-03-23T06:10:00.000Z',
          duration: 33000,
        }),
        createSleepSession({
          type: 'night',
          startTime: '2026-03-23T21:05:00.000Z',
          endTime: '2026-03-24T06:05:00.000Z',
          duration: 32400,
        }),
        createSleepSession({
          startTime: '2026-03-24T18:30:00.000Z',
          endTime: '2026-03-24T20:09:00.000Z',
          duration: 5940,
        }),
      ],
      diaperChanges: [],
      now: new Date('2026-03-24T21:28:00.000Z'),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.title).toBe('Feed, Then Bedtime');
    expect(suggestion?.message).toContain('feeding and bedtime window');
    expect(suggestion?.detail).toContain('next feed is likely around');
    expect(suggestion?.actionLabel).toBe('Start Feed First');
    expect(suggestion?.actionKind).toBe('start-feeding');
    expect(suggestion?.sleepType).toBe('night');
  });

  it('prioritizes a wake-up prediction when the baby is currently asleep', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          startTime: '2026-03-22T12:00:00.000Z',
          endTime: '2026-03-22T13:00:00.000Z',
          duration: 3600,
        }),
        createSleepSession({
          startTime: '2026-03-23T12:10:00.000Z',
          endTime: '2026-03-23T13:05:00.000Z',
          duration: 3300,
        }),
        createSleepSession({
          startTime: '2026-03-24T12:15:00.000Z',
          endTime: null,
          isActive: true,
          duration: 0,
        }),
      ],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T09:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T10:30:00.000Z' }),
      ],
      hasActiveSleep: true,
      now: new Date('2026-03-24T13:00:00.000Z'),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.title).toBe('Likely Wake-Up');
    expect(suggestion?.message).toContain('Likely to wake around');
    expect(suggestion?.detail).toContain('usually last about');
    expect(suggestion?.actionKind).toBeNull();
  });

  it('uses a matching nap window before falling back to all naps', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          startTime: '2026-03-22T08:00:00.000Z',
          endTime: '2026-03-22T08:30:00.000Z',
          duration: 1800,
        }),
        createSleepSession({
          startTime: '2026-03-23T08:15:00.000Z',
          endTime: '2026-03-23T08:50:00.000Z',
          duration: 2100,
        }),
        createSleepSession({
          startTime: '2026-03-22T15:00:00.000Z',
          endTime: '2026-03-22T16:20:00.000Z',
          duration: 4800,
        }),
        createSleepSession({
          startTime: '2026-03-23T15:10:00.000Z',
          endTime: '2026-03-23T16:25:00.000Z',
          duration: 4500,
        }),
        createSleepSession({
          startTime: '2026-03-24T15:00:00.000Z',
          endTime: null,
          isActive: true,
          duration: 0,
        }),
      ],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T09:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T10:30:00.000Z' }),
      ],
      hasActiveSleep: true,
      now: new Date('2026-03-24T15:30:00.000Z'),
    });

    expect(suggestion?.kind).toBe('sleep');
    expect(suggestion?.detail).toContain('Afternoon naps usually last about 1 hr 18 min');
  });

  it('keeps one unusually long nap from distorting an active nap wake-up estimate', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [],
      bottleSessions: [],
      sleepSessions: [
        createSleepSession({
          startTime: localIso(2026, 3, 23, 12),
          endTime: localIso(2026, 3, 23, 12, 50),
          duration: 3000,
        }),
        createSleepSession({
          startTime: localIso(2026, 3, 24, 11, 45),
          endTime: localIso(2026, 3, 24, 12, 40),
          duration: 3300,
        }),
        createSleepSession({
          startTime: localIso(2026, 3, 24, 13, 30),
          endTime: localIso(2026, 3, 24, 16, 30),
          duration: 10800,
        }),
        createSleepSession({
          startTime: localIso(2026, 3, 25, 12),
          endTime: null,
          isActive: true,
          duration: 0,
        }),
      ],
      diaperChanges: [],
      hasActiveSleep: true,
      now: new Date(localIso(2026, 3, 25, 12, 40)),
    });

    expect(suggestion?.title).toBe('Likely Wake-Up');
    expect(suggestion?.message).toContain('12:55 PM');
    expect(suggestion?.detail).toContain('Midday naps usually last about 55 min');
  });

  it('does not surface diaper suggestions on the home card', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T10:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T12:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T10:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T08:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-23T12:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T08:00:00.000Z' }),
      ],
      now: new Date('2026-03-24T10:45:00.000Z'),
    });

    expect(suggestion?.kind).not.toBe('diaper');
    expect(suggestion?.title).toBe('Looking Ahead');
  });

  it('uses open-feed action for formula preference', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T10:00:00.000Z' }),
      ],
      bottleSessions: [
        createBottleSession({ timestamp: '2026-03-24T08:00:00.000Z' }),
        createBottleSession({ timestamp: '2026-03-24T10:00:00.000Z' }),
      ],
      sleepSessions: [],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T09:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T10:30:00.000Z' }),
      ],
      feedingTypePreference: 'formula',
      now: new Date('2026-03-24T11:40:00.000Z'),
    });

    expect(suggestion?.kind).toBe('feeding');
    expect(suggestion?.actionKind).toBe('open-feed');
  });

  it('shows a looking-ahead card when nothing is close yet', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T10:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-23T12:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T10:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T09:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T10:30:00.000Z' }),
      ],
      now: new Date('2026-03-24T10:45:00.000Z'),
    });

    expect(suggestion?.title).toBe('Looking Ahead');
    expect(suggestion?.kind).toBe('feeding');
    expect(suggestion?.message).toContain('Next likely feed');
  });
});
