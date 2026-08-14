import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { mockBaby, mockSettings, mockUser } from '@/test/mocks';
import type { MilkStash } from '@/types';

let milkStashCallback: ((stash: MilkStash[]) => void) | null = null;

const mockCreateMilkStash = vi.fn();
const mockMigrateMilkStashToBaby = vi.fn();
const mockSubscribeToMilkStash = vi.fn((_: string, callback: (stash: MilkStash[]) => void, _legacyUserIds?: string[]) => {
  void _legacyUserIds;
  milkStashCallback = callback;
  callback([]);
  return vi.fn();
});
const mockDeleteMilkStashEntry = vi.fn();
const mockDeleteMilkStashEntries = vi.fn();
const mockUpdateMilkStashVolume = vi.fn();
const mockUpdateMilkStashLocation = vi.fn();

vi.mock('@/lib/firestore', () => ({
  createMilkStash: (...args: unknown[]) => mockCreateMilkStash(...args),
  migrateMilkStashToBaby: (...args: unknown[]) => mockMigrateMilkStashToBaby(...args),
  subscribeToMilkStash: (...args: [string, (stash: MilkStash[]) => void, string[]?]) => mockSubscribeToMilkStash(...args),
  markMilkStashInUse: vi.fn(),
  markMilkStashUsed: vi.fn(),
  updateMilkStashVolume: (...args: unknown[]) => mockUpdateMilkStashVolume(...args),
  updateMilkStashLocation: (...args: unknown[]) => mockUpdateMilkStashLocation(...args),
  createBottleSession: vi.fn(),
  deleteMilkStashEntry: (...args: unknown[]) => mockDeleteMilkStashEntry(...args),
  deleteMilkStashEntries: (...args: unknown[]) => mockDeleteMilkStashEntries(...args),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock('@/stores/appStore', () => ({
  useAppStore: () => ({
    settings: mockSettings,
    babies: [mockBaby],
    selectedBaby: mockBaby,
  }),
}));

import { MilkStashView } from './MilkStashView';

const renderMilkStashView = () => render(
  <BrowserRouter>
    <MilkStashView />
  </BrowserRouter>
);

const makeStashItem = (overrides: Partial<MilkStash> = {}): MilkStash => ({
  id: 'stash-1',
  babyId: mockBaby.id,
  userId: mockUser.uid,
  date: '2024-01-15',
  volume: 4,
  volumeUnit: 'oz',
  location: 'fridge',
  pumpedDate: '2024-01-15',
  expirationDate: '2024-01-19T09:00:00.000Z',
  isUsed: false,
  usedDate: null,
  isInUse: false,
  inUseStartDate: null,
  notes: null,
  createdAt: '2024-01-15T09:00:00.000Z',
  updatedAt: '2024-01-15T09:00:00.000Z',
  ...overrides,
});

describe('MilkStashView', () => {
  beforeEach(() => {
    milkStashCallback = null;
    mockCreateMilkStash.mockReset();
    mockCreateMilkStash.mockResolvedValue('stash-1');
    mockMigrateMilkStashToBaby.mockReset();
    mockMigrateMilkStashToBaby.mockResolvedValue(undefined);
    mockSubscribeToMilkStash.mockClear();
    mockDeleteMilkStashEntry.mockReset();
    mockDeleteMilkStashEntry.mockResolvedValue(undefined);
    mockDeleteMilkStashEntries.mockReset();
    mockDeleteMilkStashEntries.mockResolvedValue(undefined);
    mockUpdateMilkStashVolume.mockReset();
    mockUpdateMilkStashVolume.mockResolvedValue(undefined);
    mockUpdateMilkStashLocation.mockReset();
    mockUpdateMilkStashLocation.mockResolvedValue(undefined);
  });

  it('subscribes to milk stash by selected baby id', () => {
    renderMilkStashView();

    expect(mockMigrateMilkStashToBaby).toHaveBeenCalledWith(mockUser.uid, mockBaby.id);
    expect(mockSubscribeToMilkStash).toHaveBeenCalledWith(mockBaby.id, expect.any(Function), [mockBaby.userId]);
  });

  it('creates new stash entries under the selected baby profile', async () => {
    const user = userEvent.setup();
    renderMilkStashView();

    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.type(screen.getByPlaceholderText('Enter volume'), '4');
    await user.click(screen.getByRole('button', { name: 'Add to Stash' }));

    await waitFor(() => {
      expect(mockCreateMilkStash).toHaveBeenCalledWith(
        mockBaby.id,
        mockUser.uid,
        expect.objectContaining({
          volume: 4,
          volumeUnit: 'oz',
          location: 'fridge',
        })
      );
    });
  });

  it('edits a stash entry volume and updates totals after refresh', async () => {
    const user = userEvent.setup();
    renderMilkStashView();

    const first = makeStashItem({ id: 'stash-1', volume: 4 });
    const second = makeStashItem({ id: 'stash-2', volume: 3, pumpedDate: '2024-01-16', createdAt: '2024-01-16T09:00:00.000Z' });

    act(() => {
      milkStashCallback?.([first, second]);
    });

    expect(screen.getByText('7.0 oz')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Edit 4 oz milk stash entry'));

    expect(screen.getByText('Edit milk stash')).toBeInTheDocument();
    const editInput = screen.getByRole('spinbutton');
    await user.clear(editInput);
    await user.type(editInput, '5.5');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateMilkStashVolume).toHaveBeenCalledWith('stash-1', 5.5);
    });

    act(() => {
      milkStashCallback?.([{ ...first, volume: 5.5 }, second]);
    });

    expect(screen.getByText('8.5 oz')).toBeInTheDocument();
  });

  it('moves a fridge stash entry to the freezer from the edit dialog', async () => {
    const user = userEvent.setup();
    renderMilkStashView();

    const item = makeStashItem({ id: 'stash-1', volume: 4, location: 'fridge' });

    act(() => {
      milkStashCallback?.([item]);
    });

    await user.click(screen.getByLabelText('Edit 4 oz milk stash entry'));
    await user.click(screen.getByRole('button', { name: 'Freezer' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateMilkStashLocation).toHaveBeenCalledWith('stash-1', 'freezer', '2024-01-15');
    });
    expect(mockUpdateMilkStashVolume).not.toHaveBeenCalled();
  });

  it('confirms before deleting a single stash entry and updates totals after refresh', async () => {
    const user = userEvent.setup();
    renderMilkStashView();

    const first = makeStashItem({ id: 'stash-1', volume: 4 });
    const second = makeStashItem({ id: 'stash-2', volume: 3, pumpedDate: '2024-01-16', createdAt: '2024-01-16T09:00:00.000Z' });

    act(() => {
      milkStashCallback?.([first, second]);
    });

    expect(screen.getByText('7.0 oz')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Delete 4 oz milk stash entry'));

    expect(screen.getByText('Delete milk stash entry?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDeleteMilkStashEntry).toHaveBeenCalledWith('stash-1');
    });

    act(() => {
      milkStashCallback?.([second]);
    });

    expect(screen.getByText('3.0 oz')).toBeInTheDocument();
  });

  it('supports batch deletion through selection mode', async () => {
    const user = userEvent.setup();
    renderMilkStashView();

    const first = makeStashItem({ id: 'stash-1', volume: 4 });
    const second = makeStashItem({ id: 'stash-2', volume: 3, pumpedDate: '2024-01-16', createdAt: '2024-01-16T09:00:00.000Z' });

    act(() => {
      milkStashCallback?.([first, second]);
    });

    await user.click(screen.getByRole('button', { name: 'Select Multiple' }));
    const selectButtons = screen.getAllByRole('button', { name: 'Select' });
    await user.click(selectButtons[0]);
    await user.click(selectButtons[1]);
    await user.click(screen.getByRole('button', { name: 'Delete Selected (2)' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDeleteMilkStashEntries).toHaveBeenCalledWith(['stash-1', 'stash-2']);
    });
  });
});
