import { create } from 'zustand';
import type {
  BottleSession,
  DiaperChange,
  FeedingSession,
  Medicine,
  MedicineLog,
  MilkStash,
  PumpSession,
  SleepSession,
} from '@/types';

interface HomeDataState {
  activeBabyId: string | null;
  activeUserId: string | null;
  feedingSessions: FeedingSession[];
  pumpSessions: PumpSession[];
  bottleSessions: BottleSession[];
  sleepSessions: SleepSession[];
  diaperChanges: DiaperChange[];
  medicines: Medicine[];
  medicineLogs: Record<string, MedicineLog[]>;
  milkStash: MilkStash[];
  lastRefreshAt: string | null;
  setContext: (userId: string | null, babyId: string | null) => void;
  resetHomeData: () => void;
  setFeedingSessions: (sessions: FeedingSession[]) => void;
  setPumpSessions: (sessions: PumpSession[]) => void;
  setBottleSessions: (sessions: BottleSession[]) => void;
  setSleepSessions: (sessions: SleepSession[]) => void;
  setDiaperChanges: (changes: DiaperChange[]) => void;
  setMedicines: (medicines: Medicine[]) => void;
  setMedicineLogs: (medicineId: string, logs: MedicineLog[]) => void;
  setMilkStash: (stash: MilkStash[]) => void;
  addOptimisticMedicineLog: (medicineId: string, log: MedicineLog) => void;
  removeMedicineLog: (medicineId: string, logId: string) => void;
  updateMedicineOptimistically: (medicineId: string, updates: Partial<Medicine>) => void;
  addOptimisticDiaperChange: (change: DiaperChange) => void;
  updateDiaperChangeOptimistically: (changeId: string, updates: Partial<DiaperChange>) => void;
  removeDiaperChange: (changeId: string) => void;
  markRefreshed: () => void;
}

const initialState = {
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
};

function sortByDateDesc<T>(items: T[], field: keyof T): T[] {
  return [...items].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];
    return new Date(String(bValue)).getTime() - new Date(String(aValue)).getTime();
  });
}

export const useHomeStore = create<HomeDataState>()((set) => ({
  ...initialState,

  setContext: (activeUserId, activeBabyId) => set({ activeUserId, activeBabyId }),

  resetHomeData: () =>
    set({
      feedingSessions: [],
      pumpSessions: [],
      bottleSessions: [],
      sleepSessions: [],
      diaperChanges: [],
      medicines: [],
      medicineLogs: {},
      milkStash: [],
      lastRefreshAt: null,
    }),

  setFeedingSessions: (feedingSessions) =>
    set({ feedingSessions: sortByDateDesc(feedingSessions, 'startTime') }),

  setPumpSessions: (pumpSessions) =>
    set({ pumpSessions: sortByDateDesc(pumpSessions, 'startTime') }),

  setBottleSessions: (bottleSessions) =>
    set({ bottleSessions: sortByDateDesc(bottleSessions, 'timestamp') }),

  setSleepSessions: (sleepSessions) =>
    set({ sleepSessions: sortByDateDesc(sleepSessions, 'startTime') }),

  setDiaperChanges: (diaperChanges) =>
    set({ diaperChanges: sortByDateDesc(diaperChanges, 'timestamp') }),

  setMedicines: (medicines) =>
    set({ medicines: sortByDateDesc(medicines, 'createdAt') }),

  setMedicineLogs: (medicineId, logs) =>
    set((state) => ({
      medicineLogs: {
        ...state.medicineLogs,
        [medicineId]: sortByDateDesc(logs, 'timestamp'),
      },
    })),

  setMilkStash: (milkStash) =>
    set({ milkStash: [...milkStash] }),

  addOptimisticMedicineLog: (medicineId, log) =>
    set((state) => ({
      medicineLogs: {
        ...state.medicineLogs,
        [medicineId]: sortByDateDesc(
          [...(state.medicineLogs[medicineId] || []), log],
          'timestamp'
        ),
      },
    })),

  removeMedicineLog: (medicineId, logId) =>
    set((state) => ({
      medicineLogs: {
        ...state.medicineLogs,
        [medicineId]: (state.medicineLogs[medicineId] || []).filter((log) => log.id !== logId),
      },
    })),

  updateMedicineOptimistically: (medicineId, updates) =>
    set((state) => ({
      medicines: sortByDateDesc(
        state.medicines.map((medicine) =>
          medicine.id === medicineId
            ? {
                ...medicine,
                ...updates,
                updatedAt: updates.updatedAt ?? new Date().toISOString(),
              }
            : medicine
        ),
        'createdAt'
      ),
    })),

  addOptimisticDiaperChange: (change) =>
    set((state) => ({
      diaperChanges: sortByDateDesc([...state.diaperChanges, change], 'timestamp'),
    })),

  updateDiaperChangeOptimistically: (changeId, updates) =>
    set((state) => ({
      diaperChanges: sortByDateDesc(
        state.diaperChanges.map((change) =>
          change.id === changeId
            ? {
                ...change,
                ...updates,
                updatedAt: updates.updatedAt ?? new Date().toISOString(),
              }
            : change
        ),
        'timestamp'
      ),
    })),

  removeDiaperChange: (changeId) =>
    set((state) => ({
      diaperChanges: state.diaperChanges.filter((change) => change.id !== changeId),
    })),

  markRefreshed: () => set({ lastRefreshAt: new Date().toISOString() }),
}));
