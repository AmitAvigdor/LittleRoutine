import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockBaby, mockSettings, mockUser } from '@/test/mocks';
import type { BottleSession, MilkStash } from '@/types';

let bottleCallback: ((sessions: BottleSession[]) => void) | null = null;
let milkStashCallback: ((stash: MilkStash[]) => void) | null = null;

const mockCreateBottleSession = vi.fn();
const mockCreateBottleSessionFromMilkStash = vi.fn();

vi.mock('@/lib/firestore', () => ({
  createBottleSession: (...args: unknown[]) => mockCreateBottleSession(...args),
  createBottleSessionFromMilkStash: (...args: unknown[]) => mockCreateBottleSessionFromMilkStash(...args),
  subscribeToBottleSessions: vi.fn((_: string, callback: (sessions: BottleSession[]) => void) => {
    bottleCallback = callback;
    callback([]);
    return vi.fn();
  }),
  subscribeToMilkStash: vi.fn((_: string, callback: (stash: MilkStash[]) => void) => {
    milkStashCallback = callback;
    callback([]);
    return vi.fn();
  }),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock('@/stores/appStore', () => ({
  useAppStore: () => ({
    settings: mockSettings,
  }),
}));

import { BottleView } from './BottleView';

describe('BottleView', () => {
  beforeEach(() => {
    bottleCallback = null;
    milkStashCallback = null;
    mockCreateBottleSession.mockReset();
    mockCreateBottleSession.mockResolvedValue('bottle-1');
    mockCreateBottleSessionFromMilkStash.mockReset();
    mockCreateBottleSessionFromMilkStash.mockResolvedValue('bottle-1');
  });

  it('links a selected fridge bottle when logging a breast milk feeding', async () => {
    const user = userEvent.setup();
    const { container } = render(<BottleView baby={mockBaby} />);

    const stashItem: MilkStash = {
      id: 'stash-1',
      userId: mockUser.uid,
      date: '2024-01-15',
      volume: 4,
      volumeUnit: 'oz',
      location: 'fridge',
      pumpedDate: '2024-01-15T09:00:00.000Z',
      expirationDate: '2024-01-19T09:00:00.000Z',
      isUsed: false,
      usedDate: null,
      isInUse: false,
      inUseStartDate: null,
      notes: null,
      createdAt: '2024-01-15T09:00:00.000Z',
      updatedAt: '2024-01-15T09:00:00.000Z',
    };

    act(() => {
      milkStashCallback?.([stashItem]);
    });

    await user.click(screen.getByRole('button', { name: 'Custom' }));

    expect(screen.getByText('Fridge breast milk inventory')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /4\.0 oz/i }));

    const volumeInput = container.querySelector('input[type="number"]');
    expect(volumeInput).not.toBeNull();
    await user.clear(volumeInput!);
    await user.type(volumeInput!, '4');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateBottleSessionFromMilkStash).toHaveBeenCalledWith(
        mockBaby.id,
        mockUser.uid,
        expect.objectContaining({
          contentType: 'breastMilk',
          milkStashId: 'stash-1',
          volume: 4,
        })
      );
    });

    expect(mockCreateBottleSession).not.toHaveBeenCalled();
  });
});
