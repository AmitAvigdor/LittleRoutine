import { describe, expect, it } from 'vitest';
import type { SleepSession } from '@/types';
import { groupNightSleepSessions } from './sleepGrouping';

function makeNightSession(overrides: Partial<SleepSession>): SleepSession {
  return {
    id: 'sleep-1',
    babyId: 'baby-1',
    userId: 'user-1',
    date: '2026-06-22',
    duration: 0,
    startTime: '2026-06-21T21:00:00',
    endTime: null,
    type: 'night',
    isActive: false,
    notes: null,
    babyMood: null,
    createdAt: '2026-06-21T21:00:00',
    updatedAt: '2026-06-21T21:00:00',
    ...overrides,
  };
}

describe('groupNightSleepSessions', () => {
  it('combines night sleep segments separated by a short feeding wake-up', () => {
    const groups = groupNightSleepSessions([
      makeNightSession({
        id: 'first',
        duration: 4 * 60 * 60,
        endTime: '2026-06-22T01:00:00',
      }),
      makeNightSession({
        id: 'second',
        duration: 5 * 60 * 60,
        startTime: '2026-06-22T01:30:00',
        endTime: '2026-06-22T06:30:00',
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].completedDuration).toBe(9 * 60 * 60);
    expect(groups[0].startTime).toBe('2026-06-21T21:00:00');
  });

  it('keeps separate nights apart', () => {
    const groups = groupNightSleepSessions([
      makeNightSession({ id: 'first', duration: 8 * 60 * 60, endTime: '2026-06-22T05:00:00' }),
      makeNightSession({
        id: 'second',
        startTime: '2026-06-22T21:00:00',
        endTime: '2026-06-23T05:00:00',
        duration: 8 * 60 * 60,
      }),
    ]);

    expect(groups).toHaveLength(2);
  });

  it('carries completed sleep into a resumed active night segment', () => {
    const groups = groupNightSleepSessions([
      makeNightSession({ duration: 4 * 60 * 60, endTime: '2026-06-22T01:00:00' }),
      makeNightSession({
        id: 'active',
        startTime: '2026-06-22T01:20:00',
        isActive: true,
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].isActive).toBe(true);
    expect(groups[0].completedDuration).toBe(4 * 60 * 60);
  });
});
