import { describe, it, expect } from 'vitest';
import type { SolidFood } from './nutrition';
import { getFoodsWithReactions, getFirstFoods, groupFoodsByCategory, getFoodPreferenceSummary } from './nutrition';

const makeFood = (overrides: Partial<SolidFood>): SolidFood => ({
  id: Math.random().toString(),
  babyId: 'b1',
  userId: 'u1',
  foodName: 'Apple',
  date: '2025-01-01',
  category: 'fruit',
  isFirstIntroduction: false,
  reaction: null,
  reactionNotes: null,
  liked: null,
  photoUrl: null,
  notes: null,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  ...overrides,
});

describe('nutrition helpers', () => {
  it('filters foods with reactions', () => {
    const foods = [
      makeFood({ reaction: 'none' }),
      makeFood({ reaction: 'rash' }),
      makeFood({ reaction: null }),
    ];
    const result = getFoodsWithReactions(foods);
    expect(result).toHaveLength(1);
    expect(result[0].reaction).toBe('rash');
  });

  it('filters first introduction foods', () => {
    const foods = [
      makeFood({ isFirstIntroduction: true }),
      makeFood({ isFirstIntroduction: false }),
    ];
    expect(getFirstFoods(foods)).toHaveLength(1);
  });

  it('groups foods by category', () => {
    const foods = [
      makeFood({ category: 'fruit' }),
      makeFood({ category: 'vegetable' }),
      makeFood({ category: 'dairy' }),
    ];
    const grouped = groupFoodsByCategory(foods);
    expect(grouped.fruit).toHaveLength(1);
    expect(grouped.vegetable).toHaveLength(1);
    expect(grouped.dairy).toHaveLength(1);
  });

  it('summarizes preferences', () => {
    const foods = [
      makeFood({ liked: 'loved' }),
      makeFood({ liked: 'neutral' }),
      makeFood({ liked: 'disliked' }),
      makeFood({ liked: 'loved' }),
    ];
    const summary = getFoodPreferenceSummary(foods);
    expect(summary.loved).toBe(2);
    expect(summary.neutral).toBe(1);
    expect(summary.disliked).toBe(1);
  });
});
