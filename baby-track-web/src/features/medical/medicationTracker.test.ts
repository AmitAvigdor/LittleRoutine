import { describe, expect, it } from 'vitest';
import type { Medicine, MedicineLog } from '@/types';
import { getMedicationTrackerStatus } from './medicationTracker';

function createMedicine(overrides: Partial<Medicine> = {}): Medicine {
  return {
    id: 'medicine-1',
    babyId: 'baby-1',
    userId: 'user-1',
    name: 'Test medicine',
    dosage: '5ml',
    frequency: 'everyHours',
    hoursInterval: 4,
    instructions: null,
    photoUrl: null,
    isActive: true,
    createdAt: '2026-05-19T08:00:00.000Z',
    updatedAt: '2026-05-19T08:00:00.000Z',
    ...overrides,
  };
}

function createLog(timestamp: string, id = timestamp): MedicineLog {
  return {
    id,
    medicineId: 'medicine-1',
    babyId: 'baby-1',
    userId: 'user-1',
    timestamp,
    givenBy: null,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('medication tracker status', () => {
  it('blocks an every-hours medicine until the required interval has passed', () => {
    const medicine = createMedicine({ frequency: 'everyHours', hoursInterval: 4 });
    const status = getMedicationTrackerStatus(
      medicine,
      [createLog('2026-05-19T10:00:00.000Z')],
      new Date('2026-05-19T12:30:00.000Z')
    );

    expect(status.canGive).toBe(false);
    expect(status.reason).toBe('interval');
    expect(status.remainingMinutes).toBe(90);
    expect(status.nextDoseAt).toBe('2026-05-19T14:00:00.000Z');
  });

  it('allows an every-hours medicine once the interval has passed', () => {
    const medicine = createMedicine({ frequency: 'everyHours', hoursInterval: 4 });
    const status = getMedicationTrackerStatus(
      medicine,
      [createLog('2026-05-19T10:00:00.000Z')],
      new Date('2026-05-19T14:01:00.000Z')
    );

    expect(status.canGive).toBe(true);
    expect(status.reason).toBe('ready');
    expect(status.remainingMinutes).toBe(0);
  });

  it('enforces the scheduled interval for fixed daily frequencies', () => {
    const medicine = createMedicine({ frequency: 'twiceDaily', hoursInterval: null });
    const status = getMedicationTrackerStatus(
      medicine,
      [createLog('2026-05-19T08:00:00.000Z')],
      new Date('2026-05-19T14:00:00.000Z')
    );

    expect(status.canGive).toBe(false);
    expect(status.reason).toBe('interval');
    expect(status.intervalHours).toBe(12);
    expect(status.remainingMinutes).toBe(360);
    expect(status.dosesToday).toBe(1);
    expect(status.maxDosesToday).toBe(2);
  });

  it('marks a fixed daily medicine complete after the daily dose count is reached', () => {
    const medicine = createMedicine({ frequency: 'twiceDaily', hoursInterval: null });
    const status = getMedicationTrackerStatus(
      medicine,
      [
        createLog('2026-05-19T17:00:00.000Z', 'dose-2'),
        createLog('2026-05-19T08:00:00.000Z', 'dose-1'),
      ],
      new Date('2026-05-19T18:00:00.000Z')
    );

    expect(status.canGive).toBe(false);
    expect(status.reason).toBe('dailyLimit');
    expect(status.dailyLimitReached).toBe(true);
    expect(status.dosesToday).toBe(2);
  });

  it('does not verify a custom every-hours medicine without a valid interval', () => {
    const medicine = createMedicine({ frequency: 'everyHours', hoursInterval: null });
    const status = getMedicationTrackerStatus(
      medicine,
      [],
      new Date('2026-05-19T12:00:00.000Z')
    );

    expect(status.canGive).toBe(false);
    expect(status.reason).toBe('missingInterval');
  });
});
