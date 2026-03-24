import {
  endOfDay,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns';
import type {
  BottleSession,
  DiaperChange,
  FeedingSession,
  PlaySession,
  PumpSession,
  SleepSession,
  WalkSession,
} from '@/types';
import {
  BREAST_SIDE_CONFIG,
  BOTTLE_CONTENT_CONFIG,
  DIAPER_TYPE_CONFIG,
  PLAY_TYPE_CONFIG,
  SLEEP_TYPE_CONFIG,
  convertVolume,
  formatDuration,
  formatSleepDuration,
} from '@/types';

export type TimeFilter = 'today' | 'week' | 'all';
export type HistoryFilter = 'all' | 'feeding' | 'sleep' | 'diaper' | 'play' | 'walks';

export interface StatsDataSnapshot {
  feedingSessions: FeedingSession[];
  pumpSessions: PumpSession[];
  bottleSessions: BottleSession[];
  sleepSessions: SleepSession[];
  diaperChanges: DiaperChange[];
  playSessions: PlaySession[];
  walkSessions: WalkSession[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FilteredStatsData {
  feedingSessions: FeedingSession[];
  pumpSessions: PumpSession[];
  bottleSessions: BottleSession[];
  sleepSessions: SleepSession[];
  diaperChanges: DiaperChange[];
  playSessions: PlaySession[];
  walkSessions: WalkSession[];
}

export interface StatsSummary {
  feedingTime: number;
  nursingCount: number;
  pumpVolume: number;
  pumpCount: number;
  bottleVolume: number;
  bottleCount: number;
  sleepTime: number;
  napCount: number;
  nightCount: number;
  diaperCount: number;
  wetCount: number;
  fullCount: number;
  playTime: number;
  playCount: number;
  walkTime: number;
  walkCount: number;
}

export interface FeedingChartPoint {
  name: string;
  feeding: number;
  pump: number;
  bottle: number;
}

export type HistoryIcon = 'baby' | 'milk' | 'droplet' | 'moon' | 'sun' | 'leaf' | 'gamepad' | 'footprints';

export interface HistoryItem {
  id: string;
  type: 'breastfeeding' | 'bottle' | 'pump' | 'sleep' | 'diaper' | 'play' | 'walk';
  timestamp: string;
  duration?: number;
  details: string;
  subDetails?: string;
  color: string;
  icon: HistoryIcon;
}

export interface HistoryGroup {
  date: string;
  dateLabel: string;
  items: HistoryItem[];
}

export interface WeeklyInsightMetric {
  id: 'sleep' | 'nursing' | 'bottle' | 'diaper' | 'play' | 'walk';
  currentValue: number;
  previousValue: number;
  change: number;
}

export interface InsightPatternCard {
  id: string;
  title: string;
  value: string;
  description: string;
  tone: 'amber' | 'blue' | 'indigo' | 'green';
}

export interface TimelineLane {
  id: 'sleep' | 'feeding';
  title: string;
  subtitle: string;
  peakHours: number[];
  hourlyIntensity: number[];
}

export interface InsightsSummary {
  hasEnoughData: boolean;
  readinessCount: number;
  readinessTarget: number;
  readinessPercent: number;
  weekly: {
    sleep: WeeklyInsightMetric;
    nursing: WeeklyInsightMetric;
    bottle: WeeklyInsightMetric;
    diaper: WeeklyInsightMetric;
    play: WeeklyInsightMetric;
    walk: WeeklyInsightMetric;
  };
  averages: {
    sleepPerDay: number;
    nursingPerDay: number;
    bottlePerDay: number;
    diapersPerDay: number;
    playPerDay: number;
    walkPerDay: number;
  };
  headline: string;
  subheadline: string;
  sweetSpot: {
    recommendedTime: string | null;
    averageWakeWindowHours: number | null;
    predictedFeedWakeTime: string | null;
    averageEarlyFeedWakeHours: number | null;
    predictedWakeTime: string | null;
    averageNightSleepHours: number | null;
    wakePredictionBasis: string | null;
    lastWakeTime: string | null;
    sleepType: 'nap' | 'night';
    status: 'ready' | 'soon' | 'building';
  };
  feedingSweetSpot: {
    recommendedTime: string | null;
    averageGapHours: number | null;
    lastFeedingTime: string | null;
    status: 'ready' | 'soon' | 'building';
  };
  combinedSweetSpot: {
    recommendedStartTime: string;
    recommendedEndTime: string;
    status: 'ready' | 'soon';
  } | null;
  consistencyScore: number;
  consistencyLabel: string;
  timeline: {
    sleep: TimelineLane;
    feeding: TimelineLane;
  };
  routineSummary: string[];
  patternCards: InsightPatternCard[];
}

const MIN_PATTERN_EVENTS = 5;
const MIN_PATTERN_NAP_SECONDS = 20 * 60;
const MAX_PATTERN_NAP_SECONDS = 4 * 60 * 60;
const MIN_PATTERN_NURSING_SECONDS = 5 * 60;
const MIN_PATTERN_BOTTLE_ML = 10;
const MERGED_SWEET_SPOT_WINDOW_MINUTES = 30;
const NIGHT_SLEEP_MATCH_WINDOW_MINUTES = 90;
const NIGHT_SLEEP_TARGET_LOOKAHEAD_HOURS = 4;
const EVENING_BEDTIME_WAKE_HOUR = 19;
const EVENING_BEDTIME_PREDICTION_HOUR = 20;
const NIGHT_SLEEP_MERGE_GAP_HOURS = 3;

interface NightSleepBlock {
  startTime: string;
  endTime: string;
  firstWakeTime: string | null;
}

type SleepTimeBucket = 'early-morning' | 'morning' | 'midday' | 'afternoon' | 'evening';

export const EMPTY_STATS_DATA: StatsDataSnapshot = {
  feedingSessions: [],
  pumpSessions: [],
  bottleSessions: [],
  sleepSessions: [],
  diaperChanges: [],
  playSessions: [],
  walkSessions: [],
};

export function getDateRange(timeFilter: TimeFilter, now: Date = new Date()): DateRange {
  if (timeFilter === 'today') {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (timeFilter === 'week') {
    return { start: startOfWeek(now), end: endOfWeek(now) };
  }

  return { start: new Date(0), end: now };
}

function getTimestampFromItem(item: { startTime?: string; timestamp?: string }): string {
  return item.startTime || item.timestamp || '';
}

function filterByRange<T extends { startTime?: string; timestamp?: string }>(
  items: T[],
  range: DateRange
): T[] {
  return items.filter((item) => {
    const timestamp = getTimestampFromItem(item);
    if (!timestamp) {
      return false;
    }

    return isWithinInterval(parseISO(timestamp), range);
  });
}

function filterCompletedSleepSessionsByRange(sessions: SleepSession[], range: DateRange): SleepSession[] {
  return sessions.filter((session) => {
    if (session.isActive || !session.endTime) {
      return false;
    }

    const relevantTimestamp = session.type === 'nap' ? session.startTime : session.endTime;
    return isWithinInterval(parseISO(relevantTimestamp), range);
  });
}

function filterCompletedPlaySessionsByRange(sessions: PlaySession[], range: DateRange): PlaySession[] {
  return filterByRange(
    sessions.filter((session) => !session.isActive),
    range
  );
}

function filterCompletedWalkSessionsByRange(sessions: WalkSession[], range: DateRange): WalkSession[] {
  return filterByRange(
    sessions.filter((session) => !session.isActive),
    range
  );
}

export function getFilteredStatsData(
  data: StatsDataSnapshot,
  range: DateRange
): FilteredStatsData {
  return {
    feedingSessions: filterByRange(
      data.feedingSessions.filter((session) => !session.isActive),
      range
    ),
    pumpSessions: filterByRange(data.pumpSessions, range),
    bottleSessions: filterByRange(data.bottleSessions, range),
    sleepSessions: filterCompletedSleepSessionsByRange(data.sleepSessions, range),
    diaperChanges: filterByRange(data.diaperChanges, range),
    playSessions: filterCompletedPlaySessionsByRange(data.playSessions, range),
    walkSessions: filterCompletedWalkSessionsByRange(data.walkSessions, range),
  };
}

export function buildStatsSummary(
  filteredData: FilteredStatsData,
  volumeUnit: 'oz' | 'ml'
): StatsSummary {
  const sleepSessions = filteredData.sleepSessions;
  const diaperChanges = filteredData.diaperChanges;

  return {
    feedingTime: filteredData.feedingSessions.reduce((sum, session) => sum + session.duration, 0),
    nursingCount: filteredData.feedingSessions.length,
    pumpVolume: filteredData.pumpSessions.reduce(
      (sum, session) => sum + convertVolume(session.volume, session.volumeUnit, volumeUnit),
      0
    ),
    pumpCount: filteredData.pumpSessions.length,
    bottleVolume: filteredData.bottleSessions.reduce(
      (sum, session) => sum + convertVolume(session.volume, session.volumeUnit, volumeUnit),
      0
    ),
    bottleCount: filteredData.bottleSessions.length,
    sleepTime: sleepSessions.reduce((sum, session) => sum + session.duration, 0),
    napCount: sleepSessions.filter((session) => session.type === 'nap').length,
    nightCount: sleepSessions.filter((session) => session.type === 'night').length,
    diaperCount: diaperChanges.length,
    wetCount: diaperChanges.filter((change) => change.type === 'wet').length,
    fullCount: diaperChanges.filter((change) => (change.type as string) !== 'wet').length,
    playTime: filteredData.playSessions.reduce((sum, session) => sum + session.duration, 0),
    playCount: filteredData.playSessions.length,
    walkTime: filteredData.walkSessions.reduce((sum, session) => sum + session.duration, 0),
    walkCount: filteredData.walkSessions.length,
  };
}

export function buildFeedingChartData(
  filteredData: FilteredStatsData,
  timeFilter: TimeFilter,
  volumeUnit: 'oz' | 'ml'
): FeedingChartPoint[] {
  if (timeFilter === 'today') {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
      name: `${hour}:00`,
      feeding: 0,
      pump: 0,
      bottle: 0,
    }));

    filteredData.feedingSessions.forEach((session) => {
      const hour = parseISO(session.startTime).getHours();
      hours[hour].feeding += Math.round(session.duration / 60);
    });

    filteredData.pumpSessions.forEach((session) => {
      const hour = parseISO(session.startTime).getHours();
      hours[hour].pump += convertVolume(session.volume, session.volumeUnit, volumeUnit);
    });

    filteredData.bottleSessions.forEach((session) => {
      const hour = parseISO(session.timestamp).getHours();
      hours[hour].bottle += convertVolume(session.volume, session.volumeUnit, volumeUnit);
    });

    return hours.filter((hour) => hour.feeding > 0 || hour.pump > 0 || hour.bottle > 0);
  }

  const days: Record<string, FeedingChartPoint> = {};

  const getDayKey = (timestamp: string) => format(parseISO(timestamp), 'MMM d');

  filteredData.feedingSessions.forEach((session) => {
    const key = getDayKey(session.startTime);
    if (!days[key]) {
      days[key] = { name: key, feeding: 0, pump: 0, bottle: 0 };
    }
    days[key].feeding += Math.round(session.duration / 60);
  });

  filteredData.pumpSessions.forEach((session) => {
    const key = getDayKey(session.startTime);
    if (!days[key]) {
      days[key] = { name: key, feeding: 0, pump: 0, bottle: 0 };
    }
    days[key].pump += convertVolume(session.volume, session.volumeUnit, volumeUnit);
  });

  filteredData.bottleSessions.forEach((session) => {
    const key = getDayKey(session.timestamp);
    if (!days[key]) {
      days[key] = { name: key, feeding: 0, pump: 0, bottle: 0 };
    }
    days[key].bottle += convertVolume(session.volume, session.volumeUnit, volumeUnit);
  });

  return Object.values(days);
}

export function buildHistoryItems(
  data: StatsDataSnapshot,
  historyFilter: HistoryFilter
): HistoryItem[] {
  const items: HistoryItem[] = [];

  if (historyFilter === 'all' || historyFilter === 'feeding') {
    data.feedingSessions
      .filter((session) => !session.isActive)
      .forEach((session) => {
        items.push({
          id: `feeding-${session.id}`,
          type: 'breastfeeding',
          timestamp: session.startTime,
          duration: session.duration,
          details: `Breastfeeding - ${BREAST_SIDE_CONFIG[session.breastSide].label}`,
          subDetails: formatDuration(session.duration),
          color: BREAST_SIDE_CONFIG[session.breastSide].color,
          icon: 'baby',
        });
      });

    data.bottleSessions.forEach((session) => {
      items.push({
        id: `bottle-${session.id}`,
        type: 'bottle',
        timestamp: session.timestamp,
        details: `Bottle - ${BOTTLE_CONTENT_CONFIG[session.contentType].label}`,
        subDetails: `${session.volume} ${session.volumeUnit}`,
        color: BOTTLE_CONTENT_CONFIG[session.contentType].color,
        icon: 'milk',
      });
    });

    data.pumpSessions
      .filter((session) => !session.isActive)
      .forEach((session) => {
        items.push({
          id: `pump-${session.id}`,
          type: 'pump',
          timestamp: session.startTime,
          duration: session.duration,
          details: `Pumping - ${session.side === 'both' ? 'Both sides' : `${session.side.charAt(0).toUpperCase()}${session.side.slice(1)}`}`,
          subDetails: `${session.volume} ${session.volumeUnit} • ${formatDuration(session.duration)}`,
          color: '#2196f3',
          icon: 'droplet',
        });
      });
  }

  if (historyFilter === 'all' || historyFilter === 'sleep') {
    data.sleepSessions
      .filter((session) => !session.isActive)
      .forEach((session) => {
        items.push({
          id: `sleep-${session.id}`,
          type: 'sleep',
          timestamp: session.startTime,
          duration: session.duration,
          details: SLEEP_TYPE_CONFIG[session.type].label,
          subDetails: formatSleepDuration(session.duration),
          color: SLEEP_TYPE_CONFIG[session.type].color,
          icon: session.type === 'nap' ? 'sun' : 'moon',
        });
      });
  }

  if (historyFilter === 'all' || historyFilter === 'diaper') {
    data.diaperChanges.forEach((change) => {
      const displayType = change.type === 'wet' ? 'wet' : 'full';
      const config = DIAPER_TYPE_CONFIG[displayType];

      items.push({
        id: `diaper-${change.id}`,
        type: 'diaper',
        timestamp: change.timestamp,
        details: `Diaper - ${config.label}`,
        subDetails: change.notes || undefined,
        color: config.color,
        icon: 'leaf',
      });
    });
  }

  if (historyFilter === 'all' || historyFilter === 'play') {
    data.playSessions
      .filter((session) => !session.isActive)
      .forEach((session) => {
        items.push({
          id: `play-${session.id}`,
          type: 'play',
          timestamp: session.startTime,
          duration: session.duration,
          details: `Play - ${PLAY_TYPE_CONFIG[session.type].label}`,
          subDetails: formatDuration(session.duration),
          color: PLAY_TYPE_CONFIG[session.type].color,
          icon: 'gamepad',
        });
      });
  }

  if (historyFilter === 'all' || historyFilter === 'walks') {
    data.walkSessions
      .filter((session) => !session.isActive)
      .forEach((session) => {
        items.push({
          id: `walk-${session.id}`,
          type: 'walk',
          timestamp: session.startTime,
          duration: session.duration,
          details: 'Walk',
          subDetails: formatDuration(session.duration),
          color: '#8bc34a',
          icon: 'footprints',
        });
      });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
}

export function groupHistoryItems(items: HistoryItem[]): HistoryGroup[] {
  const groups: Record<string, HistoryItem[]> = {};

  items.forEach((item) => {
    const dateKey = format(parseISO(item.timestamp), 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });

  return Object.entries(groups).map(([date, groupedItems]) => ({
    date,
    dateLabel: format(parseISO(date), 'EEEE, MMM d'),
    items: groupedItems,
  }));
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function getHourDistribution(items: { timestamp: string }[]): Record<number, number> {
  const hours: Record<number, number> = {};

  items.forEach((item) => {
    const hour = parseISO(item.timestamp).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
  });

  return hours;
}

function getSleepCoverageDistribution(sessions: SleepSession[]): Record<number, number> {
  const hours: Record<number, number> = {};

  sessions
    .filter((session) => !session.isActive && session.endTime)
    .forEach((session) => {
      let cursor = parseISO(session.startTime).getTime();
      const end = parseISO(session.endTime || session.startTime).getTime();

      while (cursor < end) {
        const current = new Date(cursor);
        const nextHour = new Date(current);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(current.getHours() + 1);
        const segmentEnd = Math.min(end, nextHour.getTime());
        const hour = current.getHours();
        const minutes = (segmentEnd - cursor) / (1000 * 60);

        hours[hour] = (hours[hour] || 0) + minutes;
        cursor = segmentEnd;
      }
    });

  return hours;
}

function countUniqueDays(timestamps: string[]): number {
  if (timestamps.length === 0) {
    return 0;
  }

  return new Set(
    timestamps.map((timestamp) => format(parseISO(timestamp), 'yyyy-MM-dd'))
  ).size;
}

function findPeakHours(distribution: Record<number, number>, topN: number): number[] {
  return Object.entries(distribution)
    .sort((a, b) => b[1] - a[1] || parseInt(a[0], 10) - parseInt(b[0], 10))
    .slice(0, topN)
    .map(([hour]) => parseInt(hour, 10));
}

function calculatePeakShare(
  distribution: Record<number, number>,
  peakHours: number[],
  totalEvents: number
): number {
  if (totalEvents === 0 || peakHours.length === 0) {
    return 0;
  }

  const peakCount = peakHours.reduce((sum, hour) => sum + (distribution[hour] || 0), 0);
  return peakCount / totalEvents;
}

function normalizeDistribution(distribution: Record<number, number>): number[] {
  const maxCount = Math.max(0, ...Object.values(distribution));
  return Array.from({ length: 24 }, (_, hour) => {
    if (maxCount === 0) {
      return 0;
    }

    return (distribution[hour] || 0) / maxCount;
  });
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}${suffix}`;
}

export function formatHoursAsFriendlyDuration(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60));

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const wholeHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (remainingMinutes === 0) {
    return `${wholeHours} hr`;
  }

  return `${wholeHours} hr ${remainingMinutes} min`;
}

function getSleepTimeBucket(timestamp: string): SleepTimeBucket {
  const hour = parseISO(timestamp).getHours();

  if (hour < 8) return 'early-morning';
  if (hour < 11) return 'morning';
  if (hour < 15) return 'midday';
  if (hour < 19) return 'afternoon';
  return 'evening';
}

function getSleepTimeBucketLabel(bucket: SleepTimeBucket): string {
  switch (bucket) {
    case 'early-morning':
      return 'early-morning sleeps';
    case 'morning':
      return 'morning naps';
    case 'midday':
      return 'midday naps';
    case 'afternoon':
      return 'afternoon naps';
    case 'evening':
      return 'evening sleeps';
    default:
      return 'similar-time sleeps';
  }
}

function normalizeSleepClockMinutes(date: Date): number {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes < 12 * 60 ? minutes + 24 * 60 : minutes;
}

function buildNightSleepBlocks(
  sessions: SleepSession[],
  feedingEvents: Array<{ timestamp: string }>
): NightSleepBlock[] {
  const completedNightSessions = sessions
    .filter(
      (session) =>
        !session.isActive &&
        session.type === 'night' &&
        session.endTime &&
        session.duration >= 20 * 60 &&
        session.duration <= 16 * 60 * 60
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (completedNightSessions.length === 0) {
    return [];
  }

  const blocks: NightSleepBlock[] = [];
  let currentBlock: NightSleepBlock = {
    startTime: completedNightSessions[0].startTime,
    endTime: completedNightSessions[0].endTime || completedNightSessions[0].startTime,
    firstWakeTime: null,
  };

  for (let index = 1; index < completedNightSessions.length; index += 1) {
    const session = completedNightSessions[index];
    const sessionStartMs = new Date(session.startTime).getTime();
    const currentBlockEndMs = new Date(currentBlock.endTime).getTime();
    const gapHours = (sessionStartMs - currentBlockEndMs) / (1000 * 60 * 60);
    const hasFeedInGap = feedingEvents.some((event) => {
      const eventMs = new Date(event.timestamp).getTime();
      return eventMs >= currentBlockEndMs && eventMs <= sessionStartMs;
    });

    if (gapHours >= 0 && gapHours <= NIGHT_SLEEP_MERGE_GAP_HOURS && hasFeedInGap) {
      if (!currentBlock.firstWakeTime) {
        currentBlock.firstWakeTime = currentBlock.endTime;
      }
      currentBlock.endTime = session.endTime || session.startTime;
      continue;
    }

    blocks.push(currentBlock);
    currentBlock = {
      startTime: session.startTime,
      endTime: session.endTime || session.startTime,
      firstWakeTime: null,
    };
  }

  blocks.push(currentBlock);
  return blocks;
}

function calculateTypicalNightWakeMinutes(
  blocks: NightSleepBlock[],
  wakeType: 'first' | 'final'
): number | null {
  const wakeMinutes = blocks
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 7)
    .map((block) => {
      const timestamp = wakeType === 'first' ? block.firstWakeTime : block.endTime;
      if (!timestamp) {
        return null;
      }

      return normalizeSleepClockMinutes(parseISO(timestamp));
    })
    .filter((minutes): minutes is number => minutes !== null);

  if (wakeMinutes.length < 2) {
    return null;
  }

  return Math.round(wakeMinutes.reduce((sum, minutes) => sum + minutes, 0) / wakeMinutes.length);
}

function calculateTypicalNightSleepStartMinutes(blocks: NightSleepBlock[]): number | null {
  const nightSleepStarts = blocks
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 7)
    .map((block) => normalizeSleepClockMinutes(parseISO(block.startTime)));

  if (nightSleepStarts.length < 2) {
    return null;
  }

  return Math.round(
    nightSleepStarts.reduce((sum, minutes) => sum + minutes, 0) / nightSleepStarts.length
  );
}

function countCompletedNightSleeps(sessions: SleepSession[]): number {
  return sessions.filter(
    (session) => !session.isActive && session.type === 'night' && session.endTime
  ).length;
}

function classifyPredictedSleepType(
  predictedTime: string | null,
  sessions: SleepSession[]
): 'nap' | 'night' {
  if (!predictedTime) {
    return 'nap';
  }

  const typicalNightSleepStart = calculateTypicalNightSleepStartMinutes(
    buildNightSleepBlocks(sessions, [])
  );
  if (typicalNightSleepStart === null) {
    return 'nap';
  }

  const predictedMinutes = normalizeSleepClockMinutes(parseISO(predictedTime));
  return Math.abs(predictedMinutes - typicalNightSleepStart) <= NIGHT_SLEEP_MATCH_WINDOW_MINUTES
    ? 'night'
    : 'nap';
}

function buildTypicalNightSleepTargetTime(
  latestWakeTime: string | null,
  typicalNightSleepStart: number | null,
  now: Date
): string | null {
  if (!latestWakeTime || typicalNightSleepStart === null) {
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
  const latestWakeHour = latestWake.getHours();

  if (latestWakeHour < 14 || hoursUntilTarget < -1 || hoursUntilTarget > NIGHT_SLEEP_TARGET_LOOKAHEAD_HOURS) {
    return null;
  }

  return targetDate.toISOString();
}

function buildNightWakeTargetTime(
  sleepStartTime: string | null,
  typicalWakeMinutes: number | null
): string | null {
  if (!sleepStartTime || typicalWakeMinutes === null) {
    return null;
  }

  const sleepStart = parseISO(sleepStartTime);
  const targetDate = new Date(sleepStart);
  const normalizedMinutes = ((typicalWakeMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  targetDate.setHours(hours, minutes, 0, 0);

  if (targetDate.getTime() <= sleepStart.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return targetDate.toISOString();
}

function shouldUseEveningBedtimeFallback(
  latestWakeTime: string | null,
  predictedTime: string | null,
  sessions: SleepSession[]
): boolean {
  if (!latestWakeTime || !predictedTime) {
    return false;
  }

  if (countCompletedNightSleeps(sessions) === 0) {
    return false;
  }

  const latestWake = parseISO(latestWakeTime);
  const predicted = parseISO(predictedTime);

  return latestWake.getHours() >= EVENING_BEDTIME_WAKE_HOUR && predicted.getHours() >= EVENING_BEDTIME_PREDICTION_HOUR;
}

function calculateAverageFeedingGapHours(
  items: { timestamp: string }[],
  sleepSessions: SleepSession[]
): number | null {
  if (items.length < MIN_PATTERN_EVENTS) {
    return null;
  }

  const sorted = [...items].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const completedNightSleep = sleepSessions
    .filter((session) => !session.isActive && session.type === 'night' && session.endTime)
    .map((session) => ({
      start: new Date(session.startTime).getTime(),
      end: new Date(session.endTime || session.startTime).getTime(),
    }));

  let totalGap = 0;
  let gapCount = 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(sorted[index - 1].timestamp).getTime();
    const current = new Date(sorted[index].timestamp).getTime();
    const gapHours = (current - previous) / (1000 * 60 * 60);
    const overlapsNightSleep = completedNightSleep.some(
      (sleep) => sleep.start < current && sleep.end > previous
    );

    if (!overlapsNightSleep && gapHours > 0.5 && gapHours < 12) {
      totalGap += gapHours;
      gapCount += 1;
    }
  }

  if (gapCount === 0) {
    return null;
  }

  return totalGap / gapCount;
}

function calculateAverageWakeWindowHours(sessions: SleepSession[]): number | null {
  const completedSleep = sessions
    .filter((session) => !session.isActive && session.endTime)
    .sort(
      (a, b) =>
        new Date((a.endTime || a.startTime)).getTime() -
        new Date((b.endTime || b.startTime)).getTime()
    );

  const napSessions = completedSleep
    .filter((session) => session.type === 'nap')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const wakeWindows: number[] = [];
  let pointer = 0;
  let latestWakeTime: string | null = null;

  napSessions.forEach((nap) => {
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

    const wakeWindowHours =
      (new Date(nap.startTime).getTime() - new Date(latestWakeTime).getTime()) /
      (1000 * 60 * 60);

    if (wakeWindowHours >= 0.75 && wakeWindowHours <= 6) {
      wakeWindows.push(wakeWindowHours);
    }
  });

  if (wakeWindows.length < 3) {
    return null;
  }

  return wakeWindows.reduce((sum, hours) => sum + hours, 0) / wakeWindows.length;
}

function calculateAveragePreBedWakeWindowHours(sessions: SleepSession[]): number | null {
  const completedSleep = sessions
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

      const wakeWindowHours =
        (new Date(nightSession.startTime).getTime() - new Date(previousSleep.endTime).getTime()) /
        (1000 * 60 * 60);

      return wakeWindowHours >= 1 && wakeWindowHours <= 8 ? wakeWindowHours : null;
    })
    .filter((hours): hours is number => hours !== null);

  if (wakeWindows.length < 2) {
    return null;
  }

  return wakeWindows.reduce((sum, hours) => sum + hours, 0) / wakeWindows.length;
}

function calculateAverageNightSleepDurationHours(blocks: NightSleepBlock[]): number | null {
  const nightSleepDurations = blocks
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 7)
    .map((block) => (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / (1000 * 60 * 60));

  if (nightSleepDurations.length < 2) {
    return null;
  }

  return (
    nightSleepDurations.reduce((sum, hours) => sum + hours, 0) / nightSleepDurations.length
  );
}

function calculatePredictedNapWakeTime(
  predictedSleepTime: string | null,
  sessions: SleepSession[]
): { wakeTime: string | null; basis: string | null } {
  if (!predictedSleepTime) {
    return { wakeTime: null, basis: null };
  }

  const completedNaps = sessions
    .filter(
      (session) =>
        !session.isActive &&
        session.type === 'nap' &&
        session.endTime &&
        session.duration >= MIN_PATTERN_NAP_SECONDS &&
        session.duration <= MAX_PATTERN_NAP_SECONDS
    )
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 12);

  if (completedNaps.length === 0) {
    return { wakeTime: null, basis: null };
  }

  const predictedBucket = getSleepTimeBucket(predictedSleepTime);
  const matchingBucketNaps = completedNaps.filter(
    (session) => getSleepTimeBucket(session.startTime) === predictedBucket
  );
  const napsToUse = matchingBucketNaps.length >= 2 ? matchingBucketNaps : completedNaps.slice(0, 6);
  const averageDurationHours =
    napsToUse.reduce((sum, session) => sum + session.duration / (60 * 60), 0) / napsToUse.length;

  return {
    wakeTime: new Date(
      parseISO(predictedSleepTime).getTime() + averageDurationHours * 60 * 60 * 1000
    ).toISOString(),
    basis:
      matchingBucketNaps.length >= 2
        ? getSleepTimeBucketLabel(predictedBucket)
        : 'recent naps',
  };
}

function calculateAverageEarlyFeedWakeHours(blocks: NightSleepBlock[]): number | null {
  const wakeOffsets = blocks
    .filter((block) => block.firstWakeTime)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 7)
    .map((block) => {
      const firstWakeTime = block.firstWakeTime || block.endTime;
      return (new Date(firstWakeTime).getTime() - new Date(block.startTime).getTime()) / (1000 * 60 * 60);
    });

  if (wakeOffsets.length < 2) {
    return null;
  }

  return wakeOffsets.reduce((sum, hours) => sum + hours, 0) / wakeOffsets.length;
}

function calculateCoefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) {
    return null;
  }

  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function calculateStandardDeviation(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildConsistencyScore(
  patternNaps: SleepSession[],
  patternFeedingEvents: Array<{ timestamp: string; source: 'nursing' | 'bottle' }>,
  now: Date
): { score: number; label: string } {
  const sevenDayStart = startOfDay(subDays(now, 6));
  const sevenDayEnd = endOfDay(now);

  const recentNaps = patternNaps.filter((session) =>
    isWithinInterval(parseISO(session.startTime), { start: sevenDayStart, end: sevenDayEnd })
  );
  const recentFeedings = patternFeedingEvents.filter((event) =>
    isWithinInterval(parseISO(event.timestamp), { start: sevenDayStart, end: sevenDayEnd })
  );

  const dayKeys = Array.from({ length: 7 }, (_, index) =>
    format(subDays(startOfDay(now), 6 - index), 'yyyy-MM-dd')
  );

  const sleepTotalsByDay = dayKeys.map((dayKey) =>
    recentNaps
      .filter((session) => format(parseISO(session.startTime), 'yyyy-MM-dd') === dayKey)
      .reduce((sum, session) => sum + session.duration, 0)
  );

  const feedingCountsByDay = dayKeys.map(
    (dayKey) =>
      recentFeedings.filter((event) => format(parseISO(event.timestamp), 'yyyy-MM-dd') === dayKey)
        .length
  );

  const napStartMinutes = recentNaps.map((session) => {
    const date = parseISO(session.startTime);
    return date.getHours() * 60 + date.getMinutes();
  });

  const scoreParts: number[] = [];

  const sleepCv = calculateCoefficientOfVariation(sleepTotalsByDay);
  if (sleepCv !== null) {
    scoreParts.push(clampScore(100 * (1 - Math.min(sleepCv, 1))));
  }

  const feedingCv = calculateCoefficientOfVariation(feedingCountsByDay);
  if (feedingCv !== null) {
    scoreParts.push(clampScore(100 * (1 - Math.min(feedingCv, 1))));
  }

  const napTimingDeviation = calculateStandardDeviation(napStartMinutes);
  if (napTimingDeviation !== null) {
    scoreParts.push(clampScore(100 * (1 - Math.min(napTimingDeviation / 120, 1))));
  }

  const score =
    scoreParts.length > 0
      ? Math.round(scoreParts.reduce((sum, value) => sum + value, 0) / scoreParts.length)
      : 0;

  let label = 'Still finding a rhythm';
  if (score >= 85) {
    label = 'Very consistent';
  } else if (score >= 70) {
    label = 'Nicely consistent';
  } else if (score >= 55) {
    label = 'Settling into a rhythm';
  }

  return { score, label };
}

function buildHeadline(
  sleepChange: number,
  nursingChange: number,
  bottleChange: number,
  consistencyScore: number
): { headline: string; subheadline: string } {
  if (sleepChange > 0) {
    return {
      headline: `You're doing great! Sleep is up ${sleepChange}%`,
      subheadline: 'More rest this week is a strong sign the routine is working.',
    };
  }

  if (Math.abs(nursingChange) <= 10 && Math.abs(bottleChange) <= 10 && consistencyScore >= 70) {
    return {
      headline: 'Your routine looks beautifully steady',
      subheadline: 'Feeding patterns have stayed nicely consistent over the last week.',
    };
  }

  if (nursingChange > 0 || bottleChange > 0) {
    return {
      headline: 'Feeding rhythm is building nicely',
      subheadline: 'This week shows a stronger feeding cadence than the one before.',
    };
  }

  return {
    headline: 'You are building a thoughtful routine',
    subheadline: 'A few more days of logs will make these insights even sharper.',
  };
}

function buildWeeklyMetric(id: WeeklyInsightMetric['id'], currentValue: number, previousValue: number): WeeklyInsightMetric {
  return {
    id,
    currentValue,
    previousValue,
    change: calculateChange(currentValue, previousValue),
  };
}

function buildCombinedSweetSpot(
  recommendedNapTime: string | null,
  recommendedFeedingTime: string | null,
  now: Date
): InsightsSummary['combinedSweetSpot'] {
  if (!recommendedNapTime || !recommendedFeedingTime) {
    return null;
  }

  const napTimeMs = parseISO(recommendedNapTime).getTime();
  const feedingTimeMs = parseISO(recommendedFeedingTime).getTime();
  const differenceMinutes = Math.abs(napTimeMs - feedingTimeMs) / (1000 * 60);

  if (differenceMinutes > MERGED_SWEET_SPOT_WINDOW_MINUTES) {
    return null;
  }

  const startTime = napTimeMs <= feedingTimeMs ? recommendedNapTime : recommendedFeedingTime;
  const endTime = napTimeMs <= feedingTimeMs ? recommendedFeedingTime : recommendedNapTime;

  return {
    recommendedStartTime: startTime,
    recommendedEndTime: endTime,
    status: parseISO(startTime).getTime() <= now.getTime() ? 'ready' : 'soon',
  };
}

export function buildInsights(data: StatsDataSnapshot, now: Date = new Date()): InsightsSummary {
  const thisWeekRange = {
    start: startOfWeek(now),
    end: endOfWeek(now),
  };
  const lastWeekRange = {
    start: startOfWeek(subWeeks(now, 1)),
    end: endOfWeek(subWeeks(now, 1)),
  };

  const thisWeek = getFilteredStatsData(data, thisWeekRange);
  const lastWeek = getFilteredStatsData(data, lastWeekRange);

  const thisWeekSleepTotal = thisWeek.sleepSessions.reduce((sum, session) => sum + session.duration, 0);
  const lastWeekSleepTotal = lastWeek.sleepSessions.reduce((sum, session) => sum + session.duration, 0);
  const thisWeekNursingCount = thisWeek.feedingSessions.length;
  const lastWeekNursingCount = lastWeek.feedingSessions.length;
  const thisWeekBottleCount = thisWeek.bottleSessions.length;
  const lastWeekBottleCount = lastWeek.bottleSessions.length;
  const thisWeekDiaperCount = thisWeek.diaperChanges.length;
  const lastWeekDiaperCount = lastWeek.diaperChanges.length;
  const thisWeekPlayTotal = thisWeek.playSessions.reduce((sum, session) => sum + session.duration, 0);
  const lastWeekPlayTotal = lastWeek.playSessions.reduce((sum, session) => sum + session.duration, 0);
  const thisWeekWalkTotal = thisWeek.walkSessions.reduce((sum, session) => sum + session.duration, 0);
  const lastWeekWalkTotal = lastWeek.walkSessions.reduce((sum, session) => sum + session.duration, 0);

  const trackedDays = countUniqueDays([
    ...thisWeek.feedingSessions.map((session) => session.startTime),
    ...thisWeek.bottleSessions.map((session) => session.timestamp),
    ...thisWeek.diaperChanges.map((change) => change.timestamp),
    ...thisWeek.playSessions.map((session) => session.startTime),
    ...thisWeek.walkSessions.map((session) => session.startTime),
    ...thisWeek.sleepSessions.map((session) =>
      session.type === 'nap' ? session.startTime : session.endTime || session.startTime
    ),
  ]);

  const patternNaps = data.sleepSessions.filter(
    (session) =>
      !session.isActive &&
      session.type === 'nap' &&
      session.duration >= MIN_PATTERN_NAP_SECONDS &&
      session.duration <= MAX_PATTERN_NAP_SECONDS
  );

  const allFeedingEvents = [
    ...data.feedingSessions
      .filter((session) => !session.isActive)
      .map((session) => ({ timestamp: session.startTime })),
    ...data.bottleSessions.map((session) => ({ timestamp: session.timestamp })),
  ];

  const patternFeedingEvents = [
    ...data.feedingSessions
      .filter((session) => !session.isActive)
      .filter((session) => session.duration >= MIN_PATTERN_NURSING_SECONDS)
      .map((session) => ({ timestamp: session.startTime, source: 'nursing' as const })),
    ...data.bottleSessions
      .filter((session) => convertVolume(session.volume, session.volumeUnit, 'ml') >= MIN_PATTERN_BOTTLE_ML)
      .map((session) => ({ timestamp: session.timestamp, source: 'bottle' as const })),
  ];
  const nightSleepBlocks = buildNightSleepBlocks(data.sleepSessions, allFeedingEvents);

  const sleepDistribution = getHourDistribution(
    patternNaps.map((session) => ({ timestamp: session.startTime }))
  );
  const feedingDistribution = getHourDistribution(patternFeedingEvents);
  const timelineSleepDistribution = getSleepCoverageDistribution(data.sleepSessions);
  const timelineFeedingDistribution = getHourDistribution(allFeedingEvents);

  const peakNapHours = findPeakHours(
    sleepDistribution,
    2
  );
  const peakFeedingHours = findPeakHours(feedingDistribution, 3);
  const napPeakShare = calculatePeakShare(sleepDistribution, peakNapHours, patternNaps.length);
  const hasStrongNapHourPattern = peakNapHours.length > 0 && patternNaps.length >= MIN_PATTERN_EVENTS && napPeakShare >= 0.55;
  const averageFeedingGapHours = calculateAverageFeedingGapHours(patternFeedingEvents, data.sleepSessions);
  const averageWakeWindowHours = calculateAverageWakeWindowHours(data.sleepSessions);
  const averagePreBedWakeWindowHours = calculateAveragePreBedWakeWindowHours(data.sleepSessions);
  const averageNightSleepHours = calculateAverageNightSleepDurationHours(nightSleepBlocks);
  const averageEarlyFeedWakeHours = calculateAverageEarlyFeedWakeHours(nightSleepBlocks);
  const typicalFinalWakeMinutes = calculateTypicalNightWakeMinutes(nightSleepBlocks, 'final');
  const typicalEarlyFeedWakeMinutes = calculateTypicalNightWakeMinutes(nightSleepBlocks, 'first');
  const averageNapMinutes =
    patternNaps.length >= 3
      ? Math.round(patternNaps.reduce((sum, session) => sum + session.duration, 0) / patternNaps.length / 60)
      : null;
  const latestWakeTime = data.sleepSessions
    .filter((session) => !session.isActive && session.endTime)
    .sort(
      (a, b) =>
        new Date(b.endTime || b.startTime).getTime() -
        new Date(a.endTime || a.startTime).getTime()
    )[0]?.endTime || null;
  const recommendedNapTime =
    latestWakeTime && averageWakeWindowHours !== null
      ? new Date(
          new Date(latestWakeTime).getTime() + averageWakeWindowHours * 60 * 60 * 1000
        ).toISOString()
      : null;
  const recommendedNightSleepTime =
    latestWakeTime && averagePreBedWakeWindowHours !== null
      ? new Date(
          new Date(latestWakeTime).getTime() + averagePreBedWakeWindowHours * 60 * 60 * 1000
        ).toISOString()
      : null;
  const typicalNightSleepStart = calculateTypicalNightSleepStartMinutes(nightSleepBlocks);
  const nightSleepClockTargetTime = buildTypicalNightSleepTargetTime(
    latestWakeTime,
    typicalNightSleepStart,
    now
  );
  const shouldUseNightPrediction =
    (recommendedNightSleepTime !== null &&
      typicalNightSleepStart !== null &&
      Math.abs(
        normalizeSleepClockMinutes(parseISO(recommendedNightSleepTime)) - typicalNightSleepStart
      ) <= NIGHT_SLEEP_MATCH_WINDOW_MINUTES) ||
    nightSleepClockTargetTime !== null ||
    shouldUseEveningBedtimeFallback(latestWakeTime, recommendedNapTime, data.sleepSessions);
  const recommendedSleepTime = shouldUseNightPrediction
    ? recommendedNightSleepTime ?? nightSleepClockTargetTime
    : recommendedNapTime;
  const predictedSleepType = shouldUseNightPrediction
    ? 'night'
    : classifyPredictedSleepType(recommendedNapTime, data.sleepSessions);
  const displayedWakeWindowHours = shouldUseNightPrediction
    ? averagePreBedWakeWindowHours
    : averageWakeWindowHours;
  const predictedMorningWakeTime =
    predictedSleepType === 'night' &&
    recommendedSleepTime !== null
      ? buildNightWakeTargetTime(recommendedSleepTime, typicalFinalWakeMinutes) ??
        (averageNightSleepHours !== null
          ? new Date(
              parseISO(recommendedSleepTime).getTime() + averageNightSleepHours * 60 * 60 * 1000
            ).toISOString()
          : null)
      : null;
  const predictedEarlyFeedWakeTime =
    predictedSleepType === 'night' &&
    recommendedSleepTime !== null
      ? buildNightWakeTargetTime(recommendedSleepTime, typicalEarlyFeedWakeMinutes) ??
        (averageEarlyFeedWakeHours !== null
          ? new Date(
              parseISO(recommendedSleepTime).getTime() + averageEarlyFeedWakeHours * 60 * 60 * 1000
            ).toISOString()
          : null)
      : null;
  const napWakePrediction =
    predictedSleepType === 'nap'
      ? calculatePredictedNapWakeTime(recommendedSleepTime, data.sleepSessions)
      : { wakeTime: null, basis: null };
  const latestFeedingTime =
    patternFeedingEvents
      .map((event) => event.timestamp)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
  const recommendedFeedingTime =
    latestFeedingTime && averageFeedingGapHours !== null
      ? new Date(
          new Date(latestFeedingTime).getTime() + averageFeedingGapHours * 60 * 60 * 1000
        ).toISOString()
      : null;
  const combinedSweetSpot = buildCombinedSweetSpot(recommendedSleepTime, recommendedFeedingTime, now);
  const consistency = buildConsistencyScore(patternNaps, patternFeedingEvents, now);
  const { headline, subheadline } = buildHeadline(
    calculateChange(thisWeekSleepTotal, lastWeekSleepTotal),
    calculateChange(thisWeekNursingCount, lastWeekNursingCount),
    calculateChange(thisWeekBottleCount, lastWeekBottleCount),
    consistency.score
  );

  const routineSummary: string[] = [];

  if (averageFeedingGapHours !== null) {
    routineSummary.push(`While awake, usually feeds about every ${formatHoursAsFriendlyDuration(averageFeedingGapHours)}`);
  }

  if (combinedSweetSpot) {
    routineSummary.push(
      `Feed and ${predictedSleepType === 'night' ? 'bedtime' : 'nap'} usually line up around ${format(parseISO(combinedSweetSpot.recommendedStartTime), 'h:mm a')}`
    );
  } else if (recommendedSleepTime) {
    routineSummary.push(
      `${predictedSleepType === 'night' ? 'Bedtime' : 'Next nap sweet spot'} lands around ${format(parseISO(recommendedSleepTime), 'h:mm a')}`
    );
  }

  if (hasStrongNapHourPattern) {
    routineSummary.push(`Nap windows tend to start around ${peakNapHours.map(formatHour).join(' and ')}`);
  } else if (averageWakeWindowHours !== null) {
    routineSummary.push(`Usually gets sleepy again about ${formatHoursAsFriendlyDuration(averageWakeWindowHours)} after waking`);
  }

  if (peakFeedingHours.length > 0 && patternFeedingEvents.length >= MIN_PATTERN_EVENTS) {
    routineSummary.push(`Most common feeding times are around ${peakFeedingHours.map(formatHour).join(', ')}`);
  }

  if (predictedMorningWakeTime) {
    routineSummary.push(`Likely awake around ${format(parseISO(predictedMorningWakeTime), 'h:mm a')} after night sleep`);
  }

  if (predictedEarlyFeedWakeTime) {
    routineSummary.push(
      `Often wakes for an early feed around ${format(parseISO(predictedEarlyFeedWakeTime), 'h:mm a')} and then settles back to sleep`
    );
  }

  if (averageNapMinutes !== null && averageNapMinutes >= 30) {
    routineSummary.push(`Typical nap length is about ${averageNapMinutes} minutes`);
  }

  const patternCards: InsightPatternCard[] = [];

  if (hasStrongNapHourPattern) {
    patternCards.push({
      id: 'nap-window',
      title: 'Nap Window',
      value: peakNapHours.map(formatHour).join(' and '),
      description: `Based on ${patternNaps.length} naps after filtering out short outliers`,
      tone: 'indigo',
    });
  } else if (averageWakeWindowHours !== null) {
    patternCards.push({
      id: 'wake-window',
      title: 'Wake Window',
      value: `${formatHoursAsFriendlyDuration(averageWakeWindowHours)} awake`,
      description: 'Naps look more wake-window driven than tied to one clock hour',
      tone: 'indigo',
    });
  }

  if (peakFeedingHours.length > 0 && patternFeedingEvents.length >= MIN_PATTERN_EVENTS) {
    patternCards.push({
      id: 'feeding-window',
      title: 'Most Common Feeding Times',
      value: peakFeedingHours.map(formatHour).join(', '),
      description:
        averageFeedingGapHours !== null
          ? `While awake, usually feeds about every ${formatHoursAsFriendlyDuration(averageFeedingGapHours)}. These are the top recurring feeding times, not every feed.`
          : 'These are the top recurring feeding times after filtering tiny nursing and bottle entries, not every feed.',
      tone: 'blue',
    });
  }

  if (averageNapMinutes !== null && averageNapMinutes >= 30) {
    patternCards.push({
      id: 'nap-length',
      title: 'Average Nap',
      value: `${averageNapMinutes} min`,
      description: 'Short naps under 20 minutes are ignored for this pattern',
      tone: 'amber',
    });
  }

  if (averageFeedingGapHours !== null && !(peakFeedingHours.length > 0 && patternFeedingEvents.length >= MIN_PATTERN_EVENTS)) {
    patternCards.push({
      id: 'feeding-gap',
      title: 'Feeding Rhythm',
      value: formatHoursAsFriendlyDuration(averageFeedingGapHours),
      description: 'Average time between filtered feeding events while awake, excluding overnight sleep gaps',
      tone: 'green',
    });
  }

  const readinessTarget = MIN_PATTERN_EVENTS;
  const readinessCount = Math.max(
    data.feedingSessions.filter((session) => !session.isActive).length + data.bottleSessions.length,
    data.sleepSessions.filter((session) => !session.isActive).length
  );
  const readinessPercent = Math.min(100, Math.round((readinessCount / readinessTarget) * 100));

  return {
    hasEnoughData:
      data.feedingSessions.filter((session) => !session.isActive).length + data.bottleSessions.length >= MIN_PATTERN_EVENTS ||
      data.sleepSessions.filter((session) => !session.isActive).length >= MIN_PATTERN_EVENTS,
    readinessCount,
    readinessTarget,
    readinessPercent,
    weekly: {
      sleep: buildWeeklyMetric('sleep', thisWeekSleepTotal, lastWeekSleepTotal),
      nursing: buildWeeklyMetric('nursing', thisWeekNursingCount, lastWeekNursingCount),
      bottle: buildWeeklyMetric('bottle', thisWeekBottleCount, lastWeekBottleCount),
      diaper: buildWeeklyMetric('diaper', thisWeekDiaperCount, lastWeekDiaperCount),
      play: buildWeeklyMetric('play', thisWeekPlayTotal, lastWeekPlayTotal),
      walk: buildWeeklyMetric('walk', thisWeekWalkTotal, lastWeekWalkTotal),
    },
    averages: {
      sleepPerDay: trackedDays > 0 ? thisWeekSleepTotal / trackedDays : 0,
      nursingPerDay: trackedDays > 0 ? thisWeekNursingCount / trackedDays : 0,
      bottlePerDay: trackedDays > 0 ? thisWeekBottleCount / trackedDays : 0,
      diapersPerDay: trackedDays > 0 ? thisWeekDiaperCount / trackedDays : 0,
      playPerDay: trackedDays > 0 ? thisWeekPlayTotal / trackedDays : 0,
      walkPerDay: trackedDays > 0 ? thisWeekWalkTotal / trackedDays : 0,
    },
    headline,
    subheadline,
    sweetSpot: {
      recommendedTime: recommendedSleepTime,
      averageWakeWindowHours: displayedWakeWindowHours,
      predictedFeedWakeTime: predictedEarlyFeedWakeTime,
      averageEarlyFeedWakeHours,
      predictedWakeTime: predictedSleepType === 'night' ? predictedMorningWakeTime : napWakePrediction.wakeTime,
      averageNightSleepHours,
      wakePredictionBasis: predictedSleepType === 'night' ? 'recent overnights' : napWakePrediction.basis,
      lastWakeTime: latestWakeTime,
      sleepType: predictedSleepType,
      status:
        recommendedSleepTime && parseISO(recommendedSleepTime).getTime() <= now.getTime()
          ? 'ready'
          : recommendedSleepTime
            ? 'soon'
            : 'building',
    },
    feedingSweetSpot: {
      recommendedTime: recommendedFeedingTime,
      averageGapHours: averageFeedingGapHours,
      lastFeedingTime: latestFeedingTime,
      status:
        recommendedFeedingTime && parseISO(recommendedFeedingTime).getTime() <= now.getTime()
          ? 'ready'
          : recommendedFeedingTime
            ? 'soon'
            : 'building',
    },
    combinedSweetSpot,
    consistencyScore: consistency.score,
    consistencyLabel: consistency.label,
    timeline: {
      sleep: {
        id: 'sleep',
        title: 'Sleep Through the Day',
        subtitle: 'Hourly sleep distribution across the full day',
        peakHours: peakNapHours,
        hourlyIntensity: normalizeDistribution(timelineSleepDistribution),
      },
      feeding: {
        id: 'feeding',
        title: 'Feeding Across the Day',
        subtitle: 'Hourly feeding distribution across the full day',
        peakHours: peakFeedingHours,
        hourlyIntensity: normalizeDistribution(timelineFeedingDistribution),
      },
    },
    routineSummary,
    patternCards,
  };
}
