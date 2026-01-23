import { BabyColor } from './enums';

export interface Baby {
  id: string;
  userId: string;
  name: string;
  birthDate: string | null; // ISO date string
  photoUrl: string | null;
  color: BabyColor;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateBabyInput {
  name: string;
  birthDate?: string | null;
  photoUrl?: string | null;
  color?: BabyColor;
}

export interface UpdateBabyInput {
  name?: string;
  birthDate?: string | null;
  photoUrl?: string | null;
  color?: BabyColor;
  isActive?: boolean;
}

// Helper to calculate baby's age
export function calculateBabyAge(birthDate: string | null): { months: number; weeks: number; days: number; totalDays: number; text: string } | null {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const now = new Date();

  // Calculate total days
  const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate weeks and remaining days
  const weeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;

  // Calculate months for older babies
  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months += now.getMonth() - birth.getMonth();
  const dayDiff = now.getDate() - birth.getDate();
  if (dayDiff < 0) {
    months--;
  }

  let text = '';
  if (totalDays < 7) {
    // Less than a week: show days only
    text = `${totalDays} day${totalDays !== 1 ? 's' : ''} old`;
  } else if (weeks < 12) {
    // Less than 12 weeks: show weeks and days
    if (remainingDays === 0) {
      text = `${weeks} week${weeks !== 1 ? 's' : ''} old`;
    } else {
      text = `${weeks} week${weeks !== 1 ? 's' : ''} and ${remainingDays} day${remainingDays !== 1 ? 's' : ''} old`;
    }
  } else if (months < 24) {
    // Less than 2 years: show months
    text = `${months} month${months !== 1 ? 's' : ''} old`;
  } else {
    // 2+ years: show years and months
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    text = `${years} year${years !== 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : ''} old`;
  }

  return { months, weeks, days: remainingDays, totalDays, text };
}
