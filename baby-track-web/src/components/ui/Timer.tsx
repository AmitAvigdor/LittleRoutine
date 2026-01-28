import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface TimerProps {
  initialSeconds?: number;
  onTimeUpdate?: (seconds: number) => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void; // Called when resuming from pause (seconds > 0)
  onStop?: (totalSeconds: number) => void;
  onReset?: () => void;
  isRunning?: boolean;
  isPaused?: boolean; // External pause state for persistence
  showControls?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function Timer({
  initialSeconds = 0,
  onTimeUpdate,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  isRunning: externalIsRunning,
  isPaused: externalIsPaused,
  showControls = true,
  size = 'lg',
  color,
}: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(externalIsRunning ?? false);

  useEffect(() => {
    if (externalIsRunning !== undefined) {
      setIsRunning(externalIsRunning);
    }
  }, [externalIsRunning]);

  // Sync seconds when initialSeconds changes significantly (e.g., when resuming an active session)
  // This handles both: initial mount and navigating back to a page with an active timer
  useEffect(() => {
    // Always sync if not running
    if (!isRunning) {
      setSeconds(initialSeconds);
      return;
    }
    // When running, sync if initialSeconds is significantly different (more than 2 seconds)
    // This indicates we're resuming a session, not just normal tick updates
    // Don't sync to 0 - that would reset the timer (0 means "no value", not "reset")
    if (initialSeconds > 0) {
      setSeconds((currentSeconds) => {
        const diff = Math.abs(initialSeconds - currentSeconds);
        if (diff > 2) {
          return initialSeconds;
        }
        return currentSeconds;
      });
    }
  }, [initialSeconds, isRunning]);

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning) {
      interval = window.setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1;
          onTimeUpdate?.(newSeconds);
          return newSeconds;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, onTimeUpdate]);

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleStart = () => {
    setIsRunning(true);
    // Differentiate between fresh start and resume from pause
    if (externalIsPaused || seconds > 0) {
      // Resuming from pause
      onResume?.() ?? onStart?.();
    } else {
      // Fresh start
      onStart?.();
    }
  };

  const handlePause = () => {
    setIsRunning(false);
    onPause?.();
  };

  const handleStop = () => {
    setIsRunning(false);
    onStop?.(seconds);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
    onReset?.();
  };

  const sizeClasses = {
    sm: 'text-4xl',
    md: 'text-6xl',
    lg: 'text-7xl',
  };

  const themeColor = color || '#9c27b0';

  return (
    <div className="flex flex-col items-center">
      {/* Timer Display */}
      <div
        className={clsx(
          'timer-display font-bold tracking-tight',
          sizeClasses[size]
        )}
        style={{ color: themeColor }}
      >
        {formatTime(seconds)}
      </div>

      {/* Status indicator */}
      {isRunning && (
        <div className="flex items-center gap-2 mt-3">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: themeColor }}
          />
          <span className="text-sm font-medium text-gray-500">Recording</span>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-4 mt-6">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 100%)`,
              }}
            >
              <Play className="w-7 h-7 text-white ml-1" />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="w-16 h-16 rounded-full flex items-center justify-center border-2 bg-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ borderColor: themeColor }}
            >
              <Pause className="w-7 h-7" style={{ color: themeColor }} />
            </button>
          )}

          {seconds > 0 && (
            <>
              <button
                onClick={handleStop}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Square className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={handleReset}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Simple time display (non-interactive)
interface TimeDisplayProps {
  seconds: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function TimeDisplay({ seconds, size = 'md', color }: TimeDisplayProps) {
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sizeClasses = {
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-7xl',
  };

  return (
    <span
      className={clsx('timer-display font-bold', sizeClasses[size])}
      style={{ color: color || '#9c27b0' }}
    >
      {formatTime(seconds)}
    </span>
  );
}
