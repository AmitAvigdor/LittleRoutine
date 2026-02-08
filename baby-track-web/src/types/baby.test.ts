import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateBabyAge } from './baby';

const fixedNow = new Date('2025-01-15T12:00:00.000Z');

describe('calculateBabyAge', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when birthDate is null', () => {
    expect(calculateBabyAge(null)).toBeNull();
  });

  it('formats days for babies under a week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const birthDate = '2025-01-12T12:00:00.000Z';
    const age = calculateBabyAge(birthDate);
    expect(age?.totalDays).toBe(3);
    expect(age?.text).toBe('3 days old');
  });

  it('formats weeks for babies under 12 weeks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const birthDate = '2024-12-01T12:00:00.000Z';
    const age = calculateBabyAge(birthDate);
    expect(age?.weeks).toBeGreaterThan(0);
    expect(age?.text).toContain('week');
  });

  it('formats months for babies under 2 years', () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const birthDate = '2024-01-15T12:00:00.000Z';
    const age = calculateBabyAge(birthDate);
    expect(age?.months).toBe(12);
    expect(age?.text).toBe('12 months old');
  });

  it('formats years and months for older babies', () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const birthDate = '2022-07-15T12:00:00.000Z';
    const age = calculateBabyAge(birthDate);
    expect(age?.text).toBe('2 years, 6 months old');
  });
});
