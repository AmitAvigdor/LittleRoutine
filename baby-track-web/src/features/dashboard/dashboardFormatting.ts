import { format, parseISO } from 'date-fns';

export function formatSleepStartedAt(startTime: string): string {
  return `Started at ${format(parseISO(startTime), 'h:mm a')}`;
}
