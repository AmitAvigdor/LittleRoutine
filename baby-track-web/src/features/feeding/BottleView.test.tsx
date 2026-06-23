import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockBaby, mockSettings, mockUser } from '@/test/mocks';
import type { BottleSession, MilkStash } from '@/types';

let milkStashCallback: ((stash: MilkStash[]) => void) | null = null;

const mockCreateBottleSession = vi.fn();
const mockCreateBottleSessionFromMilkStash = vi.fn();
const mockMigrateMilkStashToBaby = vi.fn();
const mockSubscribeToMilkStash = vi.fn((_: string, callback: (stash: MilkStash[]) => void, _legacyUserIds?: string[]) => {
  void _legacyUserIds;
  milkStashCallback = callback;
  callback([]);
  return vi.fn();
});

vi.mock('@/lib/firestore', () => ({
  createBottleSession: (...args: unknown[]) => mockCreateBottleSession(...args),
  createBottleSessionFromMilkStash: (...args: unknown[]) => mockCreateBottleSessionFromMilkStash(...args),
  migrateMilkStashToBaby: (...args: unknown[]) => mockMigrateMilkStashToBaby(...args),
  subscribeToBottleSessions: vi.fn((_: string, callback: (sessions: BottleSession[]) => void) => {
    callback([]);
    return vi.fn();
  }),
  subscribeToMilkStash: (...args: [string, (stash: MilkStash[]) => void, string[]?]) => mockSubscribeToMilkStash(...args),
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

function makeMilkStash(overrides: Partial<MilkStash> = {}): MilkStash {
  return {
    id: 'stash-1',
    babyId: mockBaby.id,
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
    ...overrides,
  };
}

describe('BottleView', () => {
  beforeEach(() => {
    milkStashCallback = null;
    mockCreateBottleSession.mockReset();
    mockCreateBottleSession.mockResolvedValue('bottle-1');
    mockCreateBottleSessionFromMilkStash.mockReset();
    mockCreateBottleSessionFromMilkStash.mockResolvedValue('bottle-1');
    mockMigrateMilkStashToBaby.mockReset();
    mockMigrateMilkStashToBaby.mockResolvedValue(undefined);
    mockSubscribeToMilkStash.mockClear();
  });

  it('links a selected fridge bottle when logging a breast milk feeding', async () => {
    const user = userEvent.setup();
    const { container } = render(<BottleView baby={mockBaby} />);

    expect(mockMigrateMilkStashToBaby).toHaveBeenCalledWith(mockUser.uid, mockBaby.id);
    expect(mockSubscribeToMilkStash).toHaveBeenCalledWith(mockBaby.id, expect.any(Function), [mockBaby.userId]);

    const stashItem = makeMilkStash();

    act(() => {
      milkStashCallback?.([stashItem]);
    });

    await user.click(screen.getByRole('button', { name: 'Custom' }));

    expect(screen.getByText('Available breast milk')).toBeInTheDocument();
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

  it('shows on-the-go pumped milk as available for bottle feeding', async () => {
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
    const user = userEvent.setup();
    const { container } = render(<BottleView baby={mockBaby} />);

    act(() => {
      milkStashCallback?.([
        makeMilkStash({
          id: 'on-the-go-stash',
          volume: 3,
          isInUse: true,
          inUseStartDate: '2024-01-15T09:30:00.000Z',
          notes: 'On the go',
        }),
      ]);
    });

    await user.click(screen.getByRole('button', { name: 'Custom' }));

    expect(screen.getByText('Available breast milk')).toBeInTheDocument();
    expect(screen.getByText(/On the go/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /3\.0 oz/i }));

    const volumeInput = container.querySelector('input[type="number"]');
    expect(volumeInput).not.toBeNull();
    await user.clear(volumeInput!);
    await user.type(volumeInput!, '3');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateBottleSessionFromMilkStash).toHaveBeenCalledWith(
        mockBaby.id,
        mockUser.uid,
        expect.objectContaining({
          contentType: 'breastMilk',
          milkStashId: 'on-the-go-stash',
          volume: 3,
        })
      );
    });
  });

  it('does not show used milk bottles as available', async () => {
    const user = userEvent.setup();
    render(<BottleView baby={mockBaby} />);

    act(() => {
      milkStashCallback?.([
        makeMilkStash({
          id: 'used-stash',
          isUsed: true,
          usedDate: '2024-01-15T10:00:00.000Z',
        }),
      ]);
    });

    await user.click(screen.getByRole('button', { name: 'Custom' }));

    expect(screen.getByText('No available breast milk to link. You can still log this feeding without selecting one.')).toBeInTheDocument();
  });
});
