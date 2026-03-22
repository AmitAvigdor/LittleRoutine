import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  subscribeToBottleSessions,
  subscribeToDiaperChanges,
  subscribeToFeedingSessions,
  subscribeToMedicines,
  subscribeToMedicineLogs,
  subscribeToMilkStash,
  subscribeToPumpSessions,
  subscribeToSleepSessions,
} from '@/lib/firestore';
import { useHomeStore } from '@/stores/homeStore';
import type { Medicine } from '@/types';

interface HomeSyncContext {
  userId: string;
  babyId: string;
}

let activeSyncKey: string | null = null;
let rootUnsubscribes: Array<() => void> = [];
const medicineLogUnsubscribes = new Map<string, () => void>();

function clearMedicineLogSubscriptions(activeMedicineIds?: Set<string>) {
  medicineLogUnsubscribes.forEach((unsubscribe, medicineId) => {
    if (!activeMedicineIds || !activeMedicineIds.has(medicineId)) {
      unsubscribe();
      medicineLogUnsubscribes.delete(medicineId);
    }
  });
}

function teardownSubscriptions() {
  rootUnsubscribes.forEach((unsubscribe) => unsubscribe());
  rootUnsubscribes = [];
  clearMedicineLogSubscriptions();
  activeSyncKey = null;
}

function syncMedicineLogs(medicines: Medicine[]) {
  const store = useHomeStore.getState();
  const activeMedicineIds = new Set(
    medicines.filter((medicine) => medicine.isActive).map((medicine) => medicine.id)
  );

  clearMedicineLogSubscriptions(activeMedicineIds);

  activeMedicineIds.forEach((medicineId) => {
    if (medicineLogUnsubscribes.has(medicineId)) {
      return;
    }

    const unsubscribe = subscribeToMedicineLogs(medicineId, (logs) => {
      store.setMedicineLogs(medicineId, logs);
      store.markRefreshed();
    });

    medicineLogUnsubscribes.set(medicineId, unsubscribe);
  });
}

function startSubscriptions({ userId, babyId }: HomeSyncContext) {
  const store = useHomeStore.getState();
  store.setContext(userId, babyId);

  rootUnsubscribes = [
    subscribeToFeedingSessions(babyId, (sessions) => {
      store.setFeedingSessions(sessions);
      store.markRefreshed();
    }),
    subscribeToPumpSessions(babyId, (sessions) => {
      store.setPumpSessions(sessions);
      store.markRefreshed();
    }),
    subscribeToBottleSessions(babyId, (sessions) => {
      store.setBottleSessions(sessions);
      store.markRefreshed();
    }),
    subscribeToSleepSessions(babyId, (sessions) => {
      store.setSleepSessions(sessions);
      store.markRefreshed();
    }),
    subscribeToDiaperChanges(babyId, (changes) => {
      store.setDiaperChanges(changes);
      store.markRefreshed();
    }),
    subscribeToMedicines(babyId, (medicines) => {
      store.setMedicines(medicines);
      syncMedicineLogs(medicines);
      store.markRefreshed();
    }),
    subscribeToMilkStash(userId, (stash) => {
      store.setMilkStash(stash);
      store.markRefreshed();
    }),
  ];

  activeSyncKey = `${userId}:${babyId}`;
}

export function ensureHomeDataSync(context: HomeSyncContext | null) {
  if (!context) {
    teardownSubscriptions();
    useHomeStore.getState().setContext(null, null);
    useHomeStore.getState().resetHomeData();
    return;
  }

  const nextKey = `${context.userId}:${context.babyId}`;
  if (activeSyncKey === nextKey && rootUnsubscribes.length > 0) {
    return;
  }

  teardownSubscriptions();
  useHomeStore.getState().resetHomeData();
  startSubscriptions(context);
}

export function refreshHomeDataSync(context: HomeSyncContext | null) {
  if (!context) {
    return;
  }

  teardownSubscriptions();
  startSubscriptions(context);
}

export function prefetchHomeData(context: HomeSyncContext | null) {
  refreshHomeDataSync(context);
}

export function stopHomeDataSync() {
  teardownSubscriptions();
  useHomeStore.getState().setContext(null, null);
  useHomeStore.getState().resetHomeData();
}

export function useHomeDataSync(userId: string | null, babyId: string | null) {
  const location = useLocation();

  useEffect(() => {
    if (!userId || !babyId) {
      stopHomeDataSync();
      return;
    }

    ensureHomeDataSync({ userId, babyId });

    return () => {
      teardownSubscriptions();
    };
  }, [userId, babyId]);

  useEffect(() => {
    if (!userId || !babyId || location.pathname !== '/home') {
      return;
    }

    refreshHomeDataSync({ userId, babyId });
  }, [userId, babyId, location.pathname]);

  useEffect(() => {
    if (!userId || !babyId) {
      return;
    }

    const refresh = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      refreshHomeDataSync({ userId, babyId });
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId, babyId]);
}
