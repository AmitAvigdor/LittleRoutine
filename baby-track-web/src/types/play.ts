import { BabyMood } from './enums';

export type PlayType = 'tummy_time' | 'free_play' | 'sensory' | 'reading' | 'outdoor';

export interface PlaySession {
  id: string;
  babyId: string;
  userId: string;
  type: PlayType;
  startTime: string;
  endTime: string | null;
  duration: number; // in seconds
  notes: string | null;
  babyMood: BabyMood | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PLAY_TYPE_CONFIG: Record<PlayType, { label: string; color: string; emoji: string }> = {
  tummy_time: { label: 'Tummy Time', color: '#ff9800', emoji: '🐣' },
  free_play: { label: 'Free Play', color: '#4caf50', emoji: '🎈' },
  sensory: { label: 'Sensory Play', color: '#9c27b0', emoji: '🎨' },
  reading: { label: 'Reading', color: '#2196f3', emoji: '📚' },
  outdoor: { label: 'Outdoor Play', color: '#8bc34a', emoji: '🌳' },
};
