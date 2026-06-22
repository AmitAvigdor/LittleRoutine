import { describe, expect, it } from 'vitest';
import type { SolidFood } from '@/types';
import {
  compareSolidFoodsNewestFirst,
  formatSolidFoodDate,
  normalizeSolidFoodDate,
} from './solidFoodUtils';

function makeFood(overrides: Partial<SolidFood>): SolidFood {
  return {
    id: 'food-1',
    babyId: 'baby-1',
    userId: 'user-1',
    foodName: 'Banana',
    date: '2026-06-20',
    category: 'fruit',
    isFirstIntroduction: true,
    reaction: 'none',
    reactionNotes: null,
    liked: null,
    photoUrl: null,
    notes: null,
    createdAt: '2026-06-20T08:00:00.000Z',
    updatedAt: '2026-06-20T08:00:00.000Z',
    ...overrides,
  };
}

describe('solid food dates', () => {
  it('normalizes stored timestamps to date-only values', () => {
    expect(normalizeSolidFoodDate('2026-06-20T21:30:00.000Z')).toBe('2026-06-20');
  });

  it('uses one explicit display format', () => {
    expect(formatSolidFoodDate('2026-06-20')).toBe('Jun 20, 2026');
  });

  it('sorts by food date and then newest creation time', () => {
    const foods = [
      makeFood({ id: 'older-day', date: '2026-06-19', createdAt: '2026-06-19T20:00:00.000Z' }),
      makeFood({ id: 'older-entry', createdAt: '2026-06-20T08:00:00.000Z' }),
      makeFood({ id: 'newer-entry', createdAt: '2026-06-20T12:00:00.000Z' }),
    ].sort(compareSolidFoodsNewestFirst);

    expect(foods.map((food) => food.id)).toEqual(['newer-entry', 'older-entry', 'older-day']);
  });
});
