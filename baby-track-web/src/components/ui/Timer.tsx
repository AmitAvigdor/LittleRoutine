import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface TimerProps {
  initialSeconds?: number;
  onTimeUpdate?: (seconds: number) => void;
  onStart?: () => void;
  onPause?: () => void;
  onStop?: (totalSeconds: number) => void;
  onReset?: () => void;
  isRunning?: boolean;
  showControls?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function Timer({
  initialSeconds = 0,
  onTimeUpdate,
  onStart,
  onPause,
  onStop,
  onReset,
  isRunning: externalIsRunning,
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

  // Sync seconds when initialSeconds changes (e.g., when resuming an active session)
  // Only sync when initialSeconds actually changes, not when isRunning changes
  useEffect(() => {
    // Only sync if timer is not running to avoid interfering with active counting
    if (!isRunning) {
      setSeconds(initialSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeconds]); // Intentionally omitting isRunning to prevent reset on stop

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
    onStart?.();
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
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-7xl',
  };

  return (
    <div className="flex flex-col items-center">
      {/* Timer Display */}
      <div
        className={clsx(
          'timer-display font-bold tracking-tight',
          sizeClasses[size]
        )}
        style={{ color: color || '#9c27b0' }}
      >
        {formatTime(seconds)}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-3 mt-6">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              className="w-14 h-14 rounded-full p-0"
              style={{ backgroundColor: color || '#9c27b0' }}
            >
              <Play className="w-6 h-6 text-white ml-0.5" />
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              variant="outline"
              className="w-14 h-14 rounded-full p-0"
            >
              <Pause className="w-6 h-6" />
            </Button>
          )}

          {seconds > 0 && (
            <>
              <Button
                onClick={handleStop}
                variant="secondary"
                className="w-14 h-14 rounded-full p-0"
              >
                <Square className="w-5 h-5 text-white" />
              </Button>

              <Button
                onClick={handleReset}
                variant="ghost"
                className="w-14 h-14 rounded-full p-0"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
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
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
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
