import { FoodCategory, FoodReaction, FoodPreference } from './enums';

export interface SolidFood {
  id: string;
  babyId: string;
  userId: string;
  foodName: string;
  date: string;
  category: FoodCategory;
  isFirstIntroduction: boolean;
  reaction: FoodReaction | null;
  reactionNotes: string | null;
  liked: FoodPreference | null;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSolidFoodInput {
  foodName: string;
  date: string;
  category: FoodCategory;
  isFirstIntroduction?: boolean;
  reaction?: FoodReaction | null;
  reactionNotes?: string | null;
  liked?: FoodPreference | null;
  photoUrl?: string | null;
  notes?: string | null;
}

// Get all foods with reactions for allergy tracking
export function getFoodsWithReactions(foods: SolidFood[]): SolidFood[] {
  return foods.filter(f => f.reaction && f.reaction !== 'none');
}

// Get first introduction foods
export function getFirstFoods(foods: SolidFood[]): SolidFood[] {
  return foods.filter(f => f.isFirstIntroduction);
}

// Group foods by category
export function groupFoodsByCategory(foods: SolidFood[]): Record<FoodCategory, SolidFood[]> {
  const grouped: Record<FoodCategory, SolidFood[]> = {
    fruit: [],
    vegetable: [],
    grain: [],
    protein: [],
    dairy: [],
    other: [],
  };

  foods.forEach(food => {
    grouped[food.category].push(food);
  });

  return grouped;
}

// Get food preferences summary
export function getFoodPreferenceSummary(foods: SolidFood[]): {
  loved: number;
  neutral: number;
  disliked: number;
} {
  return {
    loved: foods.filter(f => f.liked === 'loved').length,
    neutral: foods.filter(f => f.liked === 'neutral').length,
    disliked: foods.filter(f => f.liked === 'disliked').length,
  };
}
