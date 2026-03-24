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
        }),
        createSleepSession({
          startTime: '2026-03-24T08:10:00.000Z',
          endTime: '2026-03-24T09:00:00.000Z',
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

  it('suggests a diaper check after three hours', () => {
    const suggestion = buildSmartSuggestion({
      feedingSessions: [
        createFeedingSession({ startTime: '2026-03-23T08:00:00.000Z' }),
        createFeedingSession({ startTime: '2026-03-24T08:00:00.000Z' }),
      ],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [
        createDiaperChange({ timestamp: '2026-03-23T08:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-23T12:00:00.000Z' }),
        createDiaperChange({ timestamp: '2026-03-24T08:00:00.000Z' }),
      ],
      now: new Date('2026-03-24T11:30:00.000Z'),
      hasActiveFeeding: true,
    });

    expect(suggestion?.kind).toBe('diaper');
    expect(suggestion?.actionKind).toBe('check-diaper');
    expect(suggestion?.isOverdue).toBe(true);
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

  it('shows a neutral upcoming suggestion when nothing is urgent yet', () => {
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
    expect(suggestion?.message).toContain('Next likely');
  });
});
