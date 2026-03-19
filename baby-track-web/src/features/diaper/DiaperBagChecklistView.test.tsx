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
    vi.restoreAllMocks();
  });

  it('shows empty, incomplete, and complete status messages based on target quantities', async () => {
    const user = userEvent.setup();
    renderChecklist();

    expect(screen.getByText('Hygiene')).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();
    expect(screen.getByText('Feeding')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Your bag is empty.')).toBeInTheDocument();
    expect(screen.getByText('Start packing your essentials!')).toBeInTheDocument();
    expect(screen.getByText('No custom items yet. Use the button below to add one.')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit Diapers')).toBeInTheDocument();
    expect(screen.getAllByText('Qty missing').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Mark Diapers packed')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Increase Diapers'));
    await user.click(screen.getByLabelText('Increase Diapers'));
    await user.click(screen.getByLabelText('Increase Wipes'));

    expect(screen.getByText('Almost there!')).toBeInTheDocument();
    expect(screen.getByText('You still need to pack:')).toBeInTheDocument();
    expect(screen.getAllByText('Diapers').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Disposable Diaper Bag').length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText('Increase Diapers'));
    await user.click(screen.getByLabelText('Increase Diapers'));
    await user.click(screen.getByLabelText('Increase Diapers'));
    await user.click(screen.getByLabelText('Increase Changing Mat'));
    await user.click(screen.getByLabelText('Increase Diaper Rash Cream'));
    await user.click(screen.getByLabelText('Increase Disposable Diaper Bag'));
    await user.click(screen.getByLabelText('Increase Disposable Diaper Bag'));
    await user.click(screen.getByLabelText('Increase Disposable Diaper Bag'));
    await user.click(screen.getByLabelText('Increase Hand Sanitizer'));
    await user.click(screen.getByLabelText('Increase Change of Clothes'));
    await user.click(screen.getByLabelText('Increase Hat'));
    await user.click(screen.getByLabelText('Increase Burp Cloth'));
    await user.click(screen.getByLabelText('Increase Burp Cloth'));
    await user.click(screen.getByLabelText('Increase Pacifier'));

    expect(screen.getByText('Everything is packed!')).toBeInTheDocument();
    expect(screen.getByText("You're ready to go.")).toBeInTheDocument();
  });

  it('lets users customize preset target quantities and persists the new target', async () => {
    const user = userEvent.setup();
    renderChecklist();

    await user.click(screen.getByLabelText('Edit Diapers'));
    expect(screen.getByText('Adjust Diapers')).toBeInTheDocument();
    expect(screen.queryByLabelText('Item name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Edit target quantity'));
    await user.type(screen.getByLabelText('Edit target quantity'), '7');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Essential item • Target 7 • Tap to adjust target')).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"id":"preset-diapers"');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"targetQuantity":7');
  });

  it('lets users add and edit a custom item from the sticky action', async () => {
    const user = userEvent.setup();
    renderChecklist();

    await user.click(screen.getByRole('button', { name: 'Add Custom Item' }));
    await user.type(screen.getByLabelText('Add custom item'), 'Toy');
    await user.clear(screen.getByLabelText('Initial quantity'));
    await user.type(screen.getByLabelText('Initial quantity'), '1');
    await user.clear(screen.getByLabelText('Target quantity'));
    await user.type(screen.getByLabelText('Target quantity'), '3');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getAllByText('Toy').length).toBeGreaterThan(0);
    expect(screen.getByText('Custom item • Target 3 • Tap to edit or remove')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Edit Toy'));
    expect(screen.getByText('Edit custom item')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Item name'));
    await user.type(screen.getByLabelText('Item name'), 'Toy Clip');
    await user.clear(screen.getByLabelText('Quantity'));
    await user.type(screen.getByLabelText('Quantity'), '2');
    await user.clear(screen.getByLabelText('Edit target quantity'));
    await user.type(screen.getByLabelText('Edit target quantity'), '4');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getAllByText('Toy Clip').length).toBeGreaterThan(0);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"label":"Toy Clip"');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"quantity":2');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"targetQuantity":4');
  });

  it('confirms before deleting a custom item', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderChecklist();

    await user.click(screen.getByRole('button', { name: 'Add Custom Item' }));
    await user.type(screen.getByLabelText('Add custom item'), 'Toy');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await user.click(screen.getByLabelText('Edit Toy'));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to remove this item?');
    expect(screen.queryByText('Toy')).not.toBeInTheDocument();
  });

  it('restores persisted quantities without overwriting saved data on mount', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'preset-diapers', label: 'Diapers', quantity: 2, targetQuantity: 5, isPreset: true, isPacked: true },
        { id: 'preset-wipes', label: 'Wipes', quantity: 1, isPreset: true },
        { id: 'custom-meds', label: 'Medication', quantity: 3, targetQuantity: 4, isPreset: false },
      ])
    );

    renderChecklist();

    await waitFor(() => {
      expect(screen.getAllByText('Medication').length).toBeGreaterThan(0);
      expect(screen.getByText('Almost there!')).toBeInTheDocument();
      expect(screen.getByText('You still need to pack:')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toContain('"label":"Medication"');
      expect(localStorage.getItem(STORAGE_KEY)).toContain('"quantity":3');
      expect(localStorage.getItem(STORAGE_KEY)).toContain('"targetQuantity":4');
    });
  });
});
