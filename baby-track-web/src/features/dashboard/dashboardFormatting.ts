import { format, parseISO } from 'date-fns';
import type { BottleSession, FeedingSession, SolidFood } from '@/types';
import { BREAST_SIDE_CONFIG } from '@/types';
import { getSolidFoodTimelineTimestamp } from '@/features/nutrition/solidFoodUtils';

export interface LatestFeedingStatus {
  timestamp: string;
  type: 'breast' | 'bottle' | 'solid';
  details: string;
}

export function formatSleepStartedAt(startTime: string): string {
  return `Started at ${format(parseISO(startTime), 'h:mm a')}`;
}

export function getLatestFeedingStatus(
  feedingSessions: FeedingSession[],
  bottleSessions: BottleSession[],
  solidFoods: SolidFood[]
): LatestFeedingStatus | null {
  const feedings: LatestFeedingStatus[] = [];

  feedingSessions
    .filter((session) => !session.isActive)
    .forEach((session) => {
      feedings.push({
        timestamp: session.startTime,
        type: 'breast',
        details: `Breastfeeding - ${BREAST_SIDE_CONFIG[session.breastSide].label}`,
      });
    });

  bottleSessions.forEach((session) => {
    feedings.push({
      timestamp: session.timestamp,
      type: 'bottle',
      details: `Bottle - ${session.volume} ${session.volumeUnit}`,
    });
  });

  solidFoods.forEach((food) => {
    feedings.push({
      timestamp: getSolidFoodTimelineTimestamp(food),
      type: 'solid',
      details: `Solids - ${food.foodName}`,
    });
  });

  feedings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return feedings[0] ?? null;
}
