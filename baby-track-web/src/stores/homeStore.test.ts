import { beforeEach, describe, expect, it } from 'vitest';
import type { DiaperChange, Medicine, MedicineLog } from '@/types';
import { useHomeStore } from './homeStore';

const baseMedicine: Medicine = {
  id: 'medicine-1',
  babyId: 'baby-1',
  userId: 'user-1',
  name: 'Vitamin D',
  dosage: '1 drop',
  frequency: 'onceDaily',
  hoursInterval: null,
  instructions: null,
  photoUrl: null,
  isActive: true,
  createdAt: '2026-03-22T08:00:00.000Z',
  updatedAt: '2026-03-22T08:00:00.000Z',
};

const baseLog: MedicineLog = {
  id: 'log-1',
  medicineId: 'medicine-1',
  babyId: 'baby-1',
  userId: 'user-1',
  timestamp: '2026-03-22T09:00:00.000Z',
  givenBy: null,
  notes: null,
  createdAt: '2026-03-22T09:00:00.000Z',
  updatedAt: '2026-03-22T09:00:00.000Z',
};

const baseDiaperChange: DiaperChange = {
  id: 'change-1',
  babyId: 'baby-1',
  userId: 'user-1',
  date: '2026-03-22',
  type: 'wet',
  timestamp: '2026-03-22T09:00:00.000Z',
  notes: null,
  babyMood: null,
  createdAt: '2026-03-22T09:00:00.000Z',
  updatedAt: '2026-03-22T09:00:00.000Z',
};

function resetStore() {
  useHomeStore.setState({
    activeBabyId: null,
    activeUserId: null,
    feedingSessions: [],
    pumpSessions: [],
    bottleSessions: [],
    sleepSessions: [],
    diaperChanges: [],
    medicines: [],
    medicineLogs: {},
    milkStash: [],
    lastRefreshAt: null,
  });
}

describe('homeStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('adds and removes optimistic medicine logs immediately', () => {
    useHomeStore.getState().setMedicines([baseMedicine]);
    useHomeStore.getState().setMedicineLogs(baseMedicine.id, [baseLog]);

    const optimisticLog: MedicineLog = {
      ...baseLog,
      id: 'optimistic-log',
      timestamp: '2026-03-22T10:00:00.000Z',
      createdAt: '2026-03-22T10:00:00.000Z',
      updatedAt: '2026-03-22T10:00:00.000Z',
    };

    useHomeStore.getState().addOptimisticMedicineLog(baseMedicine.id, optimisticLog);
    expect(useHomeStore.getState().medicineLogs[baseMedicine.id]).toHaveLength(2);
    expect(useHomeStore.getState().medicineLogs[baseMedicine.id][0].id).toBe('optimistic-log');

    useHomeStore.getState().removeMedicineLog(baseMedicine.id, optimisticLog.id);
    expect(useHomeStore.getState().medicineLogs[baseMedicine.id]).toEqual([baseLog]);
  });

  it('updates medicine activation optimistically', () => {
    useHomeStore.getState().setMedicines([baseMedicine]);

    useHomeStore.getState().updateMedicineOptimistically(baseMedicine.id, { isActive: false });

    expect(useHomeStore.getState().medicines[0].isActive).toBe(false);
  });

  it('keeps optimistic diaper changes sorted by latest timestamp', () => {
    useHomeStore.getState().setDiaperChanges([baseDiaperChange]);

    useHomeStore.getState().addOptimisticDiaperChange({
      ...baseDiaperChange,
      id: 'change-2',
      timestamp: '2026-03-22T11:00:00.000Z',
      date: '2026-03-22',
      createdAt: '2026-03-22T11:00:00.000Z',
      updatedAt: '2026-03-22T11:00:00.000Z',
    });

    expect(useHomeStore.getState().diaperChanges[0].id).toBe('change-2');
  });
});
