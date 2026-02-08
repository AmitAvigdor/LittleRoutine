import type { AppSettings } from '@/types/settings';

type Tone = 'green' | 'yellow' | 'red';

function rank(tone: Tone): number {
  return tone === 'red' ? 3 : tone === 'yellow' ? 2 : 1;
}

function toneForInterval(lastTimestamp: string | null, intervalHours: number): Tone {
  if (!lastTimestamp) return 'yellow';
  const hoursSince = (Date.now() - new Date(lastTimestamp).getTime()) / (1000 * 60 * 60);
  if (hoursSince >= intervalHours) return 'red';
  if (hoursSince >= intervalHours * 0.75) return 'yellow';
  return 'green';
}

export function computeStatusTone(input: {
  lastFeedingAt: string | null;
  lastDiaperAt: string | null;
  lastSleepAt: string | null;
  isFeedingActive: boolean;
  isSleepActive: boolean;
  settings: AppSettings | null;
}): Tone {
  const feedingInterval = input.settings?.feedingReminderInterval ?? 3;
  const diaperInterval = input.settings?.diaperReminderInterval ?? 2;
  const sleepInterval = 4;

  const feedingTone = input.isFeedingActive
    ? 'green'
    : toneForInterval(input.lastFeedingAt, feedingInterval);
  const diaperTone = toneForInterval(input.lastDiaperAt, diaperInterval);
  const sleepTone = input.isSleepActive
    ? 'green'
    : toneForInterval(input.lastSleepAt, sleepInterval);

  const tones: Tone[] = [feedingTone, diaperTone, sleepTone];
  return tones.sort((a, b) => rank(b) - rank(a))[0];
}
