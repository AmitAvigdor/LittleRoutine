import { describe, it, expect } from 'vitest';
import type { DiaryEntry } from './diary';
import { groupEntriesByMonth, formatMonthKey } from './diary';

const makeEntry = (date: string, id: string): DiaryEntry => ({
  id,
  babyId: 'b1',
  userId: 'u1',
  date,
  title: null,
  notes: null,
  photoUrl: null,
  mood: null,
  createdAt: date,
  updatedAt: date,
});

describe('diary helpers', () => {
  it('groups entries by month and sorts by date desc', () => {
    const entries = [
      makeEntry('2025-01-15', 'a'),
      makeEntry('2025-01-20', 'b'),
      makeEntry('2025-02-01', 'c'),
    ];

    const grouped = groupEntriesByMonth(entries);
    expect(grouped.get('2025-01')?.map(e => e.id)).toEqual(['b', 'a']);
    expect(grouped.get('2025-02')?.map(e => e.id)).toEqual(['c']);
  });

  it('formats month key for display', () => {
    expect(formatMonthKey('2025-01')).toBe('January 2025');
  });
});
