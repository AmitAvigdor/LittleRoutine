import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UndoActivityDialog } from './UndoActivityDialog';

describe('UndoActivityDialog', () => {
  it('requires explicit confirmation before undoing an activity', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <UndoActivityDialog
        activityLabel="Bottle"
        busy={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Undo this activity?')).toBeInTheDocument();
    expect(screen.getByText(/latest “Bottle” record/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep activity' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, undo' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('lets the user safely leave the activity unchanged', () => {
    const onCancel = vi.fn();

    render(
      <UndoActivityDialog
        activityLabel="Sleep"
        busy={false}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Keep activity' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
