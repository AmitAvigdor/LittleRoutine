import {
  differenceInMinutes,
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import type { BottleSession, DiaperChange, FeedingSession, SleepSession } from '@/types';
import type { FeedingTypePreference } from '@/types/enums';

export type SmartSuggestionKind = 'learning' | 'feeding' | 'sleep' | 'diaper';
export type SmartSuggestionActionKind = 'start-feeding' | 'open-feed' | 'start-sleep' | 'check-diaper';

export interface SmartSuggestion {
  kind: SmartSuggestionKind;
  title: string;
  message: string;
  detail: string;
  isOverdue: boolean;
  actionKind: SmartSuggestionActionKind | null;
}

interface SmartSuggestionCandidate extends SmartSuggestion {
  priority: number;
}

interface SmartSuggestionInput {
  feedingSessions: FeedingSession[];
  bottleSessions: BottleSession[];
  sleepSessions: SleepSession[];
  diaperChanges: DiaperChange[];
  feedingTypePreference?: FeedingTypePreference;
  hasActiveFeeding?: boolean;
  hasActiveSleep?: boolean;
  now?: Date;
}

interface UpcomingSuggestionOption {
  kind: 'feeding' | 'sleep' | 'diaper';
  dueAt: Date;
  title: string;
  message: string;
  detail: string;
  actionKind: SmartSuggestionActionKind;
}

type NapTimeBucket = 'early-morning' | 'morning' | 'midday' | 'afternoon' | 'evening';

interface SleepDurationEstimate {
  minutes: number;
  label: string;
}

function countUniqueDays(timestamps: string[]): number {
  return new Set(timestamps.map((timestamp) => format(parseISO(timestamp), 'yyyy-MM-dd'))).size;
}

function formatMinutesAsDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const wholeHours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${wholeHours} hr`;
  }

  return `${wholeHours} hr ${remainingMinutes} min`;
}

function getNapTimeBucket(timestamp: string): NapTimeBucket {
  const hour = parseISO(timestamp).getHours();

  if (hour < 8) return 'early-morning';
  if (hour < 11) return 'morning';
  if (hour < 15) return 'midday';
  if (hour < 19) return 'afternoon';
  return 'evening';
}

function getNapTimeBucketLabel(bucket: NapTimeBucket): string {
  switch (bucket) {
    case 'early-morning':
      return 'early-morning naps';
    case 'morning':
      return 'morning naps';
    case 'midday':
      return 'midday naps';
    case 'afternoon':
      return 'afternoon naps';
    case 'evening':
      return 'evening naps';
    default:
      return 'recent naps';
  }
}

function buildCompletedFeedingEvents(
  feedingSessions: FeedingSession[],
  bottleSessions: BottleSession[]
): Array<{ timestamp: string }> {
  return [
    ...feedingSessions
      .filter((session) => !session.isActive)
      .map((session) => ({ timestamp: session.startTime })),
    ...bottleSessions.map((session) => ({ timestamp: session.timestamp })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function buildNightSleepRanges(sleepSessions: SleepSession[]) {
  return sleepSessions
    .filter((session) => !session.isActive && session.type === 'night' && session.endTime)
    .map((session) => ({
      start: new Date(session.startTime).getTime(),
      end: new Date(session.endTime || session.startTime).getTime(),
    }));
}

function getLatestCompletedSleep(sleepSessions: SleepSession[]): SleepSession | null {
  const completedSessions = sleepSessions
    .filter((session) => !session.isActive && !!session.endTime)
    .sort(
      (a, b) =>
        new Date(b.endTime || b.startTime).getTime() -
        new Date(a.endTime || a.startTime).getTime()
    );

  return completedSessions[0] || null;
}

function getLatestDiaperChange(diaperChanges: DiaperChange[]): DiaperChange | null {
  const sortedChanges = [...diaperChanges].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return sortedChanges[0] || null;
}

function calculateAverageFeedingGapMinutes(
  feedEvents: Array<{ timestamp: string }>,
  sleepSessions: SleepSession[]
): number | null {
  if (feedEvents.length < 3) {
    return null;
  }

  const recentEvents = [...feedEvents]
    .slice(0, 10)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const nightSleepRanges = buildNightSleepRanges(sleepSessions);
  const gapMinutes: number[] = [];

  for (let index = 1; index < recentEvents.length; index += 1) {
    const previous = new Date(recentEvents[index - 1].timestamp).getTime();
    const current = new Date(recentEvents[index].timestamp).getTime();
    const minutes = (current - previous) / (1000 * 60);
    const overlapsNightSleep = nightSleepRanges.some((sleep) => sleep.start < current && sleep.end > previous);

    if (!overlapsNightSleep && minutes > 30 && minutes < 12 * 60) {
      gapMinutes.push(minutes);
    }
  }

  if (gapMinutes.length === 0) {
    return null;
  }

  return Math.round(gapMinutes.reduce((sum, minutes) => sum + minutes, 0) / gapMinutes.length);
}

function calculateAverageWakeWindowMinutes(
  sleepSessions: SleepSession[],
  now: Date
): number | null {
  const threeDayWindow = {
    start: startOfDay(subDays(now, 2)),
    end: endOfDay(now),
  };

  const completedSleep = sleepSessions
    .filter((session) => !session.isActive && session.endTime)
    .sort(
      (a, b) =>
        new Date(a.endTime || a.startTime).getTime() -
        new Date(b.endTime || b.startTime).getTime()
    );

  const recentNaps = completedSleep
    .filter(
      (session) =>
        session.type === 'nap' &&
        isWithinInterval(parseISO(session.startTime), threeDayWindow)
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const wakeWindows: number[] = [];
  let pointer = 0;
  let latestWakeTime: string | null = null;

  recentNaps.forEach((nap) => {
    while (
      pointer < completedSleep.length &&
      new Date(completedSleep[pointer].endTime || completedSleep[pointer].startTime).getTime() <
        new Date(nap.startTime).getTime()
    ) {
      latestWakeTime = completedSleep[pointer].endTime || completedSleep[pointer].startTime;
      pointer += 1;
    }

    if (!latestWakeTime) {
      return;
    }

    const wakeMinutes =
      (new Date(nap.startTime).getTime() - new Date(latestWakeTime).getTime()) / (1000 * 60);

    if (wakeMinutes >= 45 && wakeMinutes <= 6 * 60) {
      wakeWindows.push(wakeMinutes);
    }
  });

  if (wakeWindows.length === 0) {
    return null;
  }

  return Math.round(wakeWindows.reduce((sum, minutes) => sum + minutes, 0) / wakeWindows.length);
}

function calculateAverageSleepDurationMinutes(
  sleepSessions: SleepSession[],
  sleepType: SleepSession['type'],
  now: Date,
  activeSleepStartTime?: string
): SleepDurationEstimate | null {
  const lookbackStart =
    sleepType === 'night' ? startOfDay(subDays(now, 6)) : startOfDay(subDays(now, 2));

  const completedSessions = sleepSessions
    .filter(
      (session) =>
        !session.isActive &&
        session.type === sleepType &&
        session.endTime &&
        isWithinInterval(parseISO(session.endTime || session.startTime), {
          start: lookbackStart,
          end: endOfDay(now),
        })
    )
    .filter((session) => {
      if (sleepType === 'night') {
        return session.duration >= 3 * 60 * 60 && session.duration <= 16 * 60 * 60;
      }

      return session.duration >= 20 * 60 && session.duration <= 4 * 60 * 60;
    })
    .sort(
      (a, b) =>
        new Date(b.endTime || b.startTime).getTime() -
        new Date(a.endTime || a.startTime).getTime()
    )
    .slice(0, 5);

  if (completedSessions.length === 0) {
    return null;
  }

  if (sleepType === 'nap' && activeSleepStartTime) {
    const activeBucket = getNapTimeBucket(activeSleepStartTime);
    const matchingBucketSessions = completedSessions.filter(
      (session) => getNapTimeBucket(session.startTime) === activeBucket
    );

    if (matchingBucketSessions.length >= 2) {
      return {
        minutes: Math.round(
          matchingBucketSessions.reduce((sum, session) => sum + session.duration / 60, 0) /
            matchingBucketSessions.length
        ),
        label: getNapTimeBucketLabel(activeBucket),
      };
    }
  }

  return {
    minutes: Math.round(
      completedSessions.reduce((sum, session) => sum + session.duration / 60, 0) / completedSessions.length
    ),
    label: sleepType === 'night' ? 'recent night sleep' : 'recent naps',
  };
}

function calculateAverageDiapersPerDay(diaperChanges: DiaperChange[], now: Date): number | null {
  const windowStart = startOfDay(subDays(now, 6));
  const recentChanges = diaperChanges.filter((change) =>
    isWithinInterval(parseISO(change.timestamp), { start: windowStart, end: endOfDay(now) })
  );

  if (recentChanges.length === 0) {
    return null;
  }

  return recentChanges.length / 7;
}

export function buildSmartSuggestion({
  feedingSessions,
  bottleSessions,
  sleepSessions,
  diaperChanges,
  feedingTypePreference = 'breastfeeding',
  hasActiveFeeding = false,
  hasActiveSleep = false,
  now = new Date(),
}: SmartSuggestionInput): SmartSuggestion | null {
  const activeSleep = sleepSessions.find((session) => session.isActive);

  if (activeSleep) {
    const sleepDurationEstimate = calculateAverageSleepDurationMinutes(
      sleepSessions,
      activeSleep.type,
      now,
      activeSleep.startTime
    );
    const minutesAsleep = differenceInMinutes(now, parseISO(activeSleep.startTime));

    if (sleepDurationEstimate !== null) {
      const dueAt = new Date(parseISO(activeSleep.startTime).getTime() + sleepDurationEstimate.minutes * 60 * 1000);
      const isOverdue = now.getTime() >= dueAt.getTime();

      return {
        kind: 'sleep',
        title: isOverdue ? 'Waking Soon' : 'Likely Wake-Up',
        message: isOverdue
          ? `Usually wakes around ${format(dueAt, 'h:mm a')}.`
          : `Likely to wake around ${format(dueAt, 'h:mm a')}.`,
        detail: `${activeSleep.type === 'night' ? 'Night sleep' : 'Nap'} has been going for ${formatMinutesAsDuration(minutesAsleep)}. ${sleepDurationEstimate.label.charAt(0).toUpperCase() + sleepDurationEstimate.label.slice(1)} usually last about ${formatMinutesAsDuration(sleepDurationEstimate.minutes)}.`,
        isOverdue,
        actionKind: null,
      };
    }

    return {
      kind: 'sleep',
      title: 'Sleeping Now',
      message: activeSleep.type === 'night' ? 'Night sleep is in progress.' : 'Nap is in progress.',
      detail: `This ${activeSleep.type === 'night' ? 'night sleep' : 'nap'} has been going for ${formatMinutesAsDuration(minutesAsleep)}. We will estimate wake-up time after a little more sleep history.`,
      isOverdue: false,
      actionKind: null,
    };
  }

  const trackedDays = countUniqueDays([
    ...feedingSessions.filter((session) => !session.isActive).map((session) => session.startTime),
    ...bottleSessions.map((session) => session.timestamp),
    ...sleepSessions
      .filter((session) => !session.isActive)
      .map((session) => session.endTime || session.startTime),
    ...diaperChanges.map((change) => change.timestamp),
  ]);

  if (trackedDays < 2) {
    return {
      kind: 'learning',
      title: 'Learning your patterns...',
      message: 'Keep tracking for another day or two and smart suggestions will start feeling personal.',
      detail: 'We need a little more history before we can predict feeding, sleep, and diaper rhythms.',
      isOverdue: false,
      actionKind: null,
    };
  }

  const candidates: SmartSuggestionCandidate[] = [];
  const upcomingOptions: UpcomingSuggestionOption[] = [];
  const feedEvents = buildCompletedFeedingEvents(feedingSessions, bottleSessions);
  const latestFeeding = feedEvents[0];
  const averageFeedingGapMinutes = calculateAverageFeedingGapMinutes(feedEvents, sleepSessions);

  if (!hasActiveFeeding && latestFeeding && averageFeedingGapMinutes !== null) {
    const elapsedSinceLastFeed = differenceInMinutes(now, parseISO(latestFeeding.timestamp));
    const shouldSuggest = elapsedSinceLastFeed >= averageFeedingGapMinutes - 30;

    if (shouldSuggest) {
      const isOverdue = elapsedSinceLastFeed >= averageFeedingGapMinutes;
      candidates.push({
        kind: 'feeding',
        title: isOverdue ? 'Hungry Soon' : 'Hungry Soon',
        message: isOverdue
          ? 'The usual feeding window is here.'
          : 'A feeding window is coming up soon.',
        detail: `Last feeding was ${formatMinutesAsDuration(elapsedSinceLastFeed)} ago. While awake, the recent average gap is ${formatMinutesAsDuration(averageFeedingGapMinutes)}.`,
        isOverdue,
        actionKind: feedingTypePreference === 'formula' ? 'open-feed' : 'start-feeding',
        priority: isOverdue ? 240 + (elapsedSinceLastFeed - averageFeedingGapMinutes) : 140 + elapsedSinceLastFeed,
      });
    } else {
      const dueAt = new Date(parseISO(latestFeeding.timestamp).getTime() + averageFeedingGapMinutes * 60 * 1000);
      upcomingOptions.push({
        kind: 'feeding',
        dueAt,
        title: 'Looking Ahead',
        message: `Next likely feed around ${format(dueAt, 'h:mm a')}.`,
        detail: `The recent awake feeding rhythm is about every ${formatMinutesAsDuration(averageFeedingGapMinutes)}.`,
        actionKind: feedingTypePreference === 'formula' ? 'open-feed' : 'start-feeding',
      });
    }
  }

  const latestCompletedSleep = getLatestCompletedSleep(sleepSessions);
  const averageWakeWindowMinutes = calculateAverageWakeWindowMinutes(sleepSessions, now);

  if (!hasActiveSleep && !activeSleep && latestCompletedSleep?.endTime && averageWakeWindowMinutes !== null) {
    const awakeMinutes = differenceInMinutes(now, parseISO(latestCompletedSleep.endTime));
    const shouldSuggest = awakeMinutes >= averageWakeWindowMinutes - 15;

    if (shouldSuggest) {
      const isOverdue = awakeMinutes >= averageWakeWindowMinutes;
      candidates.push({
        kind: 'sleep',
        title: 'Time for a Nap',
        message: isOverdue
          ? 'The nap window is open right now.'
          : 'A nap window is coming up soon.',
        detail: `Baby has been awake for ${formatMinutesAsDuration(awakeMinutes)}. The recent 3-day wake window is about ${formatMinutesAsDuration(averageWakeWindowMinutes)}.`,
        isOverdue,
        actionKind: 'start-sleep',
        priority: isOverdue ? 300 + (awakeMinutes - averageWakeWindowMinutes) : 180 + awakeMinutes,
      });
    } else {
      const dueAt = new Date(parseISO(latestCompletedSleep.endTime).getTime() + averageWakeWindowMinutes * 60 * 1000);
      upcomingOptions.push({
        kind: 'sleep',
        dueAt,
        title: 'Looking Ahead',
        message: `Next likely nap window around ${format(dueAt, 'h:mm a')}.`,
        detail: `The recent 3-day wake window is about ${formatMinutesAsDuration(averageWakeWindowMinutes)}.`,
        actionKind: 'start-sleep',
      });
    }
  }

  const latestDiaper = getLatestDiaperChange(diaperChanges);
  const averageDiapersPerDay = calculateAverageDiapersPerDay(diaperChanges, now);

  if (latestDiaper && averageDiapersPerDay !== null) {
    const minutesSinceDiaper = differenceInMinutes(now, parseISO(latestDiaper.timestamp));
    if (minutesSinceDiaper > 180) {
      candidates.push({
        kind: 'diaper',
        title: 'Diaper Check',
        message: 'It may be a good time for a diaper check.',
        detail: `It has been ${formatMinutesAsDuration(minutesSinceDiaper)} since the last change. The recent average is about ${averageDiapersPerDay.toFixed(1)} diapers a day.`,
        isOverdue: true,
        actionKind: 'check-diaper',
        priority: 120 + (minutesSinceDiaper - 180),
      });
    } else {
      const dueAt = new Date(parseISO(latestDiaper.timestamp).getTime() + 180 * 60 * 1000);
      upcomingOptions.push({
        kind: 'diaper',
        dueAt,
        title: 'Looking Ahead',
        message: `Next diaper check around ${format(dueAt, 'h:mm a')}.`,
        detail: `It has been ${formatMinutesAsDuration(minutesSinceDiaper)} since the last change.`,
        actionKind: 'check-diaper',
      });
    }
  }

  if (candidates.length === 0) {
    const nextUpcoming = upcomingOptions
      .filter((option) => option.dueAt.getTime() > now.getTime())
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0];

    if (nextUpcoming) {
      return {
        kind: nextUpcoming.kind,
        title: nextUpcoming.title,
        message: nextUpcoming.message,
        detail: nextUpcoming.detail,
        isOverdue: false,
        actionKind: nextUpcoming.actionKind,
      };
    }

    return {
      kind: 'learning',
      title: 'Learning your patterns...',
      message: 'We are watching for the next routine signal.',
      detail: 'Keep logging feeding, sleep, and diaper changes and this card will become more specific.',
      isOverdue: false,
      actionKind: null,
    };
  }

  candidates.sort((a, b) => b.priority - a.priority);
  const bestCandidate = candidates[0];

  return {
    kind: bestCandidate.kind,
    title: bestCandidate.title,
    message: bestCandidate.message,
    detail: bestCandidate.detail,
    isOverdue: bestCandidate.isOverdue,
    actionKind: bestCandidate.actionKind,
  };
}
