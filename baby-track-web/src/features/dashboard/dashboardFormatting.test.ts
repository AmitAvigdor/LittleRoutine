import { describe, expect, it } from 'vitest';
import type { SolidFood } from '@/types';
import { formatSleepStartedAt, getLatestFeedingStatus } from './dashboardFormatting';

describe('formatSleepStartedAt', () => {
  it('shows the active sleep start time in the local clock format', () => {
    expect(formatSleepStartedAt('2026-06-22T20:15:00')).toBe('Started at 8:15 PM');
  });
});

describe('getLatestFeedingStatus', () => {
  it('uses a solid-food entry as the latest home feeding status', () => {
    const food: SolidFood = {
      id: 'solid-1',
      babyId: 'baby-1',
      userId: 'user-1',
      foodName: 'Avocado',
      date: '2026-06-22',
      timestamp: '2026-06-22T18:30:00.000Z',
      category: 'vegetable',
      isFirstIntroduction: true,
      reaction: 'none',
      reactionNotes: null,
      liked: 'loved',
      photoUrl: null,
      notes: null,
      createdAt: '2026-06-22T18:30:00.000Z',
      updatedAt: '2026-06-22T18:30:00.000Z',
    };

    expect(getLatestFeedingStatus([], [], [food])).toEqual({
      timestamp: food.timestamp,
      type: 'solid',
      details: 'Solids - Avocado',
    });
  });
});
