import { describe, expect, it } from 'vitest';
import { formatSleepStartedAt } from './dashboardFormatting';

describe('formatSleepStartedAt', () => {
  it('shows the active sleep start time in the local clock format', () => {
    expect(formatSleepStartedAt('2026-06-22T20:15:00')).toBe('Started at 8:15 PM');
  });
});
