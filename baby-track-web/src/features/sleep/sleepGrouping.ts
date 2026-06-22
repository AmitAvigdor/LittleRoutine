import type { SleepSession } from '@/types';

export const NIGHT_SLEEP_MERGE_GAP_MS = 2 * 60 * 60 * 1000;

export interface NightSleepGroup {
  sessions: SleepSession[];
  startTime: string;
  endTime: string | null;
  completedDuration: number;
  isActive: boolean;
}

export function groupNightSleepSessions(
  sessions: SleepSession[],
  maxGapMs: number = NIGHT_SLEEP_MERGE_GAP_MS
): NightSleepGroup[] {
  const nightSessions = sessions
    .filter((session) => session.type === 'night')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return nightSessions.reduce<NightSleepGroup[]>((groups, session) => {
    const previousGroup = groups[groups.length - 1];
    const previousEndMs = previousGroup?.endTime
      ? new Date(previousGroup.endTime).getTime()
      : null;
    const sessionStartMs = new Date(session.startTime).getTime();
    const gapMs = previousEndMs === null ? Number.POSITIVE_INFINITY : sessionStartMs - previousEndMs;
    const shouldMerge = previousGroup && gapMs >= 0 && gapMs <= maxGapMs;

    if (shouldMerge) {
      previousGroup.sessions.push(session);
      previousGroup.endTime = session.endTime;
      previousGroup.completedDuration += session.isActive ? 0 : session.duration;
      previousGroup.isActive = previousGroup.isActive || session.isActive;
      return groups;
    }

    groups.push({
      sessions: [session],
      startTime: session.startTime,
      endTime: session.endTime,
      completedDuration: session.isActive ? 0 : session.duration,
      isActive: session.isActive,
    });
    return groups;
  }, []);
}

export function findNightSleepGroup(
  sessions: SleepSession[],
  sessionId: string
): NightSleepGroup | null {
  return groupNightSleepSessions(sessions).find(
    (group) => group.sessions.some((session) => session.id === sessionId)
  ) ?? null;
}
