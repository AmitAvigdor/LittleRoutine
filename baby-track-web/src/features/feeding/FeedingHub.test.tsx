import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockBaby, mockSettings } from '@/test/mocks';
import type { SolidFood } from '@/types';

const solidFood: SolidFood = {
  id: 'solid-1',
  babyId: mockBaby.id,
  userId: 'user-1',
  foodName: 'Avocado',
  date: '2026-06-22',
  timestamp: '2026-06-22T09:30:00.000Z',
  category: 'vegetable',
  isFirstIntroduction: true,
  reaction: 'none',
  reactionNotes: null,
  liked: 'loved',
  photoUrl: null,
  notes: null,
  createdAt: '2026-06-22T09:30:00.000Z',
  updatedAt: '2026-06-22T09:30:00.000Z',
};

const mockSubscribeToFeedingSessions = vi.fn();
const mockSubscribeToBottleSessions = vi.fn();
const mockSubscribeToSolidFoods = vi.fn();

vi.mock('@/lib/firestore', () => ({
  subscribeToFeedingSessions: (...args: unknown[]) => mockSubscribeToFeedingSessions(...args),
  subscribeToBottleSessions: (...args: unknown[]) => mockSubscribeToBottleSessions(...args),
  subscribeToSolidFoods: (...args: unknown[]) => mockSubscribeToSolidFoods(...args),
  joinBabyByShareCode: vi.fn(),
}));

vi.mock('@/stores/appStore', () => ({
  useAppStore: () => ({
    selectedBaby: mockBaby,
    babies: [mockBaby],
    settings: mockSettings,
    setSelectedBabyId: vi.fn(),
  }),
}));

vi.mock('./BreastfeedingView', () => ({
  BreastfeedingView: () => <div>Breastfeeding content</div>,
}));

vi.mock('./BottleView', () => ({
  BottleView: () => <div>Bottle content</div>,
}));

vi.mock('@/features/nutrition/SolidFoodsView', () => ({
  SolidFoodsView: ({
    embedded,
    foods,
    autoOpenAdd,
    editFoodId,
  }: {
    embedded?: boolean;
    foods?: SolidFood[];
    autoOpenAdd?: boolean;
    editFoodId?: string | null;
    onEditFoodOpened?: () => void;
  }) => {
    return (
      <div>
        Solid foods content · {embedded ? 'embedded' : 'standalone'} · {foods?.length ?? 0} entries · {autoOpenAdd ? 'add open' : 'add closed'} · edit {editFoodId ?? 'none'}
      </div>
    );
  },
}));

import { FeedingHub } from './FeedingHub';

function renderHub(initialEntry = '/feed') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <FeedingHub />
    </MemoryRouter>
  );
}

describe('FeedingHub solids integration', () => {
  beforeEach(() => {
    mockSubscribeToFeedingSessions.mockReset();
    mockSubscribeToBottleSessions.mockReset();
    mockSubscribeToSolidFoods.mockReset();

    mockSubscribeToFeedingSessions.mockImplementation((_: string, callback: (items: unknown[]) => void) => {
      callback([]);
      return vi.fn();
    });
    mockSubscribeToBottleSessions.mockImplementation((_: string, callback: (items: unknown[]) => void) => {
      callback([]);
      return vi.fn();
    });
    mockSubscribeToSolidFoods.mockImplementation((_: string, callback: (items: SolidFood[]) => void) => {
      callback([solidFood]);
      return vi.fn();
    });
  });

  it('shows solids as a third feeding tab from the URL without opening add food', async () => {
    renderHub('/feed?tab=solids');

    expect(screen.getByRole('button', { name: 'Breast' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solids' })).toBeInTheDocument();
    expect(await screen.findByText('Solid foods content · embedded · 1 entries · add closed · edit none')).toBeInTheDocument();
    expect(screen.queryByTitle('Milk Stash')).not.toBeInTheDocument();
  });

  it('opens add food when explicitly requested from the URL', async () => {
    renderHub('/feed?tab=solids&action=add');

    expect(await screen.findByText('Solid foods content · embedded · 1 entries · add open · edit none')).toBeInTheDocument();
  });

  it('opens add food when the solids tab is chosen inside Feed', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByRole('button', { name: 'Solids' }));

    expect(await screen.findByText('Solid foods content · embedded · 1 entries · add open · edit none')).toBeInTheDocument();
  });

  it('shows solids in recent feedings and opens that solid entry for editing', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(await screen.findByText('Solids • Avocado'));

    expect(await screen.findByText('Solid foods content · embedded · 1 entries · add closed · edit solid-1')).toBeInTheDocument();
  });
});
