import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Timer, TimeDisplay } from './Timer';

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('display', () => {
    it('displays initial time of 00:00', () => {
      render(<Timer />);
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('displays provided initialSeconds', () => {
      render(<Timer initialSeconds={125} />);
      expect(screen.getByText('02:05')).toBeInTheDocument();
    });

    it('displays hours when over 60 minutes', () => {
      render(<Timer initialSeconds={3665} />); // 1:01:05
      expect(screen.getByText('1:01:05')).toBeInTheDocument();
    });
  });

  describe('controls', () => {
    it('shows play button when not running', () => {
      render(<Timer showControls={true} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(1); // Only play button
    });

    it('hides controls when showControls is false', () => {
      render(<Timer showControls={false} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows stop and reset buttons when timer has time and is running', () => {
      render(<Timer initialSeconds={10} isRunning={true} />);

      // Now we should have pause, stop, and reset buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3); // Pause, Stop, Reset
    });
  });

  describe('timer functionality', () => {
    it('increments seconds when running', () => {
      render(<Timer isRunning={true} />);

      // Advance time by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByText('00:03')).toBeInTheDocument();
    });

    it('calls onTimeUpdate callback', () => {
      const onTimeUpdate = vi.fn();
      render(<Timer onTimeUpdate={onTimeUpdate} isRunning={true} />);

      // Advance time by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onTimeUpdate).toHaveBeenCalledWith(1);
      expect(onTimeUpdate).toHaveBeenCalledWith(2);
    });

    it('calls onStart callback when play button clicked', () => {
      const onStart = vi.fn();
      render(<Timer onStart={onStart} />);

      const playButton = screen.getByRole('button');
      fireEvent.click(playButton);

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('calls onStop callback with total seconds', () => {
      const onStop = vi.fn();
      render(<Timer initialSeconds={100} isRunning={true} onStop={onStop} />);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Find and click stop button
      const buttons = screen.getAllByRole('button');
      const stopButton = buttons[1]; // Pause is first, Stop is second
      fireEvent.click(stopButton);

      expect(onStop).toHaveBeenCalledWith(105);
    });
  });

  describe('external control via props', () => {
    it('syncs isRunning from external prop', () => {
      const { rerender } = render(<Timer isRunning={false} />);
      expect(screen.getByText('00:00')).toBeInTheDocument();

      rerender(<Timer isRunning={true} />);

      // Timer should start counting
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('00:02')).toBeInTheDocument();
    });

    it('syncs initialSeconds when timer is not running', () => {
      const { rerender } = render(<Timer initialSeconds={0} isRunning={false} />);
      expect(screen.getByText('00:00')).toBeInTheDocument();

      // Simulate parent updating initialSeconds (e.g., resuming active session)
      rerender(<Timer initialSeconds={300} isRunning={false} />);

      // Should now display 5 minutes
      expect(screen.getByText('05:00')).toBeInTheDocument();
    });

    it('does not sync initialSeconds when timer is running', () => {
      const { rerender } = render(<Timer initialSeconds={100} isRunning={true} />);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Timer should show 105 seconds
      expect(screen.getByText('01:45')).toBeInTheDocument();

      // Parent tries to change initialSeconds
      rerender(<Timer initialSeconds={0} isRunning={true} />);

      // Should NOT reset - timer keeps counting
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('01:46')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles start via click', () => {
      render(<Timer />);

      // Click play
      const playButton = screen.getByRole('button');
      fireEvent.click(playButton);

      // Should still work
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('00:01')).toBeInTheDocument();
    });

    it('cleans up interval on unmount', () => {
      const { unmount } = render(<Timer isRunning={true} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      unmount();

      // Advancing time after unmount should not cause errors
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    });
  });
});

describe('TimeDisplay', () => {
  it('displays formatted time', () => {
    render(<TimeDisplay seconds={125} />);
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('displays hours when needed', () => {
    render(<TimeDisplay seconds={3665} />);
    expect(screen.getByText('1:01:05')).toBeInTheDocument();
  });

  it('applies custom color', () => {
    render(<TimeDisplay seconds={60} color="#ff0000" />);
    const element = screen.getByText('01:00');
    expect(element).toHaveStyle({ color: '#ff0000' });
  });
});
