import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isNightModeTime, DEFAULT_SETTINGS } from './settings';
import type { AppSettings } from './settings';

const createSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  id: 'settings1',
  userId: 'user1',
  ...DEFAULT_SETTINGS,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

describe('isNightModeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when auto mode is disabled', () => {
    it('returns nightModeEnabled value when auto is off', () => {
      const settings = createSettings({
        nightModeAutoEnabled: false,
        nightModeEnabled: true,
      });
      expect(isNightModeTime(settings)).toBe(true);
    });

    it('returns false when both auto and manual are off', () => {
      const settings = createSettings({
        nightModeAutoEnabled: false,
        nightModeEnabled: false,
      });
      expect(isNightModeTime(settings)).toBe(false);
    });
  });

  describe('when auto mode is enabled (overnight window: 20:00 to 06:00)', () => {
    it('returns true at 21:00 (9 PM)', () => {
      vi.setSystemTime(new Date('2024-01-15T21:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 20,
        nightModeEndHour: 6,
      });
      expect(isNightModeTime(settings)).toBe(true);
    });

    it('returns true at 23:59 (almost midnight)', () => {
      vi.setSystemTime(new Date('2024-01-15T23:59:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 20,
        nightModeEndHour: 6,
      });
      expect(isNightModeTime(settings)).toBe(true);
    });

    it('returns true at 00:00 (midnight)', () => {
      vi.setSystemTime(new Date('2024-01-15T00:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 20,
        nightModeEndHour: 6,
      });
      expect(isNightModeTime(settings)).toBe(true);
    });

    it('returns true at 05:00 (5 AM)', () => {
      vi.setSystemTime(new Date('2024-01-15T05:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 20,
        nightModeEndHour: 6,
      });
      expect(isNightModeTime(settings)).toBe(true);
    });

    it('returns false at 06:00 (end of night mode)', () => {
      vi.setSystemTime(new Date('2024-01-15T06:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 20,
        nightModeEndHour: 6,
      });
      expect(isNightModeTime(settings)).toBe(false);
    });

    it('returns false at 12:00 (noon)', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 20,
        nightModeEndHour: 6,
      });
      expect(isNightModeTime(settings)).toBe(false);
    });

    it('returns false at 19:59 (just before night mode)', () => {
      vi.setSystemTime(new Date('2024-01-15T19:59:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 20,
        nightModeEndHour: 6,
      });
      expect(isNightModeTime(settings)).toBe(false);
    });

    it('returns true at 20:00 (start of night mode)', () => {
      vi.setSystemTime(new Date('2024-01-15T20:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 20,
        nightModeEndHour: 6,
      });
      expect(isNightModeTime(settings)).toBe(true);
    });
  });

  describe('when auto mode is enabled (same-day window: 22:00 to 23:00)', () => {
    it('returns true at 22:30', () => {
      vi.setSystemTime(new Date('2024-01-15T22:30:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 22,
        nightModeEndHour: 23,
      });
      expect(isNightModeTime(settings)).toBe(true);
    });

    it('returns false at 21:00 (before window)', () => {
      vi.setSystemTime(new Date('2024-01-15T21:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 22,
        nightModeEndHour: 23,
      });
      expect(isNightModeTime(settings)).toBe(false);
    });

    it('returns false at 23:00 (end of window)', () => {
      vi.setSystemTime(new Date('2024-01-15T23:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 22,
        nightModeEndHour: 23,
      });
      expect(isNightModeTime(settings)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles start = end (no window)', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 20,
        nightModeEndHour: 20,
      });
      // When start equals end, the same-day branch runs: currentHour >= 20 && currentHour < 20 = false
      expect(isNightModeTime(settings)).toBe(false);
    });

    it('handles full day window (0 to 24)', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00'));
      const settings = createSettings({
        nightModeAutoEnabled: true,
        nightModeStartHour: 0,
        nightModeEndHour: 24,
      });
      // Same-day branch: currentHour >= 0 && currentHour < 24 = true
      expect(isNightModeTime(settings)).toBe(true);
    });
  });
});
