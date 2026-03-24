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
  actionLabel?: string | null;
  sleepType?: SleepSession['type'] | null;
}

interface SmartSuggestionCandidate extends SmartSuggestion {
  priority: number;
}

interface UpcomingSuggestionOption {
  dueAt: Date;
  suggestion: SmartSuggestion;
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

type NapTimeBucket = 'early-morning' | 'morning' | 'midday' | 'afternoon' | 'evening';
const NIGHT_SLEEP_MATCH_WINDOW_MINUTES = 90;
const EVENING_BEDTIME_WAKE_HOUR = 19;
const EVENING_BEDTIME_PREDICTION_HOUR = 20;
const FEED_BEDTIME_WINDOW_MINUTES = 45;
const NIGHT_SLEEP_TARGET_LOOKAHEAD_HOURS = 4;

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

function normalizeSleepClockMinutes(date: Date): number {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes < 12 * 60 ? minutes + 24 * 60 : minutes;
}

function formatClockMinutesAsTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const date = new Date(Date.UTC(2026, 0, 1, hours, minutes));

  return format(date, 'h:mm a');
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

function calculateTypicalNightSleepStartMinutes(sleepSessions: SleepSession[]): number | null {
  const nightSleepStarts = sleepSessions
    .filter(
      (session) =>
        !session.isActive &&
        session.type === 'night' &&
        session.endTime &&
        session.duration >= 3 * 60 * 60 &&
        session.duration <= 16 * 60 * 60
    )
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 7)
    .map((session) => normalizeSleepClockMinutes(parseISO(session.startTime)));

  if (nightSleepStarts.length < 2) {
    return null;
  }

  return Math.round(
    nightSleepStarts.reduce((sum, minutes) => sum + minutes, 0) / nightSleepStarts.length
  );
}

function calculateAveragePreBedWakeWindowMinutes(sleepSessions: SleepSession[]): number | null {
  const completedSleep = sleepSessions
    .filter((session) => !session.isActive && session.endTime)
    .sort(
      (a, b) =>
        new Date(a.endTime || a.startTime).getTime() -
        new Date(b.endTime || b.startTime).getTime()
    );

  const recentNightSessions = completedSleep
    .filter((session) => session.type === 'night')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 7);

  const wakeWindows = recentNightSessions
    .map((nightSession) => {
      const previousSleep = [...completedSleep]
        .filter(
          (session) =>
            (session.endTime || session.startTime) < nightSession.startTime &&
            session.id !== nightSession.id
        )
        .sort(
          (a, b) =>
            new Date(b.endTime || b.startTime).getTime() -
            new Date(a.endTime || a.startTime).getTime()
        )[0];

      if (!previousSleep?.endTime) {
        return null;
      }

      const wakeWindowMinutes =
        (new Date(nightSession.startTime).getTime() - new Date(previousSleep.endTime).getTime()) /
        (1000 * 60);

      return wakeWindowMinutes >= 60 && wakeWindowMinutes <= 8 * 60 ? wakeWindowMinutes : null;
    })
    .filter((minutes): minutes is number => minutes !== null);

  if (wakeWindows.length < 2) {
    return null;
  }

  return Math.round(wakeWindows.reduce((sum, minutes) => sum + minutes, 0) / wakeWindows.length);
}

function buildTypicalNightSleepTargetTime(
  latestWakeTime: string,
  typicalNightSleepStart: number | null,
  now: Date
): Date | null {
  if (typicalNightSleepStart === null) {
    return null;
  }

  const latestWake = parseISO(latestWakeTime);
  const targetDate = new Date(latestWake);
  const normalizedMinutes = ((typicalNightSleepStart % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  targetDate.setHours(hours, minutes, 0, 0);

  if (targetDate.getTime() <= latestWake.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const hoursUntilTarget = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (
    latestWake.getHours() < 14 ||
    hoursUntilTarget < -1 ||
    hoursUntilTarget > NIGHT_SLEEP_TARGET_LOOKAHEAD_HOURS
  ) {
    return null;
  }

  return targetDate;
}

function countCompletedNightSleeps(sleepSessions: SleepSession[]): number {
  return sleepSessions.filter(
    (session) =>
      !session.isActive &&
      session.type === 'night' &&
      session.endTime &&
      session.duration >= 3 * 60 * 60 &&
      session.duration <= 16 * 60 * 60
  ).length;
}

function shouldUseEveningBedtimeFallback(
  latestWakeTime: string,
  predictedSleepTime: Date,
  sleepSessions: SleepSession[]
): boolean {
  if (countCompletedNightSleeps(sleepSessions) === 0) {
    return false;
  }

  const latestWake = parseISO(latestWakeTime);
  return latestWake.getHours() >= EVENING_BEDTIME_WAKE_HOUR && predictedSleepTime.getHours() >= EVENING_BEDTIME_PREDICTION_HOUR;
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

export function buildSmartSuggestion({
  feedingSessions,
  bottleSessions,
  sleepSessions,
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
        sleepType: activeSleep.type,
      };
    }

    return {
      kind: 'sleep',
      title: 'Sleeping Now',
      message: activeSleep.type === 'night' ? 'Night sleep is in progress.' : 'Nap is in progress.',
      detail: `This ${activeSleep.type === 'night' ? 'night sleep' : 'nap'} has been going for ${formatMinutesAsDuration(minutesAsleep)}. We will estimate wake-up time after a little more sleep history.`,
      isOverdue: false,
      actionKind: null,
      sleepType: activeSleep.type,
    };
  }

  const trackedDays = countUniqueDays([
    ...feedingSessions.filter((session) => !session.isActive).map((session) => session.startTime),
    ...bottleSessions.map((session) => session.timestamp),
    ...sleepSessions
      .filter((session) => !session.isActive)
      .map((session) => session.endTime || session.startTime),
  ]);

  if (trackedDays < 2) {
    return {
      kind: 'learning',
      title: 'Learning your patterns...',
      message: 'Keep tracking for another day or two and smart suggestions will start feeling personal.',
      detail: 'We need a little more history before we can predict feeding and sleep rhythms.',
      isOverdue: false,
      actionKind: null,
      sleepType: null,
    };
  }

  const candidates: SmartSuggestionCandidate[] = [];
  const upcomingOptions: UpcomingSuggestionOption[] = [];
  const feedEvents = buildCompletedFeedingEvents(feedingSessions, bottleSessions);
  const latestFeeding = feedEvents[0];
  const averageFeedingGapMinutes = calculateAverageFeedingGapMinutes(feedEvents, sleepSessions);
  const feedingDueAt =
    latestFeeding && averageFeedingGapMinutes !== null
      ? new Date(parseISO(latestFeeding.timestamp).getTime() + averageFeedingGapMinutes * 60 * 1000)
      : null;

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
        sleepType: null,
        priority: isOverdue ? 240 + (elapsedSinceLastFeed - averageFeedingGapMinutes) : 140 + elapsedSinceLastFeed,
      });
    } else {
      const dueAt = new Date(parseISO(latestFeeding.timestamp).getTime() + averageFeedingGapMinutes * 60 * 1000);
      upcomingOptions.push({
        dueAt,
        suggestion: {
          kind: 'feeding',
          title: 'Looking Ahead',
          message: `Next likely feed around ${format(dueAt, 'h:mm a')}.`,
          detail: `The recent awake feeding rhythm is about every ${formatMinutesAsDuration(averageFeedingGapMinutes)}.`,
          isOverdue: false,
          actionKind: feedingTypePreference === 'formula' ? 'open-feed' : 'start-feeding',
          sleepType: null,
        },
      });
    }
  }

  const latestCompletedSleep = getLatestCompletedSleep(sleepSessions);
  const averageWakeWindowMinutes = calculateAverageWakeWindowMinutes(sleepSessions, now);

  if (!hasActiveSleep && !activeSleep && latestCompletedSleep?.endTime) {
    const awakeMinutes = differenceInMinutes(now, parseISO(latestCompletedSleep.endTime));
    const typicalNightSleepStart = calculateTypicalNightSleepStartMinutes(sleepSessions);
    const averagePreBedWakeWindowMinutes = calculateAveragePreBedWakeWindowMinutes(sleepSessions);
    const genericPredictedSleepTime =
      averageWakeWindowMinutes !== null
        ? new Date(
            parseISO(latestCompletedSleep.endTime).getTime() + averageWakeWindowMinutes * 60 * 1000
          )
        : null;
    const preBedPredictedSleepTime =
      averagePreBedWakeWindowMinutes !== null
        ? new Date(
            parseISO(latestCompletedSleep.endTime).getTime() +
              averagePreBedWakeWindowMinutes * 60 * 1000
          )
        : null;
    const bedtimeClockTarget = buildTypicalNightSleepTargetTime(
      latestCompletedSleep.endTime,
      typicalNightSleepStart,
      now
    );
    const genericNightMatch =
      genericPredictedSleepTime !== null &&
      typicalNightSleepStart !== null &&
      Math.abs(normalizeSleepClockMinutes(genericPredictedSleepTime) - typicalNightSleepStart) <=
        NIGHT_SLEEP_MATCH_WINDOW_MINUTES;
    const isLikelyNightSleep =
      genericNightMatch ||
      bedtimeClockTarget !== null ||
      (preBedPredictedSleepTime !== null &&
        (now.getHours() >= EVENING_BEDTIME_WAKE_HOUR ||
          parseISO(latestCompletedSleep.endTime).getHours() >= EVENING_BEDTIME_WAKE_HOUR)) ||
      shouldUseEveningBedtimeFallback(
        latestCompletedSleep.endTime,
        genericPredictedSleepTime ?? preBedPredictedSleepTime ?? bedtimeClockTarget ?? new Date(),
        sleepSessions
      );
    const predictedSleepTime =
      (isLikelyNightSleep && preBedPredictedSleepTime) ||
      (isLikelyNightSleep && bedtimeClockTarget) ||
      genericPredictedSleepTime;
    if (!predictedSleepTime) {
      return upcomingOptions[0]?.suggestion ?? {
        kind: 'learning',
        title: 'Looking Ahead',
        message: 'We are watching for the next feeding or sleep window.',
        detail: 'Keep logging feedings and sleep to make these suggestions more personal.',
        isOverdue: false,
        actionKind: null,
      };
    }
    const referenceWakeWindowMinutes =
      isLikelyNightSleep && averagePreBedWakeWindowMinutes !== null
        ? averagePreBedWakeWindowMinutes
        : averageWakeWindowMinutes ??
          Math.max(15, differenceInMinutes(predictedSleepTime, parseISO(latestCompletedSleep.endTime)));
    const minutesUntilPredictedSleep = differenceInMinutes(predictedSleepTime, now);
    const shouldSuggest =
      awakeMinutes >= referenceWakeWindowMinutes - 15 ||
      (isLikelyNightSleep && minutesUntilPredictedSleep <= FEED_BEDTIME_WINDOW_MINUTES);
    const isFeedNearBedtime =
      isLikelyNightSleep &&
      feedingDueAt !== null &&
      Math.abs(predictedSleepTime.getTime() - feedingDueAt.getTime()) <= FEED_BEDTIME_WINDOW_MINUTES * 60 * 1000;

    if (shouldSuggest) {
      const isOverdue = awakeMinutes >= referenceWakeWindowMinutes;
      candidates.push({
        kind: 'sleep',
        title: isLikelyNightSleep
          ? isFeedNearBedtime
            ? 'Feed, Then Bedtime'
            : 'Time for Bed'
          : 'Time for a Nap',
        message: isOverdue
          ? isLikelyNightSleep
            ? isFeedNearBedtime
              ? 'A feeding and bedtime window are open right now.'
              : 'The bedtime window is open right now.'
            : 'The nap window is open right now.'
          : isLikelyNightSleep
            ? isFeedNearBedtime
              ? 'A feeding and bedtime window are coming up soon.'
              : 'Bedtime is coming up soon.'
            : 'A nap window is coming up soon.',
        detail: isLikelyNightSleep && typicalNightSleepStart !== null
          ? isFeedNearBedtime && feedingDueAt !== null
            ? `Baby has been awake for ${formatMinutesAsDuration(awakeMinutes)}. The next feed is likely around ${format(feedingDueAt, 'h:mm a')}, and bedtime usually follows around ${format(predictedSleepTime, 'h:mm a')}.`
            : `Baby has been awake for ${formatMinutesAsDuration(awakeMinutes)}. The recent pre-bed wake window is about ${formatMinutesAsDuration(referenceWakeWindowMinutes)}, and night sleep often starts around ${formatClockMinutesAsTime(typicalNightSleepStart)}.`
          : `Baby has been awake for ${formatMinutesAsDuration(awakeMinutes)}. The recent 3-day wake window is about ${formatMinutesAsDuration(referenceWakeWindowMinutes)}.`,
        isOverdue,
        actionKind:
          isFeedNearBedtime && feedingTypePreference !== 'formula'
            ? 'start-feeding'
            : isFeedNearBedtime
              ? 'open-feed'
              : 'start-sleep',
        actionLabel: isFeedNearBedtime ? 'Start Feed First' : isLikelyNightSleep ? 'Start Bedtime' : null,
        sleepType: isLikelyNightSleep ? 'night' : 'nap',
        priority: isOverdue
          ? (isFeedNearBedtime ? 340 : 300) + (awakeMinutes - referenceWakeWindowMinutes)
          : (isFeedNearBedtime ? 220 : 180) + awakeMinutes,
      });
    } else {
      upcomingOptions.push({
        dueAt: predictedSleepTime,
        suggestion: {
          kind: 'sleep',
          title: 'Looking Ahead',
          message: isLikelyNightSleep
            ? isFeedNearBedtime && feedingDueAt !== null
              ? `Feed and bedtime likely around ${format(feedingDueAt, 'h:mm a')} to ${format(predictedSleepTime, 'h:mm a')}.`
              : `Bedtime likely around ${format(predictedSleepTime, 'h:mm a')}.`
            : `Next likely nap around ${format(predictedSleepTime, 'h:mm a')}.`,
          detail: isLikelyNightSleep && typicalNightSleepStart !== null
            ? isFeedNearBedtime && feedingDueAt !== null
              ? `The next feed is likely around ${format(feedingDueAt, 'h:mm a')}, and bedtime often starts around ${formatClockMinutesAsTime(typicalNightSleepStart)}.`
              : `The recent pre-bed wake window is about ${formatMinutesAsDuration(referenceWakeWindowMinutes)}, and night sleep often starts around ${formatClockMinutesAsTime(typicalNightSleepStart)}.`
            : `The recent 3-day wake window is about ${formatMinutesAsDuration(referenceWakeWindowMinutes)}.`,
          isOverdue: false,
          actionKind:
            isFeedNearBedtime && feedingTypePreference !== 'formula'
              ? 'start-feeding'
              : isFeedNearBedtime
                ? 'open-feed'
                : 'start-sleep',
          actionLabel: isFeedNearBedtime ? 'Start Feed First' : isLikelyNightSleep ? 'Start Bedtime' : null,
          sleepType: isLikelyNightSleep ? 'night' : 'nap',
        },
      });
    }
  }

  if (candidates.length === 0) {
    const nextUpcoming = upcomingOptions
      .filter((option) => option.dueAt.getTime() > now.getTime())
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0];

    if (nextUpcoming) {
      return nextUpcoming.suggestion;
    }

    return {
      kind: 'learning',
      title: 'Looking Ahead',
      message: 'We are watching for the next feeding or sleep window.',
      detail: 'Keep logging feedings and sleep to make these suggestions more personal.',
      isOverdue: false,
      actionKind: null,
      sleepType: null,
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
    actionLabel: bestCandidate.actionLabel ?? null,
    sleepType: bestCandidate.sleepType ?? null,
  };
}
