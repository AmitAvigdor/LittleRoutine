import { BabyMood } from './enums';

export interface WalkSession {
  id: string;
  babyId: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  duration: number; // in seconds
  notes: string | null;
  babyMood: BabyMood | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
