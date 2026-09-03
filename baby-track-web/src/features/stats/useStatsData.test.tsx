import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedingSession } from '@/types';

const firestoreMocks = vi.hoisted(() => ({
  callbacks: {} as Record<string, (items: unknown[]) => void>,
  getActivityPage: vi.fn(),
}));

vi.mock('@/lib/firestore', () => {
  const subscribe = (key: string) => (
    _babyId: string,
    callback: (items: unknown[]) => void
  ) => {
    firestoreMocks.callbacks[key] = callback;
    return vi.fn();
  };

  return {
    getActivityPage: firestoreMocks.getActivityPage,
    subscribeToFeedingSessions: subscribe('feedingSessions'),
    subscribeToPumpSessions: subscribe('pumpSessions'),
    subscribeToBottleSessions: subscribe('bottleSessions'),
    subscribeToSleepSessions: subscribe('sleepSessions'),
    subscribeToDiaperChanges: subscribe('diaperChanges'),
    subscribeToPlaySessions: subscribe('playSessions'),
    subscribeToWalkSessions: subscribe('walkSessions'),
  };
});

import { useStatsData } from './useStatsData';

function createFeedingSession(index: number): FeedingSession {
  const startTime = new Date(Date.UTC(2026, 7, index, 10)).toISOString();

  return {
    id: `session-${index}`,
    babyId: 'baby-1',
    userId: 'user-1',
    date: startTime.slice(0, 10),
    duration: 600,
    breastSide: 'left',
    startTime,
    endTime: new Date(Date.parse(startTime) + 600_000).toISOString(),
    isActive: false,
    isPaused: false,
    pausedAt: null,
    totalPausedDuration: 0,
    notes: null,
    babyMood: null,
    momMood: null,
    loggedBy: null,
    createdAt: startTime,
    updatedAt: startTime,
  };
}

describe('useStatsData pagination', () => {
  beforeEach(() => {
    firestoreMocks.callbacks = {};
    firestoreMocks.getActivityPage.mockReset();
  });

  it('merges an older cursor page with the live page without duplicates', async () => {
    const livePage = Array.from({ length: 100 }, (_, index) => createFeedingSession(102 - index));
    const olderPage = [createFeedingSession(2), createFeedingSession(1)];
    firestoreMocks.getActivityPage.mockResolvedValue({
      items: olderPage,
      hasMore: false,
      nextCursor: null,
    });
    const { result } = renderHook(() => useStatsData('baby-1'));

    act(() => {
      firestoreMocks.callbacks.feedingSessions(livePage);
    });

    await waitFor(() => {
      expect(result.current.data.feedingSessions).toHaveLength(100);
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(firestoreMocks.getActivityPage).toHaveBeenCalledWith(
      'feedingSessions',
      'baby-1',
      {
        sortValue: livePage.at(-1)?.startTime,
        documentId: livePage.at(-1)?.id,
      },
      100
    );
    expect(result.current.data.feedingSessions).toHaveLength(102);
    expect(new Set(result.current.data.feedingSessions.map((item) => item.id))).toHaveProperty('size', 102);
    expect(result.current.hasMore).toBe(false);
  });
});
