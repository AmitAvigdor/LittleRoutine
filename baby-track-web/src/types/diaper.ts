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
  dirty: number;
  both: number;
} {
  const filtered = changes.filter(c => {
    const date = new Date(c.timestamp);
    return date >= startDate && date <= endDate;
  });

  return {
    total: filtered.length,
    wet: filtered.filter(c => c.type === 'wet').length,
    dirty: filtered.filter(c => c.type === 'dirty').length,
    both: filtered.filter(c => c.type === 'both').length,
  };
}
