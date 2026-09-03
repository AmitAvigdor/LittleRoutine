import type {
  BottleSession,
  DiaperChange,
  FeedingSession,
  PumpSession,
  SleepSession,
} from '@/types';

export type DashboardRecentActivity =
  | { sessionType: 'breastfeeding'; session: FeedingSession; timestamp: string }
  | { sessionType: 'pump'; session: PumpSession; timestamp: string }
  | { sessionType: 'bottle'; session: BottleSession; timestamp: string }
  | { sessionType: 'sleep'; session: SleepSession; timestamp: string }
  | { sessionType: 'diaper'; session: DiaperChange; timestamp: string };

interface RecentActivityInput {
  feedingSessions: FeedingSession[];
  pumpSessions: PumpSession[];
  bottleSessions: BottleSession[];
  sleepSessions: SleepSession[];
  diaperChanges: DiaperChange[];
}

export function getLatestEditableActivity({
  feedingSessions,
  pumpSessions,
  bottleSessions,
  sleepSessions,
  diaperChanges,
}: RecentActivityInput): DashboardRecentActivity | null {
  const candidates: DashboardRecentActivity[] = [];

  feedingSessions.forEach((session) => {
    if (!session.isActive && session.endTime) {
      candidates.push({ sessionType: 'breastfeeding', session, timestamp: session.endTime });
    }
  });

  pumpSessions.forEach((session) => {
    if (!session.isActive && session.endTime) {
      candidates.push({ sessionType: 'pump', session, timestamp: session.endTime });
    }
  });

  bottleSessions.forEach((session) => {
    candidates.push({ sessionType: 'bottle', session, timestamp: session.timestamp });
  });

  sleepSessions.forEach((session) => {
    if (!session.isActive && session.endTime) {
      candidates.push({ sessionType: 'sleep', session, timestamp: session.endTime });
    }
  });

  diaperChanges.forEach((session) => {
    candidates.push({ sessionType: 'diaper', session, timestamp: session.timestamp });
  });

  return candidates.reduce<DashboardRecentActivity | null>((latest, candidate) => {
    if (!latest) return candidate;
    return new Date(candidate.timestamp).getTime() > new Date(latest.timestamp).getTime()
      ? candidate
      : latest;
  }, null);
}
