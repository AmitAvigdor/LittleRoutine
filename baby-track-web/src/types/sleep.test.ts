import { describe, it, expect } from 'vitest';
import { formatSleepDuration, calculateSleepQuality } from './sleep';
import type { SleepSession } from './sleep';

describe('formatSleepDuration', () => {
  it('formats minutes only', () => {
    expect(formatSleepDuration(300)).toBe('5m'); // 5 minutes
    expect(formatSleepDuration(1800)).toBe('30m'); // 30 minutes
  });

  it('formats hours and minutes', () => {
    expect(formatSleepDuration(3600)).toBe('1h 0m'); // 1 hour
    expect(formatSleepDuration(5400)).toBe('1h 30m'); // 1.5 hours
    expect(formatSleepDuration(7200)).toBe('2h 0m'); // 2 hours
  });

  it('handles zero', () => {
    expect(formatSleepDuration(0)).toBe('0m');
  });

  it('rounds down partial minutes', () => {
    expect(formatSleepDuration(89)).toBe('1m'); // 1 minute 29 seconds = 1m
    expect(formatSleepDuration(119)).toBe('1m'); // 1 minute 59 seconds = 1m
  });

  // Edge case: very long sleep
  it('handles very long durations', () => {
    const twelveHours = 12 * 3600;
    expect(formatSleepDuration(twelveHours)).toBe('12h 0m');
  });
});

describe('calculateSleepQuality', () => {
  const createSession = (
    type: 'nap' | 'night',
    duration: number,
    isActive = false
  ): SleepSession => ({
    id: Math.random().toString(),
    babyId: 'baby1',
    userId: 'user1',
    date: '2024-01-15',
    duration,
    startTime: '2024-01-15T10:00:00.000Z',
    endTime: isActive ? null : '2024-01-15T11:00:00.000Z',
    type,
    isActive,
    notes: null,
    babyMood: null,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T11:00:00.000Z',
  });

  it('calculates stats for naps', () => {
    const sessions: SleepSession[] = [
      createSession('nap', 3600), // 1 hour
      createSession('nap', 5400), // 1.5 hours
      createSession('night', 28800), // 8 hours - should be excluded
    ];

    const result = calculateSleepQuality(sessions, 'nap');
    expect(result.count).toBe(2);
    expect(result.totalDuration).toBe(9000); // 2.5 hours
    expect(result.averageDuration).toBe(4500); // 1.25 hours
  });

  it('calculates stats for night sleep', () => {
    const sessions: SleepSession[] = [
      createSession('nap', 3600),
      createSession('night', 28800), // 8 hours
      createSession('night', 32400), // 9 hours
    ];

    const result = calculateSleepQuality(sessions, 'night');
    expect(result.count).toBe(2);
    expect(result.totalDuration).toBe(61200); // 17 hours
    expect(result.averageDuration).toBe(30600); // 8.5 hours
  });

  it('excludes active sessions', () => {
    const sessions: SleepSession[] = [
      createSession('nap', 3600),
      createSession('nap', 1800, true), // Active - should be excluded
    ];

    const result = calculateSleepQuality(sessions, 'nap');
    expect(result.count).toBe(1);
    expect(result.totalDuration).toBe(3600);
  });

  it('handles empty sessions', () => {
    const result = calculateSleepQuality([], 'nap');
    expect(result.count).toBe(0);
    expect(result.totalDuration).toBe(0);
    expect(result.averageDuration).toBe(0);
  });

  it('handles sessions with no matching type', () => {
    const sessions: SleepSession[] = [
      createSession('night', 28800),
    ];

    const result = calculateSleepQuality(sessions, 'nap');
    expect(result.count).toBe(0);
    expect(result.totalDuration).toBe(0);
    expect(result.averageDuration).toBe(0);
  });

  // Edge case: division by zero prevention
  it('prevents division by zero for average', () => {
    const sessions: SleepSession[] = [];
    const result = calculateSleepQuality(sessions, 'nap');
    expect(result.averageDuration).toBe(0);
    expect(Number.isNaN(result.averageDuration)).toBe(false);
  });
});
