import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { mockUser } from '@/test/mocks';

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

import { DiaperBagChecklistView } from './DiaperBagChecklistView';

const STORAGE_KEY = `diaper-bag-checklist:${mockUser.uid}`;

const renderChecklist = () =>
  render(
    <BrowserRouter>
      <DiaperBagChecklistView />
    </BrowserRouter>
  );

describe('DiaperBagChecklistView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders preset essentials and updates quantities', async () => {
    const user = userEvent.setup();
    renderChecklist();

    expect(screen.getByText('Diapers')).toBeInTheDocument();
    expect(screen.getByText('Wipes')).toBeInTheDocument();
    expect(screen.getByText('Changing Mat')).toBeInTheDocument();
    expect(screen.getByText('Diaper Rash Cream')).toBeInTheDocument();
    expect(screen.getByText('Change of Clothes')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Increase Diapers'));
    await user.click(screen.getByLabelText('Increase Diapers'));
    await user.click(screen.getByLabelText('Increase Wipes'));

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2 items packed')).toBeInTheDocument();
  });

  it('adds and removes custom items', async () => {
    const user = userEvent.setup();
    renderChecklist();

    const input = screen.getByPlaceholderText('Add custom item');
    await user.type(input, 'Pacifier');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Pacifier')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Increase Pacifier'));
    await user.click(screen.getByLabelText('Remove Pacifier'));

    expect(screen.queryByText('Pacifier')).not.toBeInTheDocument();
  });

  it('restores from localStorage without overwriting saved state on mount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderChecklist();

    await user.click(screen.getByLabelText('Increase Diapers'));
    await user.click(screen.getByLabelText('Increase Wipes'));

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toContain('"label":"Diapers"');

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'preset-diapers', label: 'Diapers', quantity: 2, isPreset: true },
        { id: 'preset-wipes', label: 'Wipes', quantity: 1, isPreset: true },
        { id: 'custom-meds', label: 'Medication', quantity: 3, isPreset: false },
      ])
    );

    unmount();
    renderChecklist();

    await waitFor(() => {
      expect(screen.getByText('Medication')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toContain('"label":"Medication"');
      expect(localStorage.getItem(STORAGE_KEY)).toContain('"quantity":3');
    });
  });
});
