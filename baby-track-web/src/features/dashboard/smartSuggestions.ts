import {
  differenceInMinutes,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import { groupNightSleepSessions } from '@/features/sleep/sleepGrouping';
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
const PREDICTION_LOOKBACK_DAYS = 14;
const SIMILAR_CLOCK_WINDOW_MINUTES = 90;
const MAX_FEEDING_GAP_MINUTES = 8 * 60;
const MAX_FEEDING_STALENESS_MINUTES = 8 * 60;
const MAX_SLEEP_STALENESS_MINUTES = 18 * 60;

interface SleepDurationEstimate {
  minutes: number;
  label: string;
}

interface WakeWindowSample {
  minutes: number;
  wakeTime: string;
  nextSleepStartTime: string;
}

interface WakeWindowEstimate {
  minutes: number;
  label: string;
}

interface IntervalSample {
  minutes: number;
  anchorTime: string;
}

interface FeedingGapEstimate {
  minutes: number;
  label: string;
}

interface NightSleepPattern {
  startTime: string;
  endTime: string;
  durationMinutes: number;
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
  const date = new Date(2026, 0, 1, hours, minutes);

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

function getWakeWindowTimeBucketLabel(bucket: NapTimeBucket): string {
  switch (bucket) {
    case 'early-morning':
      return 'recent early-morning wake window';
    case 'morning':
      return 'recent morning wake window';
    case 'midday':
      return 'recent midday wake window';
    case 'afternoon':
      return 'recent afternoon wake window';
    case 'evening':
      return 'recent evening wake window';
    default:
      return 'recent 3-day wake window';
  }
}

function getClockMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function getClockDistanceMinutes(first: Date, second: Date): number {
  const diff = Math.abs(getClockMinutes(first) - getClockMinutes(second));
  return Math.min(diff, 24 * 60 - diff);
}

function calculateMedian(values: number[]): number {
  const sortedValues = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return Math.round((sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2);
  }

  return Math.round(sortedValues[middleIndex]);
}

function getFeedingGapLabel(timestamp: string): string {
  switch (getNapTimeBucket(timestamp)) {
    case 'early-morning':
      return 'recent early-morning feeding rhythm';
    case 'morning':
      return 'recent morning feeding rhythm';
    case 'midday':
      return 'recent midday feeding rhythm';
    case 'afternoon':
      return 'recent afternoon feeding rhythm';
    case 'evening':
      return 'recent evening feeding rhythm';
    default:
      return 'recent awake feeding rhythm';
  }
}

function isCompletedSleepSession(session: SleepSession): boolean {
  return !session.isActive && session.duration > 0 && !!session.startTime;
}

function getSleepWakeTime(session: SleepSession): string {
  return new Date(parseISO(session.startTime).getTime() + session.duration * 1000).toISOString();
}

function getSleepWakeMs(session: SleepSession): number {
  return parseISO(session.startTime).getTime() + session.duration * 1000;
}

function buildNightSleepGroups(sleepSessions: SleepSession[]) {
  return groupNightSleepSessions(
    sleepSessions.map((session) =>
      session.type === 'night' && !session.isActive && !session.endTime && session.duration > 0
        ? { ...session, endTime: getSleepWakeTime(session) }
        : session
    )
  );
}

function buildCompletedNightSleepPatterns(
  sleepSessions: SleepSession[],
  now?: Date
): NightSleepPattern[] {
  return buildNightSleepGroups(sleepSessions)
    .filter(
      (group) =>
        !group.isActive &&
        group.endTime !== null &&
        (!now || parseISO(group.endTime).getTime() <= now.getTime())
    )
    .map((group) => ({
      startTime: group.startTime,
      endTime: group.endTime as string,
      durationMinutes: differenceInMinutes(parseISO(group.endTime as string), parseISO(group.startTime)),
    }))
    .filter(
      (pattern) =>
        pattern.durationMinutes >= 3 * 60 && pattern.durationMinutes <= 16 * 60
    );
}

function getActiveNightSleepGroupStart(
  sleepSessions: SleepSession[],
  activeSleepId: string
): string | null {
  return (
    buildNightSleepGroups(sleepSessions).find((group) =>
      group.sessions.some((session) => session.id === activeSleepId)
    )?.startTime ?? null
  );
}

function isAtOrBefore(timestamp: string, now: Date): boolean {
  return parseISO(timestamp).getTime() <= now.getTime();
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
  return buildNightSleepGroups(sleepSessions)
    .filter((group) => !group.isActive && group.endTime !== null)
    .map((group) => ({
      start: parseISO(group.startTime).getTime(),
      end: parseISO(group.endTime as string).getTime(),
    }));
}

function getLatestCompletedSleep(sleepSessions: SleepSession[], now: Date): SleepSession | null {
  const completedSessions = sleepSessions
    .filter(isCompletedSleepSession)
    .filter((session) => getSleepWakeMs(session) <= now.getTime())
    .sort((a, b) => getSleepWakeMs(b) - getSleepWakeMs(a));

  return completedSessions[0] || null;
}

function calculateFeedingGapEstimate(
  feedEvents: Array<{ timestamp: string }>,
  sleepSessions: SleepSession[],
  latestFeedingTime: string,
  now: Date
): FeedingGapEstimate | null {
  if (feedEvents.length < 3) {
    return null;
  }

  const recentEvents = [...feedEvents]
    .filter(
      (event) =>
        parseISO(event.timestamp).getTime() >=
        startOfDay(subDays(now, PREDICTION_LOOKBACK_DAYS - 1)).getTime()
    )
    .slice(0, 24)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const nightSleepRanges = buildNightSleepRanges(sleepSessions);
  const gapSamples: IntervalSample[] = [];

  for (let index = 1; index < recentEvents.length; index += 1) {
    const previousEvent = recentEvents[index - 1];
    const currentEvent = recentEvents[index];
    const previous = new Date(previousEvent.timestamp).getTime();
    const current = new Date(currentEvent.timestamp).getTime();
    const minutes = (current - previous) / (1000 * 60);
    const overlapsNightSleep = nightSleepRanges.some((sleep) => sleep.start < current && sleep.end > previous);

    if (!overlapsNightSleep && minutes > 30 && minutes <= MAX_FEEDING_GAP_MINUTES) {
      gapSamples.push({
        minutes,
        anchorTime: previousEvent.timestamp,
      });
    }
  }

  if (gapSamples.length < 2) {
    return null;
  }

  const latestFeedingDate = parseISO(latestFeedingTime);
  const similarClockSamples = gapSamples.filter(
    (sample) =>
      getClockDistanceMinutes(parseISO(sample.anchorTime), latestFeedingDate) <=
      SIMILAR_CLOCK_WINDOW_MINUTES
  );
  const targetBucket = getNapTimeBucket(latestFeedingTime);
  const matchingBucketSamples = gapSamples.filter(
    (sample) => getNapTimeBucket(sample.anchorTime) === targetBucket
  );
  const selectedSamples =
    similarClockSamples.length >= 2
      ? similarClockSamples
      : matchingBucketSamples.length >= 2
        ? matchingBucketSamples
        : gapSamples;

  return {
    minutes: calculateMedian(selectedSamples.map((sample) => sample.minutes)),
    label:
      selectedSamples === gapSamples
        ? 'recent awake feeding rhythm'
        : getFeedingGapLabel(latestFeedingTime),
  };
}

function estimateWakeWindowSamples(samples: WakeWindowSample[]): number {
  return calculateMedian(samples.map((sample) => sample.minutes));
}

function buildRecentWakeWindowSamples(
  sleepSessions: SleepSession[],
  now: Date
): WakeWindowSample[] {
  const threeDayWindow = {
    start: startOfDay(subDays(now, 2)),
    end: now,
  };

  const completedSleep = sleepSessions
    .filter(isCompletedSleepSession)
    .filter((session) => getSleepWakeMs(session) <= now.getTime())
    .sort((a, b) => getSleepWakeMs(a) - getSleepWakeMs(b));

  const recentNaps = completedSleep
    .filter(
      (session) =>
        session.type === 'nap' &&
        isWithinInterval(parseISO(session.startTime), threeDayWindow)
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const wakeWindows: WakeWindowSample[] = [];
  let pointer = 0;
  let latestWakeTime: string | null = null;

  recentNaps.forEach((nap) => {
    while (
      pointer < completedSleep.length &&
      getSleepWakeMs(completedSleep[pointer]) < new Date(nap.startTime).getTime()
    ) {
      latestWakeTime = getSleepWakeTime(completedSleep[pointer]);
      pointer += 1;
    }

    if (!latestWakeTime) {
      return;
    }

    const wakeMinutes =
      (new Date(nap.startTime).getTime() - new Date(latestWakeTime).getTime()) / (1000 * 60);

    if (wakeMinutes >= 45 && wakeMinutes <= 6 * 60) {
      wakeWindows.push({
        minutes: wakeMinutes,
        wakeTime: latestWakeTime,
        nextSleepStartTime: nap.startTime,
      });
    }
  });

  return wakeWindows;
}

function calculateTimeAwareWakeWindowEstimate(
  sleepSessions: SleepSession[],
  now: Date,
  latestWakeTime: string
): WakeWindowEstimate | null {
  const wakeWindowSamples = buildRecentWakeWindowSamples(sleepSessions, now);

  if (wakeWindowSamples.length === 0) {
    return null;
  }

  const broadEstimateMinutes = estimateWakeWindowSamples(wakeWindowSamples);
  const targetTime = new Date(
    parseISO(latestWakeTime).getTime() + broadEstimateMinutes * 60 * 1000
  );
  const targetBucket = getNapTimeBucket(targetTime.toISOString());
  const matchingBucketSamples = wakeWindowSamples.filter(
    (sample) => getNapTimeBucket(sample.nextSleepStartTime) === targetBucket
  );

  if (
    matchingBucketSamples.length >= 2 ||
    (wakeWindowSamples.length === 1 && matchingBucketSamples.length === 1)
  ) {
    return {
      minutes: estimateWakeWindowSamples(matchingBucketSamples),
      label: getWakeWindowTimeBucketLabel(targetBucket),
    };
  }

  const closestClockSamples = [...wakeWindowSamples]
    .sort(
      (a, b) =>
        getClockDistanceMinutes(parseISO(a.nextSleepStartTime), targetTime) -
        getClockDistanceMinutes(parseISO(b.nextSleepStartTime), targetTime)
    )
    .filter((sample) => getClockDistanceMinutes(parseISO(sample.nextSleepStartTime), targetTime) <= 3 * 60)
    .slice(0, 3);

  if (closestClockSamples.length >= 2) {
    return {
      minutes: estimateWakeWindowSamples(closestClockSamples),
      label: 'recent similar-time wake window',
    };
  }

  return {
    minutes: estimateWakeWindowSamples(wakeWindowSamples),
    label: 'recent 3-day wake window',
  };
}

function calculateTypicalNightSleepStartMinutes(sleepSessions: SleepSession[], now: Date): number | null {
  const nightSleepStarts = buildCompletedNightSleepPatterns(sleepSessions, now)
    .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime())
    .slice(0, 7)
    .map((pattern) => normalizeSleepClockMinutes(parseISO(pattern.startTime)));

  if (nightSleepStarts.length < 2) {
    return null;
  }

  return calculateMedian(nightSleepStarts);
}

function calculateAveragePreBedWakeWindowMinutes(sleepSessions: SleepSession[], now: Date): number | null {
  const completedSleep = sleepSessions
    .filter(isCompletedSleepSession)
    .filter((session) => getSleepWakeMs(session) <= now.getTime())
    .sort((a, b) => getSleepWakeMs(a) - getSleepWakeMs(b));

  const recentNightPatterns = buildCompletedNightSleepPatterns(sleepSessions, now)
    .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime())
    .slice(0, 7);

  const wakeWindows = recentNightPatterns
    .map((nightPattern) => {
      const previousSleep = [...completedSleep]
        .filter(
          (session) =>
            getSleepWakeMs(session) < parseISO(nightPattern.startTime).getTime()
        )
        .sort((a, b) => getSleepWakeMs(b) - getSleepWakeMs(a))[0];

      if (!previousSleep) {
        return null;
      }

      const wakeWindowMinutes =
        (parseISO(nightPattern.startTime).getTime() - getSleepWakeMs(previousSleep)) /
        (1000 * 60);

      return wakeWindowMinutes >= 60 && wakeWindowMinutes <= 8 * 60 ? wakeWindowMinutes : null;
    })
    .filter((minutes): minutes is number => minutes !== null);

  if (wakeWindows.length < 2) {
    return null;
  }

  return calculateMedian(wakeWindows);
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

function countCompletedNightSleeps(sleepSessions: SleepSession[], now: Date): number {
  return buildCompletedNightSleepPatterns(sleepSessions, now).length;
}

function shouldUseEveningBedtimeFallback(
  latestWakeTime: string,
  predictedSleepTime: Date,
  sleepSessions: SleepSession[],
  now: Date
): boolean {
  if (countCompletedNightSleeps(sleepSessions, now) === 0) {
    return false;
  }

  const latestWake = parseISO(latestWakeTime);
  return latestWake.getHours() >= EVENING_BEDTIME_WAKE_HOUR && predictedSleepTime.getHours() >= EVENING_BEDTIME_PREDICTION_HOUR;
}

function choosePredictedSleepTime(
  isLikelyNightSleep: boolean,
  preBedPredictedSleepTime: Date | null,
  bedtimeClockTarget: Date | null,
  genericPredictedSleepTime: Date | null,
  now: Date
): Date | null {
  if (!isLikelyNightSleep) {
    return genericPredictedSleepTime;
  }

  const isViable = (prediction: Date | null): prediction is Date =>
    prediction !== null && differenceInMinutes(now, prediction) <= 60;
  const viablePreBedPrediction = isViable(preBedPredictedSleepTime)
    ? preBedPredictedSleepTime
    : null;
  const viableClockTarget = isViable(bedtimeClockTarget) ? bedtimeClockTarget : null;

  if (viablePreBedPrediction && viableClockTarget) {
    const predictionDifference = Math.abs(
      viablePreBedPrediction.getTime() - viableClockTarget.getTime()
    );

    if (predictionDifference <= NIGHT_SLEEP_MATCH_WINDOW_MINUTES * 60 * 1000) {
      return new Date(
        Math.round((viablePreBedPrediction.getTime() + viableClockTarget.getTime()) / 2)
      );
    }

    return viablePreBedPrediction;
  }

  return (
    viablePreBedPrediction ??
    viableClockTarget ??
    (isViable(genericPredictedSleepTime) ? genericPredictedSleepTime : null) ??
    preBedPredictedSleepTime ??
    bedtimeClockTarget ??
    genericPredictedSleepTime
  );
}

function calculateAverageSleepDurationMinutes(
  sleepSessions: SleepSession[],
  sleepType: SleepSession['type'],
  now: Date,
  activeSleepStartTime?: string
): SleepDurationEstimate | null {
  const lookbackStart =
    sleepType === 'night' ? startOfDay(subDays(now, 6)) : startOfDay(subDays(now, 2));

  if (sleepType === 'night') {
    const completedNightPatterns = buildCompletedNightSleepPatterns(sleepSessions, now)
      .filter(
        (pattern) =>
          isWithinInterval(parseISO(pattern.endTime), {
            start: lookbackStart,
            end: now,
          })
      )
      .sort((a, b) => parseISO(b.endTime).getTime() - parseISO(a.endTime).getTime())
      .slice(0, 5);

    if (completedNightPatterns.length < 2) {
      return null;
    }

    return {
      minutes: calculateMedian(
        completedNightPatterns.map((pattern) => pattern.durationMinutes)
      ),
      label: 'recent night sleep',
    };
  }

  const completedSessions = sleepSessions
    .filter(
      (session) =>
        !session.isActive &&
        isCompletedSleepSession(session) &&
        session.type === sleepType &&
        isWithinInterval(parseISO(getSleepWakeTime(session)), {
          start: lookbackStart,
          end: now,
        })
    )
    .filter((session) => session.duration >= 20 * 60 && session.duration <= 4 * 60 * 60)
    .sort((a, b) => getSleepWakeMs(b) - getSleepWakeMs(a))
    .slice(0, 5);

  if (completedSessions.length < 2) {
    return null;
  }

  if (sleepType === 'nap' && activeSleepStartTime) {
    const activeBucket = getNapTimeBucket(activeSleepStartTime);
    const matchingBucketSessions = completedSessions.filter(
      (session) => getNapTimeBucket(session.startTime) === activeBucket
    );

    if (matchingBucketSessions.length >= 2) {
      return {
        minutes: calculateMedian(matchingBucketSessions.map((session) => session.duration / 60)),
        label: getNapTimeBucketLabel(activeBucket),
      };
    }
  }

  return {
    minutes: calculateMedian(completedSessions.map((session) => session.duration / 60)),
    label: 'recent naps',
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
  const activeSleep = sleepSessions.find(
    (session) => session.isActive && parseISO(session.startTime).getTime() <= now.getTime()
  );

  if (activeSleep) {
    const predictionStartTime =
      activeSleep.type === 'night'
        ? getActiveNightSleepGroupStart(sleepSessions, activeSleep.id) ?? activeSleep.startTime
        : activeSleep.startTime;
    const sleepDurationEstimate = calculateAverageSleepDurationMinutes(
      sleepSessions,
      activeSleep.type,
      now,
      activeSleep.startTime
    );
    const minutesAsleep = differenceInMinutes(now, parseISO(predictionStartTime));

    if (sleepDurationEstimate !== null) {
      const dueAt = new Date(
        parseISO(predictionStartTime).getTime() + sleepDurationEstimate.minutes * 60 * 1000
      );
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
    ...feedingSessions
      .filter((session) => !session.isActive)
      .map((session) => session.startTime)
      .filter((timestamp) => isAtOrBefore(timestamp, now)),
    ...bottleSessions
      .map((session) => session.timestamp)
      .filter((timestamp) => isAtOrBefore(timestamp, now)),
    ...sleepSessions
      .filter(isCompletedSleepSession)
      .map(getSleepWakeTime)
      .filter((timestamp) => isAtOrBefore(timestamp, now)),
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
  const feedEvents = buildCompletedFeedingEvents(feedingSessions, bottleSessions).filter(
    (event) => parseISO(event.timestamp).getTime() <= now.getTime()
  );
  const latestFeeding = feedEvents[0];
  const feedingGapEstimate = latestFeeding
    ? calculateFeedingGapEstimate(feedEvents, sleepSessions, latestFeeding.timestamp, now)
    : null;
  const averageFeedingGapMinutes = feedingGapEstimate?.minutes ?? null;
  const elapsedSinceLastFeed = latestFeeding
    ? differenceInMinutes(now, parseISO(latestFeeding.timestamp))
    : null;
  const hasRecentFeeding =
    elapsedSinceLastFeed !== null && elapsedSinceLastFeed <= MAX_FEEDING_STALENESS_MINUTES;
  const feedingDueAt =
    latestFeeding && averageFeedingGapMinutes !== null && hasRecentFeeding
      ? new Date(parseISO(latestFeeding.timestamp).getTime() + averageFeedingGapMinutes * 60 * 1000)
      : null;

  if (
    !hasActiveFeeding &&
    latestFeeding &&
    averageFeedingGapMinutes !== null &&
    elapsedSinceLastFeed !== null &&
    hasRecentFeeding
  ) {
    const shouldSuggest = elapsedSinceLastFeed >= averageFeedingGapMinutes - 30;

    if (shouldSuggest) {
      const isOverdue = elapsedSinceLastFeed >= averageFeedingGapMinutes;
      candidates.push({
        kind: 'feeding',
        title: isOverdue ? 'Hungry Soon' : 'Hungry Soon',
        message: isOverdue
          ? 'The usual feeding window is here.'
          : 'A feeding window is coming up soon.',
        detail: `Last feeding was ${formatMinutesAsDuration(elapsedSinceLastFeed)} ago. The ${feedingGapEstimate?.label ?? 'recent awake feeding rhythm'} is about every ${formatMinutesAsDuration(averageFeedingGapMinutes)}.`,
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
          detail: `The ${feedingGapEstimate?.label ?? 'recent awake feeding rhythm'} is about every ${formatMinutesAsDuration(averageFeedingGapMinutes)}.`,
          isOverdue: false,
          actionKind: feedingTypePreference === 'formula' ? 'open-feed' : 'start-feeding',
          sleepType: null,
        },
      });
    }
  }

  const latestCompletedSleep = getLatestCompletedSleep(sleepSessions, now);

  if (
    !hasActiveSleep &&
    !activeSleep &&
    latestCompletedSleep &&
    differenceInMinutes(now, parseISO(getSleepWakeTime(latestCompletedSleep))) <=
      MAX_SLEEP_STALENESS_MINUTES
  ) {
    const latestWakeTime = getSleepWakeTime(latestCompletedSleep);
    const awakeMinutes = differenceInMinutes(now, parseISO(latestWakeTime));
    const typicalNightSleepStart = calculateTypicalNightSleepStartMinutes(sleepSessions, now);
    const averagePreBedWakeWindowMinutes = calculateAveragePreBedWakeWindowMinutes(sleepSessions, now);
    const wakeWindowEstimate = calculateTimeAwareWakeWindowEstimate(
      sleepSessions,
      now,
      latestWakeTime
    );
    const averageWakeWindowMinutes = wakeWindowEstimate?.minutes ?? null;
    const genericPredictedSleepTime =
      averageWakeWindowMinutes !== null
        ? new Date(
            parseISO(latestWakeTime).getTime() + averageWakeWindowMinutes * 60 * 1000
          )
        : null;
    const preBedPredictedSleepTime =
      averagePreBedWakeWindowMinutes !== null
        ? new Date(
            parseISO(latestWakeTime).getTime() +
              averagePreBedWakeWindowMinutes * 60 * 1000
          )
        : null;
    const bedtimeClockTarget = buildTypicalNightSleepTargetTime(
      latestWakeTime,
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
          parseISO(latestWakeTime).getHours() >= EVENING_BEDTIME_WAKE_HOUR)) ||
      shouldUseEveningBedtimeFallback(
        latestWakeTime,
        genericPredictedSleepTime ?? preBedPredictedSleepTime ?? bedtimeClockTarget ?? new Date(),
        sleepSessions,
        now
      );
    const predictedSleepTime = choosePredictedSleepTime(
      isLikelyNightSleep,
      preBedPredictedSleepTime,
      bedtimeClockTarget,
      genericPredictedSleepTime,
      now
    );
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
          Math.max(15, differenceInMinutes(predictedSleepTime, parseISO(latestWakeTime)));
    const referenceWakeWindowLabel =
      isLikelyNightSleep && averagePreBedWakeWindowMinutes !== null
        ? 'recent pre-bed wake window'
        : wakeWindowEstimate?.label ?? 'recent 3-day wake window';
    const minutesUntilPredictedSleep = differenceInMinutes(predictedSleepTime, now);
    const shouldSuggest =
      awakeMinutes >= referenceWakeWindowMinutes - 15 ||
      (isLikelyNightSleep && minutesUntilPredictedSleep <= FEED_BEDTIME_WINDOW_MINUTES);
    const isFeedNearBedtime =
      isLikelyNightSleep &&
      !hasActiveFeeding &&
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
          : `Baby has been awake for ${formatMinutesAsDuration(awakeMinutes)}. The ${referenceWakeWindowLabel} is about ${formatMinutesAsDuration(referenceWakeWindowMinutes)}.`,
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
            : `The ${referenceWakeWindowLabel} is about ${formatMinutesAsDuration(referenceWakeWindowMinutes)}.`,
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
