import { describe, it, expect } from 'vitest';
import type { DiaperChange } from './diaper';
import { getDiaperStats } from './diaper';

const makeChange = (timestamp: string, type: DiaperChange['type']): DiaperChange => ({
  id: Math.random().toString(),
  babyId: 'baby1',
  userId: 'user1',
  date: timestamp.split('T')[0],
  type,
  timestamp,
  notes: null,
  babyMood: null,
  createdAt: timestamp,
  updatedAt: timestamp,
});

describe('getDiaperStats', () => {
  it('filters by date range and counts types', () => {
    const changes: DiaperChange[] = [
      makeChange('2025-01-10T10:00:00.000Z', 'wet'),
      makeChange('2025-01-11T10:00:00.000Z', 'dirty' as DiaperChange['type']),
      makeChange('2025-01-12T10:00:00.000Z', 'both' as DiaperChange['type']),
      makeChange('2025-01-20T10:00:00.000Z', 'wet'),
    ];

    const stats = getDiaperStats(
      changes,
      new Date('2025-01-10T00:00:00.000Z'),
      new Date('2025-01-12T23:59:59.999Z')
    );

    expect(stats.total).toBe(3);
    expect(stats.wet).toBe(1);
    expect(stats.full).toBe(2);
  });
});
