import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditSessionModal } from './EditSessionModal';
import { createMockSleepSession } from '@/test/mocks';
import type { DiaperChange } from '@/types';

const mockUpdateSleepSession = vi.fn();
const mockUpdateDiaperChange = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/lib/firestore', () => ({
  updateSleepSession: (...args: unknown[]) => mockUpdateSleepSession(...args),
  updateFeedingSession: vi.fn(),
  updatePumpSession: vi.fn(),
  updateBottleSession: vi.fn(),
  updateDiaperChange: (...args: unknown[]) => mockUpdateDiaperChange(...args),
  updatePlaySession: vi.fn(),
  updateWalkSession: vi.fn(),
  deleteSleepSession: vi.fn(),
  deleteFeedingSession: vi.fn(),
  deletePumpSession: vi.fn(),
  deleteBottleSession: vi.fn(),
  deleteDiaperChange: vi.fn(),
  deletePlaySession: vi.fn(),
  deleteWalkSession: vi.fn(),
}));

vi.mock('@/stores/toastStore', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    withUndo: vi.fn(),
  },
}));

describe('EditSessionModal', () => {
  beforeEach(() => {
    mockUpdateSleepSession.mockReset();
    mockUpdateSleepSession.mockResolvedValue(undefined);
    mockUpdateDiaperChange.mockReset();
    mockUpdateDiaperChange.mockResolvedValue(undefined);
    mockToastError.mockReset();
  });

  it('allows sleep sessions that cross midnight', async () => {
    const onClose = vi.fn();
    const expectedStartTime = new Date('2024-01-15T23:30').toISOString();
    const expectedEndTime = new Date('2024-01-16T06:15').toISOString();
    const session = createMockSleepSession({
      id: 'sleep-overnight',
      startTime: '2024-01-15T23:30:00.000Z',
      endTime: '2024-01-16T06:15:00.000Z',
      type: 'night',
    });

    const { container } = render(
      <EditSessionModal
        isOpen={true}
        onClose={onClose}
        sessionType="sleep"
        session={session}
      />
    );

    const dateInput = container.querySelector('input[type="date"]');
    const timeInputs = container.querySelectorAll('input[type="time"]');
    expect(dateInput).not.toBeNull();
    expect(timeInputs).toHaveLength(2);

    fireEvent.change(dateInput!, { target: { value: '2024-01-15' } });
    fireEvent.change(timeInputs[0], { target: { value: '23:30' } });
    fireEvent.change(timeInputs[1], { target: { value: '06:15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateSleepSession).toHaveBeenCalledWith(
        'sleep-overnight',
        expect.objectContaining({
          startTime: expectedStartTime,
          endTime: expectedEndTime,
          type: 'night',
        })
      );
    });

    expect(mockToastError).not.toHaveBeenCalledWith('End time must be after start time.');
    expect(onClose).toHaveBeenCalled();
  });

  it('edits a diaper change without leaving the current screen', async () => {
    const onClose = vi.fn();
    const session: DiaperChange = {
      id: 'diaper-1',
      babyId: 'baby-1',
      userId: 'user-1',
      date: '2024-01-15',
      type: 'wet',
      timestamp: '2024-01-15T10:00:00.000Z',
      notes: null,
      babyMood: null,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    };

    const { container } = render(
      <EditSessionModal
        isOpen={true}
        onClose={onClose}
        sessionType="diaper"
        session={session}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Full' }));
    const dateInput = container.querySelector('input[type="date"]');
    const timeInput = container.querySelector('input[type="time"]');
    expect(dateInput).not.toBeNull();
    expect(timeInput).not.toBeNull();
    fireEvent.change(dateInput!, { target: { value: '2024-01-16' } });
    fireEvent.change(timeInput!, { target: { value: '11:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateDiaperChange).toHaveBeenCalledWith(
        'diaper-1',
        expect.objectContaining({
          type: 'full',
          timestamp: new Date('2024-01-16T11:30').toISOString(),
        })
      );
    });
    expect(onClose).toHaveBeenCalled();
  });
});
