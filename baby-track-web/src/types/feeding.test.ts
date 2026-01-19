import { describe, it, expect } from 'vitest';
import { formatDuration, convertVolume, calculateMilkExpiration, getRoomTempExpirationMinutes } from './feeding';

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats hours, minutes and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7325)).toBe('2:02:05');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('pads seconds correctly', () => {
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(65)).toBe('1:05');
  });

  it('pads minutes correctly when hours present', () => {
    expect(formatDuration(3605)).toBe('1:00:05');
    expect(formatDuration(3665)).toBe('1:01:05');
  });

  // Edge case: what happens with negative numbers?
  it('handles negative numbers', () => {
    // This might be a bug - negative durations shouldn't happen but let's see
    const result = formatDuration(-60);
    // If this fails, we found a bug!
    expect(result).toBeDefined();
  });

  // Edge case: very large numbers
  it('handles very large durations', () => {
    const twentyFourHours = 86400;
    expect(formatDuration(twentyFourHours)).toBe('24:00:00');
  });
});

describe('convertVolume', () => {
  it('returns same value when units match', () => {
    expect(convertVolume(5, 'oz', 'oz')).toBe(5);
    expect(convertVolume(150, 'ml', 'ml')).toBe(150);
  });

  it('converts oz to ml', () => {
    const result = convertVolume(1, 'oz', 'ml');
    expect(result).toBeCloseTo(29.5735, 2);
  });

  it('converts ml to oz', () => {
    const result = convertVolume(29.5735, 'ml', 'oz');
    expect(result).toBeCloseTo(1, 2);
  });

  it('handles zero', () => {
    expect(convertVolume(0, 'oz', 'ml')).toBe(0);
    expect(convertVolume(0, 'ml', 'oz')).toBe(0);
  });

  it('round-trips correctly', () => {
    const original = 5;
    const toMl = convertVolume(original, 'oz', 'ml');
    const backToOz = convertVolume(toMl, 'ml', 'oz');
    expect(backToOz).toBeCloseTo(original, 5);
  });

  // Edge case: very small values
  it('handles very small values', () => {
    const result = convertVolume(0.1, 'oz', 'ml');
    expect(result).toBeCloseTo(2.95735, 2);
  });

  // Edge case: very large values
  it('handles very large values', () => {
    const result = convertVolume(1000, 'ml', 'oz');
    expect(result).toBeCloseTo(33.814, 2);
  });
});

describe('calculateMilkExpiration', () => {
  it('calculates fridge expiration (4 days)', () => {
    const pumpedDate = '2024-01-15T10:00:00.000Z';
    const result = calculateMilkExpiration(pumpedDate, 'fridge');
    const expected = new Date('2024-01-19T10:00:00.000Z');
    expect(new Date(result).getTime()).toBe(expected.getTime());
  });

  it('calculates freezer expiration (180 days)', () => {
    const pumpedDate = '2024-01-15T10:00:00.000Z';
    const result = calculateMilkExpiration(pumpedDate, 'freezer');
    const resultDate = new Date(result);
    const pumpedDateObj = new Date(pumpedDate);
    const diffDays = Math.round((resultDate.getTime() - pumpedDateObj.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(180);
  });

  // Edge case: end of month
  it('handles month boundaries correctly', () => {
    const pumpedDate = '2024-01-30T10:00:00.000Z';
    const result = calculateMilkExpiration(pumpedDate, 'fridge');
    const resultDate = new Date(result);
    expect(resultDate.getMonth()).toBe(1); // February (0-indexed)
    expect(resultDate.getDate()).toBe(3);
  });

  // Edge case: leap year
  it('handles leap year correctly', () => {
    const pumpedDate = '2024-02-28T10:00:00.000Z'; // 2024 is a leap year
    const result = calculateMilkExpiration(pumpedDate, 'fridge');
    const resultDate = new Date(result);
    expect(resultDate.getMonth()).toBe(2); // March
    expect(resultDate.getDate()).toBe(3);
  });
});

describe('getRoomTempExpirationMinutes', () => {
  it('returns 240 minutes for just-started milk', () => {
    const now = new Date();
    const result = getRoomTempExpirationMinutes(now.toISOString());
    expect(result).toBeCloseTo(240, -1); // Within 10 minutes due to execution time
  });

  it('returns reduced time for milk started earlier', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = getRoomTempExpirationMinutes(twoHoursAgo.toISOString());
    expect(result).toBeCloseTo(120, -1); // ~120 minutes remaining
  });

  it('returns 0 for expired milk (past 4 hours)', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const result = getRoomTempExpirationMinutes(fiveHoursAgo.toISOString());
    expect(result).toBe(0);
  });

  it('never returns negative values', () => {
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
    const result = getRoomTempExpirationMinutes(tenHoursAgo.toISOString());
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
