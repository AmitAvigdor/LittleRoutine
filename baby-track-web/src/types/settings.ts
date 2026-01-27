import { VolumeUnit, WeightUnit, LengthUnit, FeedingTypePreference } from './enums';

export interface AppSettings {
  id: string;
  userId: string;

  // User Info
  userName: string | null;
  partnerName: string | null;

  // Unit Preferences
  preferredVolumeUnit: VolumeUnit;
  preferredWeightUnit: WeightUnit;
  preferredLengthUnit: LengthUnit;

  // Feeding Preference
  feedingTypePreference: FeedingTypePreference;

  // Night Mode
  nightModeEnabled: boolean;
  nightModeAutoEnabled: boolean;
  nightModeStartHour: number; // 0-23
  nightModeEndHour: number; // 0-23
  nightModeSilent: boolean;

  // Reminders
  feedingReminderEnabled: boolean;
  feedingReminderInterval: number; // hours
  diaperReminderEnabled: boolean;
  diaperReminderInterval: number; // hours
  sleepReminderEnabled: boolean;
  medicineReminderEnabled: boolean;
  medicineReminderMinutesBefore: number;

  // Daily Summaries
  dailySummaryEnabled: boolean;
  morningSummaryEnabled: boolean;
  morningSummaryHour: number; // 0-23
  eveningSummaryEnabled: boolean;
  eveningSummaryHour: number; // 0-23

  createdAt: string;
  updatedAt: string;
}

export interface UpdateAppSettingsInput {
  userName?: string | null;
  partnerName?: string | null;
  preferredVolumeUnit?: VolumeUnit;
  preferredWeightUnit?: WeightUnit;
  preferredLengthUnit?: LengthUnit;
  feedingTypePreference?: FeedingTypePreference;
  nightModeEnabled?: boolean;
  nightModeAutoEnabled?: boolean;
  nightModeStartHour?: number;
  nightModeEndHour?: number;
  nightModeSilent?: boolean;
  feedingReminderEnabled?: boolean;
  feedingReminderInterval?: number;
  diaperReminderEnabled?: boolean;
  diaperReminderInterval?: number;
  sleepReminderEnabled?: boolean;
  medicineReminderEnabled?: boolean;
  medicineReminderMinutesBefore?: number;
  dailySummaryEnabled?: boolean;
  morningSummaryEnabled?: boolean;
  morningSummaryHour?: number;
  eveningSummaryEnabled?: boolean;
  eveningSummaryHour?: number;
}

export const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  userName: null,
  partnerName: null,
  preferredVolumeUnit: 'oz',
  preferredWeightUnit: 'lbs',
  preferredLengthUnit: 'in',
  feedingTypePreference: 'breastfeeding',
  nightModeEnabled: false,
  nightModeAutoEnabled: false,
  nightModeStartHour: 20, // 8 PM
  nightModeEndHour: 6, // 6 AM
  nightModeSilent: true,
  feedingReminderEnabled: false,
  feedingReminderInterval: 3,
  diaperReminderEnabled: false,
  diaperReminderInterval: 2,
  sleepReminderEnabled: false,
  medicineReminderEnabled: true,
  medicineReminderMinutesBefore: 15,
  dailySummaryEnabled: false,
  morningSummaryEnabled: true,
  morningSummaryHour: 8,
  eveningSummaryEnabled: true,
  eveningSummaryHour: 20,
};

// Check if current time is in night mode window
export function isNightModeTime(settings: AppSettings): boolean {
  if (!settings.nightModeAutoEnabled) return settings.nightModeEnabled;

  const now = new Date();
  const currentHour = now.getHours();

  const start = settings.nightModeStartHour;
  const end = settings.nightModeEndHour;

  // Handle overnight window (e.g., 20:00 to 06:00)
  if (start > end) {
    return currentHour >= start || currentHour < end;
  }

  // Handle same-day window (e.g., 22:00 to 23:00)
  return currentHour >= start && currentHour < end;
}

// Check if notifications should be suppressed (night mode silent)
export function shouldSuppressNotifications(settings: AppSettings): boolean {
  return settings.nightModeSilent && isNightModeTime(settings);
}
