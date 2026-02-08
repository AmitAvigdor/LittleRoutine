import { DiaperType, BabyMood } from './enums';

export interface DiaperChange {
  id: string;
  babyId: string;
  userId: string;
  date: string;
  type: DiaperType;
  timestamp: string;
  notes: string | null;
  babyMood: BabyMood | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaperChangeInput {
  type: DiaperType;
  timestamp: string;
  notes?: string | null;
  babyMood?: BabyMood | null;
}

export function getDiaperStats(changes: DiaperChange[], startDate: Date, endDate: Date): {
  total: number;
  wet: number;
  full: number;
} {
  const filtered = changes.filter(c => {
    const date = new Date(c.timestamp);
    return date >= startDate && date <= endDate;
  });

  return {
    total: filtered.length,
    wet: filtered.filter(c => c.type === 'wet').length,
    // Count 'full' and legacy types ('dirty', 'both') as full
    full: filtered.filter(c => (c.type as string) !== 'wet').length,
  };
}
