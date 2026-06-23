import { act, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockBaby, mockUser } from '@/test/mocks';
import type { SolidFood } from '@/types';

let solidFoodsCallback: ((foods: SolidFood[]) => void) | null = null;

const mockCreateSolidFood = vi.fn();
const mockUpdateSolidFood = vi.fn();
const mockDeleteSolidFood = vi.fn();
const mockSubscribeToSolidFoods = vi.fn((_: string, callback: (foods: SolidFood[]) => void) => {
  solidFoodsCallback = callback;
  callback([]);
  return vi.fn();
});

vi.mock('@/lib/firestore', () => ({
  createSolidFood: (...args: unknown[]) => mockCreateSolidFood(...args),
  updateSolidFood: (...args: unknown[]) => mockUpdateSolidFood(...args),
  deleteSolidFood: (...args: unknown[]) => mockDeleteSolidFood(...args),
  subscribeToSolidFoods: (...args: [string, (foods: SolidFood[]) => void]) => mockSubscribeToSolidFoods(...args),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

const mockSetSelectedBabyId = vi.fn();

vi.mock('@/stores/appStore', () => ({
  useAppStore: () => ({
    babies: [mockBaby],
    selectedBaby: mockBaby,
    setSelectedBabyId: mockSetSelectedBabyId,
  }),
}));

vi.mock('@/stores/toastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { SolidFoodsView } from './SolidFoodsView';

function renderSolidFoodsView(props: ComponentProps<typeof SolidFoodsView> = {}) {
  return render(
    <BrowserRouter>
      <SolidFoodsView {...props} />
    </BrowserRouter>
  );
}

function makeSolidFood(overrides: Partial<SolidFood> = {}): SolidFood {
  return {
    id: 'food-1',
    babyId: mockBaby.id,
    userId: mockUser.uid,
    foodName: 'Banana',
    date: '2026-06-20',
    category: 'fruit',
    isFirstIntroduction: true,
    reaction: 'none',
    reactionNotes: null,
    liked: null,
    photoUrl: null,
    notes: null,
    createdAt: '2026-06-20T08:00:00.000Z',
    updatedAt: '2026-06-20T08:00:00.000Z',
    ...overrides,
  };
}

describe('SolidFoodsView', () => {
  beforeEach(() => {
    solidFoodsCallback = null;
    mockCreateSolidFood.mockReset();
    mockCreateSolidFood.mockResolvedValue('food-1');
    mockUpdateSolidFood.mockReset();
    mockUpdateSolidFood.mockResolvedValue(undefined);
    mockDeleteSolidFood.mockReset();
    mockDeleteSolidFood.mockResolvedValue(undefined);
    mockSubscribeToSolidFoods.mockClear();
    mockSetSelectedBabyId.mockReset();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('opens Add Food immediately when embedded from the feeding tab', () => {
    renderSolidFoodsView({ embedded: true, foods: [], autoOpenAdd: true });

    expect(screen.getByRole('dialog', { name: 'Add Food' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Reaction' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show more details' })).toBeInTheDocument();
  });

  it('creates a new solid food entry for the selected baby', async () => {
    const user = userEvent.setup();
    renderSolidFoodsView();

    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.type(screen.getByLabelText('Food Name'), 'Mango');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateSolidFood).toHaveBeenCalledWith(
        mockBaby.id,
        mockUser.uid,
        expect.objectContaining({
          foodName: 'Mango',
          category: 'fruit',
          isFirstIntroduction: true,
          timestamp: expect.any(String),
        })
      );
    });
  });

  it('marks repeated foods as not first-time by default', async () => {
    const user = userEvent.setup();
    renderSolidFoodsView();

    act(() => {
      solidFoodsCallback?.([makeSolidFood()]);
    });

    await user.click(screen.getByRole('button', { name: 'Add' }));
    const checkbox = screen.getByRole('checkbox', { name: /first time trying this food/i });

    await user.type(screen.getByLabelText('Food Name'), 'Banana');

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText(/already logged before/i)).toBeInTheDocument();
  });

  it('saves a reaction without forcing reaction comments', async () => {
    const user = userEvent.setup();
    renderSolidFoodsView();

    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.type(screen.getByLabelText('Food Name'), 'Egg');
    await user.click(screen.getByRole('button', { name: 'Show more details' }));
    await user.click(screen.getByRole('button', { name: 'Mild' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateSolidFood).toHaveBeenCalledWith(
        mockBaby.id,
        mockUser.uid,
        expect.objectContaining({
          foodName: 'Egg',
          reaction: 'mild',
          reactionNotes: null,
        })
      );
    });
  });

  it('edits an existing entry and sends the update payload', async () => {
    const user = userEvent.setup();
    renderSolidFoodsView();

    act(() => {
      solidFoodsCallback?.([
        makeSolidFood({
          id: 'food-edit',
          foodName: 'Apple',
          notes: 'Started with puree',
        }),
      ]);
    });

    await user.click(screen.getByLabelText('Edit Apple'));
    const notesInput = screen.getByLabelText('Notes (optional)');
    await user.clear(notesInput);
    await user.type(notesInput, 'Liked it more chilled');
    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(mockUpdateSolidFood).toHaveBeenCalledWith(
        'food-edit',
        expect.objectContaining({
          foodName: 'Apple',
          notes: 'Liked it more chilled',
        })
      );
    });
  });

  it('deletes an entry after confirmation', async () => {
    const user = userEvent.setup();
    renderSolidFoodsView();

    act(() => {
      solidFoodsCallback?.([makeSolidFood({ id: 'food-delete', foodName: 'Pear' })]);
    });

    await user.click(screen.getByLabelText('Delete Pear'));

    await waitFor(() => {
      expect(mockDeleteSolidFood).toHaveBeenCalledWith('food-delete');
    });
  });
});
