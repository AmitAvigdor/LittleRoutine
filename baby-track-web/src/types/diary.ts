import { BabyMood } from './enums';

export interface DiaryEntry {
  id: string;
  babyId: string;
  userId: string;
  date: string;
  title: string | null;
  notes: string | null;
  photoUrl: string | null;
  mood: BabyMood | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaryEntryInput {
  date: string;
  title?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  mood?: BabyMood | null;
}

// Group diary entries by month for display
export function groupEntriesByMonth(entries: DiaryEntry[]): Map<string, DiaryEntry[]> {
  const grouped = new Map<string, DiaryEntry[]>();

  entries.forEach(entry => {
    const date = new Date(entry.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(entry);
  });

  // Sort entries within each month by date (newest first)
  grouped.forEach((monthEntries) => {
    monthEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  return grouped;
}

// Format month key to display string
export function formatMonthKey(key: string): string {
  const [year, month] = key.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
