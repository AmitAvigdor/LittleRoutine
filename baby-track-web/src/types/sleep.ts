import { SleepType, BabyMood } from './enums';

export interface SleepSession {
  id: string;
  babyId: string;
  userId: string;
  date: string;
  duration: number; // seconds
  startTime: string;
  endTime: string | null;
  type: SleepType;
  isActive: boolean;
  notes: string | null;
  babyMood: BabyMood | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSleepSessionInput {
  startTime: string;
  type: SleepType;
  notes?: string | null;
  babyMood?: BabyMood | null;
}

export interface EndSleepSessionInput {
  endTime: string;
  notes?: string | null;
  babyMood?: BabyMood | null;
}

export function formatSleepDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function calculateSleepQuality(sessions: SleepSession[], type: SleepType): {
  totalDuration: number;
  averageDuration: number;
  count: number;
} {
  const filtered = sessions.filter(s => s.type === type && !s.isActive);
  const totalDuration = filtered.reduce((sum, s) => sum + s.duration, 0);
  const count = filtered.length;
  const averageDuration = count > 0 ? totalDuration / count : 0;

  return { totalDuration, averageDuration, count };
}
