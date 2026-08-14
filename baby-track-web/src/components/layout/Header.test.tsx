import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshHomeDataSync } from '@/features/dashboard/homeDataSync';
import { useAppStore } from '@/stores/appStore';
import { mockBaby, mockUser } from '@/test/mocks';
import { Header } from './Header';

vi.mock('@/stores/appStore', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('@/features/dashboard/homeDataSync', () => ({
  refreshHomeDataSync: vi.fn(),
}));

vi.mock('@/lib/firestore', () => ({
  joinBabyByShareCode: vi.fn(),
}));

vi.mock('@/stores/toastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Header', () => {
  const requestDataRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAppStore).mockReturnValue({
      userId: mockUser.uid,
      selectedBaby: mockBaby,
      babies: [mockBaby],
      setSelectedBabyId: vi.fn(),
      isOnline: true,
      requestDataRefresh,
    } as unknown as ReturnType<typeof useAppStore>);
  });

  it('restarts data sync and reloads the active screen', () => {
    render(
      <MemoryRouter>
        <Header title="Home" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh data' }));

    expect(refreshHomeDataSync).toHaveBeenCalledWith({
      userId: mockUser.uid,
      babyId: mockBaby.id,
    });
    expect(requestDataRefresh).toHaveBeenCalledTimes(1);
  });
});
