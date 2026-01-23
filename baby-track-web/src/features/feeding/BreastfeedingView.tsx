import { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MomMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { EditSessionModal } from '@/components/ui/EditSessionModal';
import { Baby, FeedingSession, BreastSide, BabyMood, MomMood, BREAST_SIDE_CONFIG, formatDuration } from '@/types';
import { createFeedingSession, startFeedingSession, endFeedingSession, subscribeToFeedingSessions, deleteFeedingSession } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from '@/stores/toastStore';
import { clsx } from 'clsx';
import { Clock, Timer as TimerIcon, Edit3, Trash2 } from 'lucide-react';

type EntryMode = 'timer' | 'manual';

const entryModeOptions = [
  { value: 'timer', label: 'Timer', icon: <TimerIcon className="w-4 h-4" /> },
  { value: 'manual', label: 'Manual', icon: <Edit3 className="w-4 h-4" /> },
];

interface BreastfeedingViewProps {
  baby: Baby;
}

export function BreastfeedingView({ baby }: BreastfeedingViewProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FeedingSession[]>([]);
  const [selectedSide, setSelectedSide] = useState<BreastSide>('left');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [momMood, setMomMood] = useState<MomMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  // Entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('timer');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));
  const [manualDuration, setManualDuration] = useState('');

  // Edit modal state
  const [selectedSession, setSelectedSession] = useState<FeedingSession | null>(null);

  // Subscribe to sessions
  useEffect(() => {
    const unsubscribe = subscribeToFeedingSessions(baby.id, setSessions);
    return () => unsubscribe();
  }, [baby.id]);

  // Check for active session on load and resume it
  useEffect(() => {
    // Don't override local state if user has already stopped the timer (showForm is true)
    if (showForm) return;

    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      setActiveSessionId(activeSession.id);
      setSelectedSide(activeSession.breastSide);
      setIsTimerRunning(true);
      // Calculate elapsed time
      const startTime = new Date(activeSession.startTime);
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setTimerSeconds(elapsed);
    }
  }, [sessions, showForm]);

  // Get last completed session to suggest next side
  const completedSessions = sessions.filter(s => !s.isActive);
  const lastSession = completedSessions[0];
  const suggestedSide: BreastSide = lastSession?.breastSide === 'left' ? 'right' : 'left';

  useEffect(() => {
    if (!isTimerRunning && !activeSessionId) {
      setSelectedSide(suggestedSide);
    }
  }, [suggestedSide, isTimerRunning, activeSessionId]);

  const handleStart = useCallback(async () => {
    if (!user || starting) return;

    setStarting(true);
    try {
      const sessionId = await startFeedingSession(baby.id, user.uid, {
        startTime: new Date().toISOString(),
        breastSide: selectedSide,
      });

      setActiveSessionId(sessionId);
      setIsTimerRunning(true);
      setShowForm(false);
    } catch (error) {
      console.error('Error starting feeding session:', error);
      toast.error('Failed to start feeding session. Please try again.');
    } finally {
      setStarting(false);
    }
  }, [user, baby.id, selectedSide, starting]);

  const handlePause = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const handleStop = useCallback((totalSeconds: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(totalSeconds);
    setShowForm(true);
  }, []);

  const handleReset = useCallback(() => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setActiveSessionId(null);
    setShowForm(false);
    setNotes('');
    setBabyMood(null);
    setMomMood(null);
    // Reset manual entry fields
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualTime(format(new Date(), 'HH:mm'));
    setManualDuration('');
  }, []);

  const handleCancel = () => {
    setShowForm(false);
    // Resume timer
    setIsTimerRunning(true);
  };

  const handleDiscard = async () => {
    // Find the session to delete
    let sessionIdToDelete = activeSessionId;
    if (!sessionIdToDelete) {
      const activeSession = sessions.find((s) => s.isActive);
      sessionIdToDelete = activeSession?.id ?? null;
    }

    if (!sessionIdToDelete) {
      // No session to delete, just reset
      handleReset();
      return;
    }

    setSaving(true);
    try {
      await deleteFeedingSession(sessionIdToDelete);
      handleReset();
      toast.info('Feeding session discarded');
    } catch (error) {
      console.error('Error discarding feeding session:', error);
      toast.error('Failed to discard session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // For timer mode, we need activeSessionId; for manual mode, we need duration
    if (entryMode === 'timer') {
      // Try to get activeSessionId, or find it from sessions as fallback
      let sessionIdToSave = activeSessionId;
      if (!sessionIdToSave) {
        const activeSession = sessions.find((s) => s.isActive);
        sessionIdToSave = activeSession?.id ?? null;
      }

      if (!sessionIdToSave) {
        console.error('No active session to save');
        return;
      }

      const savedSessionId = sessionIdToSave;
      const savedDuration = timerSeconds;
      const savedSide = selectedSide;

      setSaving(true);
      try {
        await endFeedingSession(
          sessionIdToSave,
          new Date().toISOString(),
          notes || null,
          babyMood,
          momMood
        );
        handleReset();

        toast.success(`${formatDuration(savedDuration)} ${BREAST_SIDE_CONFIG[savedSide].label} side logged`);
      } catch (error) {
        console.error('Error saving feeding session:', error);
        toast.error('Failed to save feeding session. Please try again.');
      } finally {
        setSaving(false);
      }
    } else {
      // Manual entry
      if (!manualDuration) return;

      const durationMinutes = parseInt(manualDuration, 10);
      if (isNaN(durationMinutes) || durationMinutes <= 0 || durationMinutes > 120) {
        toast.error('Please enter a valid duration (1-120 minutes).');
        return;
      }

      setSaving(true);
      try {
        const sessionStartTime = new Date(`${manualDate}T${manualTime}`);
        const sessionEndTime = new Date(sessionStartTime.getTime() + durationMinutes * 60 * 1000);

        const sessionId = await createFeedingSession(baby.id, user.uid, {
          breastSide: selectedSide,
          startTime: sessionStartTime.toISOString(),
          endTime: sessionEndTime.toISOString(),
          notes: notes || null,
          babyMood,
          momMood,
        });

        const savedSide = selectedSide;
        handleReset();
        toast.success(`${durationMinutes}min ${BREAST_SIDE_CONFIG[savedSide].label} side logged`);
      } catch (error) {
        console.error('Error saving feeding session:', error);
        toast.error('Failed to save feeding session. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  // Today's stats (exclude active sessions)
  const todaySessions = completedSessions.filter((s) => isToday(parseISO(s.startTime)));
  const todayTotalSeconds = todaySessions.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="space-y-4">
      {/* Entry Mode Toggle */}
      {!isTimerRunning && !showForm && !activeSessionId && (
        <div className="flex justify-center">
          <SegmentedControl
            options={entryModeOptions}
            value={entryMode}
            onChange={(value) => setEntryMode(value as EntryMode)}
          />
        </div>
      )}

      {/* Next Side Suggestion */}
      {lastSession && !isTimerRunning && !showForm && entryMode === 'timer' && !activeSessionId && (
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: `${BREAST_SIDE_CONFIG[suggestedSide].color}15` }}
        >
          <p className="text-sm text-gray-500 mb-1">Start with</p>
          <p
            className="text-2xl font-bold"
            style={{ color: BREAST_SIDE_CONFIG[suggestedSide].color }}
          >
            {BREAST_SIDE_CONFIG[suggestedSide].label} Side
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Last: {BREAST_SIDE_CONFIG[lastSession.breastSide].label} • {format(parseISO(lastSession.startTime), 'h:mm a')}
          </p>
        </div>
      )}

      {/* Side Selector */}
      <div className="flex justify-center gap-4">
        {(['left', 'right'] as BreastSide[]).map((side) => {
          const config = BREAST_SIDE_CONFIG[side];
          const isSelected = selectedSide === side;

          return (
            <button
              key={side}
              onClick={() => !isTimerRunning && !activeSessionId && setSelectedSide(side)}
              disabled={isTimerRunning || !!activeSessionId}
              className={clsx(
                'w-28 h-28 rounded-full flex flex-col items-center justify-center',
                'border-4 transition-all duration-300',
                isSelected
                  ? 'border-transparent scale-105 shadow-lg'
                  : 'border-gray-200 opacity-50',
                (isTimerRunning || activeSessionId) && !isSelected && 'opacity-30'
              )}
              style={isSelected ? { backgroundColor: config.color } : undefined}
            >
              <span
                className={clsx(
                  'text-3xl font-bold',
                  isSelected ? 'text-white' : 'text-gray-400'
                )}
              >
                {side === 'left' ? 'L' : 'R'}
              </span>
              <span
                className={clsx(
                  'text-sm',
                  isSelected ? 'text-white/80' : 'text-gray-400'
                )}
              >
                {config.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timer Mode */}
      {entryMode === 'timer' && (
        <Card variant="elevated" className="text-center py-8">
          <Timer
            initialSeconds={timerSeconds}
            isRunning={isTimerRunning}
            onStart={handleStart}
            onPause={handlePause}
            onStop={handleStop}
            onReset={handleReset}
            onTimeUpdate={setTimerSeconds}
            color={BREAST_SIDE_CONFIG[selectedSide].color}
          />
        </Card>
      )}

      {/* Manual Entry Mode */}
      {entryMode === 'manual' && !showForm && (
        <Card>
          <CardHeader title="Log Past Feeding" subtitle="Enter feeding details manually" />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label="Date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
              <Input
                type="time"
                label="Start Time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
              />
            </div>

            <Input
              type="number"
              label="Duration (minutes)"
              placeholder="e.g. 15"
              value={manualDuration}
              onChange={(e) => setManualDuration(e.target.value)}
              min="1"
              max="120"
            />

            <BabyMoodSelector
              label="Baby's mood"
              value={babyMood}
              onChange={setBabyMood}
            />

            <MomMoodSelector
              label="Your mood"
              value={momMood}
              onChange={setMomMood}
            />

            <Textarea
              label="Notes (optional)"
              placeholder="Any notes about this session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <Button
              onClick={handleSave}
              className="w-full"
              disabled={!manualDuration || saving}
            >
              {saving ? 'Saving...' : 'Save Session'}
            </Button>
          </div>
        </Card>
      )}

      {/* Save Form */}
      {showForm && (
        <Card>
          <CardHeader title="Session Complete" subtitle={`${formatDuration(timerSeconds)} on ${BREAST_SIDE_CONFIG[selectedSide].label} side`} />

          <div className="space-y-4">
            <BabyMoodSelector
              label="Baby's mood"
              value={babyMood}
              onChange={setBabyMood}
            />

            <MomMoodSelector
              label="Your mood"
              value={momMood}
              onChange={setMomMood}
            />

            <Textarea
              label="Notes (optional)"
              placeholder="Any notes about this session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDiscard}
                className="px-3"
                disabled={saving}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
              <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={saving}>
                Resume
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary-600">{todaySessions.length}</p>
          <p className="text-sm text-gray-500">Sessions today</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-secondary-600">{formatDuration(todayTotalSeconds)}</p>
          <p className="text-sm text-gray-500">Total time</p>
        </Card>
      </div>

      {/* Session History */}
      {completedSessions.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Sessions</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {completedSessions.slice(0, 5).map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: BREAST_SIDE_CONFIG[session.breastSide].color }}
                >
                  {session.breastSide === 'left' ? 'L' : 'R'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {BREAST_SIDE_CONFIG[session.breastSide].label} side
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(session.duration)}</span>
                    <span>•</span>
                    <span>{format(parseISO(session.startTime), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
                <MoodIndicator babyMood={session.babyMood} momMood={session.momMood} size="sm" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Edit Session Modal */}
      {selectedSession && (
        <EditSessionModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          sessionType="breastfeeding"
          session={selectedSession}
        />
      )}
    </div>
  );
}
