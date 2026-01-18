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
export function calculateBabyAge(birthDate: string | null): { months: number; days: number; text: string } | null {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const now = new Date();

  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months += now.getMonth() - birth.getMonth();

  const dayDiff = now.getDate() - birth.getDate();
  if (dayDiff < 0) {
    months--;
  }

  const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  const daysInCurrentMonth = dayDiff < 0
    ? new Date(now.getFullYear(), now.getMonth(), 0).getDate() + dayDiff
    : dayDiff;

  let text = '';
  if (months < 1) {
    text = `${totalDays} day${totalDays !== 1 ? 's' : ''} old`;
  } else if (months < 24) {
    text = `${months} month${months !== 1 ? 's' : ''} old`;
  } else {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    text = `${years} year${years !== 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : ''} old`;
  }

  return { months, days: daysInCurrentMonth, text };
}
