import { BreastSide, PumpSide, BottleContentType, VolumeUnit, BabyMood, MomMood, MilkStorageLocation } from './enums';

// Breastfeeding Session
export interface FeedingSession {
  id: string;
  babyId: string;
  userId: string;
  date: string; // ISO date
  duration: number; // seconds
  breastSide: BreastSide;
  startTime: string; // ISO datetime
  endTime: string | null; // ISO datetime, null when session is active
  isActive: boolean;
  notes: string | null;
  babyMood: BabyMood | null;
  momMood: MomMood | null;
  loggedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedingSessionInput {
  breastSide: BreastSide;
  startTime: string;
  endTime: string;
  notes?: string | null;
  babyMood?: BabyMood | null;
  momMood?: MomMood | null;
  loggedBy?: string | null;
}

// Pump Session
export interface PumpSession {
  id: string;
  babyId: string;
  userId: string;
  date: string;
  duration: number; // seconds
  startTime: string;
  endTime: string | null; // null when session is active
  isActive: boolean;
  side: PumpSide;
  volume: number;
  volumeUnit: VolumeUnit;
  notes: string | null;
  momMood: MomMood | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePumpSessionInput {
  startTime: string;
  endTime: string;
  side: PumpSide;
  volume: number;
  volumeUnit: VolumeUnit;
  notes?: string | null;
  momMood?: MomMood | null;
}

// Bottle Session
export interface BottleSession {
  id: string;
  babyId: string;
  userId: string;
  date: string;
  timestamp: string;
  volume: number;
  volumeUnit: VolumeUnit;
  contentType: BottleContentType;
  notes: string | null;
  babyMood: BabyMood | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBottleSessionInput {
  timestamp: string;
  volume: number;
  volumeUnit: VolumeUnit;
  contentType: BottleContentType;
  notes?: string | null;
  babyMood?: BabyMood | null;
}

// Milk Stash
export interface MilkStash {
  id: string;
  userId: string;
  date: string;
  volume: number;
  volumeUnit: VolumeUnit;
  location: MilkStorageLocation;
  pumpedDate: string;
  expirationDate: string;
  isUsed: boolean;
  usedDate: string | null;
  isInUse: boolean;
  inUseStartDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilkStashInput {
  volume: number;
  volumeUnit: VolumeUnit;
  location: MilkStorageLocation;
  pumpedDate: string;
  notes?: string | null;
}

// Helper functions
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }
  if (minutes > 0) {
    if (secs > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${minutes}m`;
  }
  return `${secs}s`;
}

export function calculateMilkExpiration(pumpedDate: string, location: MilkStorageLocation): string {
  const date = new Date(pumpedDate);
  const days = location === 'fridge' ? 4 : 180;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function getRoomTempExpirationMinutes(inUseStartDate: string): number {
  const start = new Date(inUseStartDate);
  const now = new Date();
  const elapsedMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
  return Math.max(0, 240 - elapsedMinutes); // 4 hours = 240 minutes
}

export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  if (from === to) return value;
  if (from === 'oz' && to === 'ml') return value * 29.5735;
  if (from === 'ml' && to === 'oz') return value / 29.5735;
  return value;
}
