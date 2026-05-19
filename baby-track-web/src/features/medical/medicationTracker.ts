import type { Medicine, MedicineLog } from '@/types';
import { MEDICATION_FREQUENCY_CONFIG, type MedicationFrequency } from '@/types/enums';

export type MedicationTrackerReason =
  | 'ready'
  | 'interval'
  | 'dailyLimit'
  | 'inactive'
  | 'missingInterval';

export interface MedicationTrackerStatus {
  canGive: boolean;
  reason: MedicationTrackerReason;
  intervalHours: number | null;
  lastDose: MedicineLog | null;
  lastDoseAt: string | null;
  nextDoseAt: string | null;
  elapsedMinutes: number | null;
  remainingMinutes: number;
  dosesToday: number;
  maxDosesToday: number | null;
  dailyLimitReached: boolean;
}

export function getMaxDosesPerDay(frequency: MedicationFrequency): number | null {
  switch (frequency) {
    case 'onceDaily':
      return 1;
    case 'twiceDaily':
      return 2;
    case 'threeTimesDaily':
      return 3;
    case 'fourTimesDaily':
      return 4;
    case 'asNeeded':
    case 'everyHours':
      return null;
    default:
      return null;
  }
}

export function getMedicationIntervalHours(medicine: Medicine): number | null {
  if (medicine.frequency === 'asNeeded') {
    return null;
  }

  if (medicine.frequency === 'everyHours') {
    return isValidInterval(medicine.hoursInterval) ? medicine.hoursInterval : null;
  }

  return MEDICATION_FREQUENCY_CONFIG[medicine.frequency].hoursInterval ?? null;
}

export function sortMedicineLogsNewestFirst(logs: MedicineLog[]): MedicineLog[] {
  return [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getMedicationTrackerStatus(
  medicine: Medicine,
  logs: MedicineLog[],
  now: Date = new Date()
): MedicationTrackerStatus {
  const orderedLogs = sortMedicineLogsNewestFirst(logs);
  const lastDose = orderedLogs[0] ?? null;
  const intervalHours = getMedicationIntervalHours(medicine);
  const maxDosesToday = getMaxDosesPerDay(medicine.frequency);
  const dosesToday = orderedLogs.filter((log) => isSameLocalDay(new Date(log.timestamp), now)).length;
  const dailyLimitReached = maxDosesToday !== null && dosesToday >= maxDosesToday;
  const missingInterval = medicine.frequency === 'everyHours' && intervalHours === null;

  const lastDoseAt = lastDose?.timestamp ?? null;
  const nextDoseAt =
    lastDoseAt && intervalHours !== null
      ? new Date(new Date(lastDoseAt).getTime() + intervalHours * 60 * 60 * 1000).toISOString()
      : null;

  const elapsedMinutes = lastDoseAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(lastDoseAt).getTime()) / (1000 * 60)))
    : null;

  const remainingMinutes = nextDoseAt
    ? Math.max(0, Math.ceil((new Date(nextDoseAt).getTime() - now.getTime()) / (1000 * 60)))
    : 0;

  const baseStatus = {
    intervalHours,
    lastDose,
    lastDoseAt,
    nextDoseAt,
    elapsedMinutes,
    remainingMinutes,
    dosesToday,
    maxDosesToday,
    dailyLimitReached,
  };

  if (!medicine.isActive) {
    return {
      ...baseStatus,
      canGive: false,
      reason: 'inactive',
    };
  }

  if (missingInterval) {
    return {
      ...baseStatus,
      canGive: false,
      reason: 'missingInterval',
    };
  }

  if (dailyLimitReached) {
    return {
      ...baseStatus,
      canGive: false,
      reason: 'dailyLimit',
    };
  }

  if (remainingMinutes > 0) {
    return {
      ...baseStatus,
      canGive: false,
      reason: 'interval',
    };
  }

  return {
    ...baseStatus,
    canGive: true,
    reason: 'ready',
  };
}

function isValidInterval(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isSameLocalDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
