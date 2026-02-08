import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Vaccination } from './medical';
import { getNextDoseTime, getVaccinationStatus, getDaysUntilVaccination } from './medical';

const fixedNow = new Date('2025-02-01T12:00:00.000Z');

describe('getNextDoseTime', () => {
  it('returns null for asNeeded', () => {
    expect(getNextDoseTime('2025-02-01T10:00:00.000Z', 'asNeeded')).toBeNull();
  });

  it('calculates based on frequency', () => {
    const lastDose = '2025-02-01T00:00:00.000Z';
    expect(getNextDoseTime(lastDose, 'onceDaily')?.toISOString()).toBe('2025-02-02T00:00:00.000Z');
    expect(getNextDoseTime(lastDose, 'twiceDaily')?.toISOString()).toBe('2025-02-01T12:00:00.000Z');
    expect(getNextDoseTime(lastDose, 'threeTimesDaily')?.toISOString()).toBe('2025-02-01T08:00:00.000Z');
    expect(getNextDoseTime(lastDose, 'fourTimesDaily')?.toISOString()).toBe('2025-02-01T06:00:00.000Z');
  });

  it('uses hoursInterval for everyHours', () => {
    const lastDose = '2025-02-01T00:00:00.000Z';
    expect(getNextDoseTime(lastDose, 'everyHours', 3)?.toISOString()).toBe('2025-02-01T03:00:00.000Z');
    expect(getNextDoseTime(lastDose, 'everyHours')?.toISOString()).toBe('2025-02-01T04:00:00.000Z');
  });
});

describe('getVaccinationStatus', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const baseVaccination: Vaccination = {
    id: 'v1',
    babyId: 'b1',
    userId: 'u1',
    name: 'Test',
    scheduledDate: '2025-02-01',
    administeredDate: null,
    location: null,
    notes: null,
    reminderEnabled: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };

  it('returns completed when administeredDate exists', () => {
    const result = getVaccinationStatus({ ...baseVaccination, administeredDate: '2025-01-20' });
    expect(result).toBe('completed');
  });

  it('returns overdue for past scheduled date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const result = getVaccinationStatus({ ...baseVaccination, scheduledDate: '2025-01-01' });
    expect(result).toBe('overdue');
  });

  it('returns upcoming for future scheduled date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const result = getVaccinationStatus({ ...baseVaccination, scheduledDate: '2025-03-01' });
    expect(result).toBe('upcoming');
  });
});

describe('getDaysUntilVaccination', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates days difference', () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    expect(getDaysUntilVaccination('2025-02-02')).toBe(1);
    expect(getDaysUntilVaccination('2025-02-01')).toBe(0);
    expect(getDaysUntilVaccination('2025-01-31')).toBe(-1);
  });
});
