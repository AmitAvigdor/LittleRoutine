import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockBaby } from '@/test/mocks';
import type { FeedingSession, PumpSession } from '@/types';

let feedingCallback: ((sessions: FeedingSession[]) => void) | null = null;
let pumpCallback: ((sessions: PumpSession[]) => void) | null = null;

const mockStartFeedingSession = vi.fn();

vi.mock('@/lib/firestore', () => ({
  createFeedingSession: vi.fn(),
  startFeedingSession: (...args: unknown[]) => mockStartFeedingSession(...args),
  endFeedingSession: vi.fn(),
  updateFeedingSession: vi.fn(),
  deleteFeedingSession: vi.fn(),
  pauseFeedingSession: vi.fn(),
  resumeFeedingSession: vi.fn(),
  subscribeToFeedingSessions: vi.fn((_: string, callback: (sessions: FeedingSession[]) => void) => {
    feedingCallback = callback;
    callback([]);
    return vi.fn();
  }),
  subscribeToPumpSessions: vi.fn((_: string, callback: (sessions: PumpSession[]) => void) => {
    pumpCallback = callback;
    callback([]);
    return vi.fn();
  }),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'test@example.com' },
  }),
}));

import { BreastfeedingView } from './BreastfeedingView';

describe('BreastfeedingView UI', () => {
  beforeEach(() => {
    feedingCallback = null;
    pumpCallback = null;
    mockStartFeedingSession.mockReset();
    mockStartFeedingSession.mockResolvedValue('session-2');
  });

  it('keeps the chosen side visible when starting another same-side session', async () => {
    const user = userEvent.setup();

    const { container } = render(<BreastfeedingView baby={mockBaby} />);

    const lastLeftSession: FeedingSession = {
      id: 'session-1',
      babyId: mockBaby.id,
      userId: 'user-1',
      date: '2024-01-15',
      duration: 900,
      breastSide: 'left',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T09:15:00.000Z',
      isActive: false,
      isPaused: false,
      pausedAt: null,
      totalPausedDuration: 0,
      notes: null,
      babyMood: null,
      momMood: null,
      loggedBy: null,
      createdAt: '2024-01-15T09:00:00.000Z',
      updatedAt: '2024-01-15T09:15:00.000Z',
    };

    act(() => {
      feedingCallback?.([lastLeftSession]);
    });

    const leftButton = await screen.findByRole('button', { name: /left/i });
    const rightButton = await screen.findByRole('button', { name: /right/i });

    await waitFor(() => {
      expect(rightButton.className).toContain('scale-110');
    });

    await user.click(leftButton);
    const startButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === ''
    );
    expect(startButton).toBeDefined();
    await user.click(startButton!);

    expect(mockStartFeedingSession).toHaveBeenCalledWith(
      mockBaby.id,
      'user-1',
      expect.objectContaining({ breastSide: 'left' })
    );

    await waitFor(() => {
      expect(leftButton.className).toContain('scale-110');
      expect(rightButton.className).not.toContain('scale-110');
    });
  });
});
