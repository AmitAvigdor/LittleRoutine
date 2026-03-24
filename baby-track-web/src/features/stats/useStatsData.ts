import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import {
  subscribeToBottleSessions,
  subscribeToDiaperChanges,
  subscribeToFeedingSessions,
  subscribeToPlaySessions,
  subscribeToPumpSessions,
  subscribeToSleepSessions,
  subscribeToWalkSessions,
} from '@/lib/firestore';
import { EMPTY_STATS_DATA, type StatsDataSnapshot } from './statsProcessing';

export function useStatsData(babyId: string | null): StatsDataSnapshot {
  const [state, setState] = useState<{
    babyId: string | null;
    data: StatsDataSnapshot;
  }>({
    babyId: null,
    data: EMPTY_STATS_DATA,
  });

  useEffect(() => {
    if (!babyId) {
      return;
    }

    let frameId: number | null = null;
    let pendingState: Partial<StatsDataSnapshot> = {};

    const flushPendingState = () => {
      frameId = null;
      const nextState = pendingState;
      pendingState = {};

      startTransition(() => {
        setState((current) => ({
          babyId,
          data: {
            ...(current.babyId === babyId ? current.data : EMPTY_STATS_DATA),
            ...nextState,
          },
        }));
      });
    };

    const scheduleUpdate = <K extends keyof StatsDataSnapshot>(key: K) => {
      return (value: StatsDataSnapshot[K]) => {
        pendingState = {
          ...pendingState,
          [key]: value,
        };

        if (frameId !== null) {
          return;
        }

        frameId = window.requestAnimationFrame(flushPendingState);
      };
    };

    const unsubscribes = [
      subscribeToFeedingSessions(babyId, scheduleUpdate('feedingSessions')),
      subscribeToPumpSessions(babyId, scheduleUpdate('pumpSessions')),
      subscribeToBottleSessions(babyId, scheduleUpdate('bottleSessions')),
      subscribeToSleepSessions(babyId, scheduleUpdate('sleepSessions')),
      subscribeToDiaperChanges(babyId, scheduleUpdate('diaperChanges')),
      subscribeToPlaySessions(babyId, scheduleUpdate('playSessions')),
      subscribeToWalkSessions(babyId, scheduleUpdate('walkSessions')),
    ];

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [babyId]);

  return useDeferredValue(
    babyId && state.babyId === babyId
      ? state.data
      : EMPTY_STATS_DATA
  );
}
