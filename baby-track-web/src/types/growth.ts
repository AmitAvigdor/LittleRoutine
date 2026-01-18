import { WeightUnit, LengthUnit, MilestoneCategory } from './enums';

export interface GrowthEntry {
  id: string;
  babyId: string;
  userId: string;
  date: string;
  weight: number | null;
  weightUnit: WeightUnit;
  height: number | null;
  heightUnit: LengthUnit;
  headCircumference: number | null;
  headCircumferenceUnit: LengthUnit;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGrowthEntryInput {
  date: string;
  weight?: number | null;
  weightUnit?: WeightUnit;
  height?: number | null;
  heightUnit?: LengthUnit;
  headCircumference?: number | null;
  headCircumferenceUnit?: LengthUnit;
  photoUrl?: string | null;
  notes?: string | null;
}

export interface Milestone {
  id: string;
  babyId: string;
  userId: string;
  name: string;
  category: MilestoneCategory;
  achievedDate: string | null;
  notes: string | null;
  photoUrl: string | null;
  isAchieved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneInput {
  name: string;
  category: MilestoneCategory;
  achievedDate?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
}

// Unit conversion helpers
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  if (from === 'lbs' && to === 'kg') return value * 0.453592;
  if (from === 'kg' && to === 'lbs') return value / 0.453592;
  return value;
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  if (from === to) return value;
  if (from === 'in' && to === 'cm') return value * 2.54;
  if (from === 'cm' && to === 'in') return value / 2.54;
  return value;
}

export function formatWeight(value: number, unit: WeightUnit): string {
  if (unit === 'lbs') {
    const lbs = Math.floor(value);
    const oz = Math.round((value - lbs) * 16);
    if (oz === 0) return `${lbs} lbs`;
    return `${lbs} lbs ${oz} oz`;
  }
  return `${value.toFixed(2)} kg`;
}

export function formatLength(value: number, unit: LengthUnit): string {
  if (unit === 'in') {
    return `${value.toFixed(1)} in`;
  }
  return `${value.toFixed(1)} cm`;
}
