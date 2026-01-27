import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { EditSessionModal } from '@/components/ui/EditSessionModal';
import { StaleTimerModal, STALE_TIMER_THRESHOLD } from '@/components/ui/StaleTimerModal';
import { PlaySession, PlayType, BabyMood, PLAY_TYPE_CONFIG, formatDuration } from '@/types';
import { createPlaySession, endPlaySession, createCompletePlaySession, subscribeToPlaySessions, deletePlaySession } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/stores/toastStore';
import { Clock, Timer as TimerIcon, Edit3, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';

type EntryMode = 'timer' | 'manual';

const entryModeOptions = [
  { value: 'timer', label: 'Timer', icon: <TimerIcon className="w-4 h-4" /> },
  { value: 'manual', label: 'Manual', icon: <Edit3 className="w-4 h-4" /> },
];

const playTypeOptions = Object.entries(PLAY_TYPE_CONFIG).map(([value, config]) => ({
  value,
  label: config.emoji,
}));

export function PlayTimeView() {
  const { user } = useAuth();
  const { selectedBaby, babies } = useAppStore();

  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [playType, setPlayType] = useState<PlayType>('tummy_time');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PlaySession | null>(null);

  // Stale timer modal state
  const [showStaleModal, setShowStaleModal] = useState(false);
  const staleModalDismissedRef = useRef(false);

  // Entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('timer');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState(format(new Date(), 'HH:mm'));
  const [manualEndTime, setManualEndTime] = useState(format(new Date(), 'HH:mm'));

  // Pre-save edit state
  const [showEditBeforeSave, setShowEditBeforeSave] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editDuration, setEditDuration] = useState('');

  // Subscribe to sessions
  useEffect(() => {
    if (!selectedBaby) return;
    const unsubscribe = subscribeToPlaySessions(selectedBaby.id, setSessions);
    return () => unsubscribe();
  }, [selectedBaby]);

  // Check for active session on load
  useEffect(() => {
    if (showForm) return;

    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      setActiveSessionId(activeSession.id);
      setPlayType(activeSession.type);
      setIsTimerRunning(true);
      const startTime = new Date(activeSession.startTime);
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setTimerSeconds(elapsed);
    }
  }, [sessions, showForm]);

  // Re-sync timer when app becomes visible again (e.g., after closing and reopening)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !showForm) {
        const activeSession = sessions.find((s) => s.isActive);
        if (activeSession) {
          setActiveSessionId(activeSession.id);
          setPlayType(activeSession.type);
          setIsTimerRunning(true);
          const startTime = new Date(activeSession.startTime);
          const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
          setTimerSeconds(elapsed);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessions, showForm]);

  // Check for stale timer (5+ hours)
  useEffect(() => {
    if (staleModalDismissedRef.current || showForm || showStaleModal) return;

    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      const startTime = new Date(activeSession.startTime);
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      if (elapsed >= STALE_TIMER_THRESHOLD) {
        setShowStaleModal(true);
      }
    }
  }, [sessions, showForm, showStaleModal]);

  // Also check when app becomes visible
  useEffect(() => {
    const checkStaleOnVisibility = () => {
      if (document.visibilityState === 'visible' && !staleModalDismissedRef.current && !showForm) {
        const activeSession = sessions.find((s) => s.isActive);
        if (activeSession) {
          const startTime = new Date(activeSession.startTime);
          const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
          if (elapsed >= STALE_TIMER_THRESHOLD) {
            setShowStaleModal(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', checkStaleOnVisibility);
    return () => document.removeEventListener('visibilitychange', checkStaleOnVisibility);
  }, [sessions, showForm]);

  const handleStaleTimerContinue = () => {
    staleModalDismissedRef.current = true;
    setShowStaleModal(false);
  };

  const handleStaleTimerStopAndSave = () => {
    setShowStaleModal(false);
    setIsTimerRunning(false);
    setShowForm(true);
  };

  const handleStaleTimerDiscard = async () => {
    setShowStaleModal(false);
    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      try {
        await deletePlaySession(activeSession.id);
        setActiveSessionId(null);
        setTimerSeconds(0);
        setIsTimerRunning(false);
        toast.info('Play session discarded');
      } catch (error) {
        console.error('Error discarding play session:', error);
        toast.error('Failed to discard session');
      }
    }
  };

  const handleStart = useCallback(async () => {
    if (!user || !selectedBaby || starting) return;

    staleModalDismissedRef.current = false; // Reset for new timer
    setStarting(true);
    try {
      const sessionId = await createPlaySession(selectedBaby.id, user.uid, {
        type: playType,
        startTime: new Date().toISOString(),
      });
      setActiveSessionId(sessionId);
      setIsTimerRunning(true);
      setTimerSeconds(0);
    } catch (error) {
      console.error('Error starting play session:', error);
      toast.error('Failed to start session. Please try again.');
    } finally {
      setStarting(false);
    }
  }, [user, selectedBaby, playType, starting]);

  const handleStop = useCallback(async (totalSeconds: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(totalSeconds);
    setShowForm(true);
  }, []);

  const handleSave = async () => {
    let sessionIdToSave = activeSessionId;
    if (!sessionIdToSave) {
      const activeSession = sessions.find((s) => s.isActive);
      sessionIdToSave = activeSession?.id ?? null;
    }

    if (!sessionIdToSave) {
      console.error('No active session to save');
      return;
    }

    const savedDuration = timerSeconds;
    const savedType = playType;

    setSaving(true);
    try {
      await endPlaySession(
        sessionIdToSave,
        new Date().toISOString(),
        notes || null,
        babyMood
      );

      setActiveSessionId(null);
      setTimerSeconds(0);
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
      setShowDetails(false);

      toast.success(`${formatDuration(savedDuration)} ${PLAY_TYPE_CONFIG[savedType].label} logged`);
    } catch (error) {
      console.error('Error saving play session:', error);
      toast.error('Failed to save session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!user || !selectedBaby || !manualStartTime || !manualEndTime) return;

    const startTime = new Date(`${manualDate}T${manualStartTime}`);
    let endTime = new Date(`${manualDate}T${manualEndTime}`);

    if (endTime <= startTime) {
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));
    if (durationMinutes <= 0 || durationMinutes > 180) {
      toast.error('Please enter valid times (max 3 hours).');
      return;
    }

    const savedType = playType;

    setSaving(true);
    try {
      await createCompletePlaySession(selectedBaby.id, user.uid, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: playType,
        notes: notes || null,
        babyMood,
      });

      setManualDate(new Date().toISOString().split('T')[0]);
      setManualStartTime(format(new Date(), 'HH:mm'));
      setManualEndTime(format(new Date(), 'HH:mm'));
      setNotes('');
      setBabyMood(null);

      toast.success(`${formatDuration(durationMinutes * 60)} ${PLAY_TYPE_CONFIG[savedType].label} logged`);
    } catch (error) {
      console.error('Error saving play session:', error);
      toast.error('Failed to save session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setShowDetails(false);
    setIsTimerRunning(true);
  };

  // Open edit modal before saving
  const handleEditBeforeSave = () => {
    // Find the active session to get the start time
    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      const startDate = new Date(activeSession.startTime);
      setEditStartTime(format(startDate, "yyyy-MM-dd'T'HH:mm"));
    } else {
      // Fallback: calculate start time from current time minus timer seconds
      const startDate = new Date(Date.now() - timerSeconds * 1000);
      setEditStartTime(format(startDate, "yyyy-MM-dd'T'HH:mm"));
    }
    setEditDuration(Math.floor(timerSeconds / 60).toString());
    setShowEditBeforeSave(true);
  };

  // Apply edit changes
  const handleApplyEdit = () => {
    const durationMinutes = parseInt(editDuration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }
    setTimerSeconds(durationMinutes * 60);
    setShowEditBeforeSave(false);
  };

  const handleDiscard = async () => {
    let sessionIdToDelete = activeSessionId;
    if (!sessionIdToDelete) {
      const activeSession = sessions.find((s) => s.isActive);
      sessionIdToDelete = activeSession?.id ?? null;
    }

    if (!sessionIdToDelete) {
      setActiveSessionId(null);
      setTimerSeconds(0);
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
      setShowDetails(false);
      return;
    }

    setSaving(true);
    try {
      await deletePlaySession(sessionIdToDelete);
      setActiveSessionId(null);
      setTimerSeconds(0);
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
      setShowDetails(false);
      toast.info('Play session discarded');
    } catch (error) {
      console.error('Error discarding play session:', error);
      toast.error('Failed to discard session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  // Today's stats
  const completedSessions = sessions.filter((s) => !s.isActive);
  const todaySessions = completedSessions.filter((s) => isToday(parseISO(s.startTime)));
  const todayTummyTime = todaySessions
    .filter((s) => s.type === 'tummy_time')
    .reduce((sum, s) => sum + s.duration, 0);
  const todayTotalPlay = todaySessions.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div>
      <Header title="Play Time" />

      <div className="px-4 py-4 space-y-4">
        {/* Entry Mode Toggle */}
        {!isTimerRunning && !showForm && (
          <div className="flex justify-center">
            <SegmentedControl
              options={entryModeOptions}
              value={entryMode}
              onChange={(value) => setEntryMode(value as EntryMode)}
            />
          </div>
        )}

        {/* Play Type Selector */}
        <div className="flex justify-center">
          <SegmentedControl
            options={playTypeOptions}
            value={playType}
            onChange={(value) => setPlayType(value as PlayType)}
          />
        </div>

        {/* Play Type Label */}
        <p className="text-center text-sm text-gray-600">
          {PLAY_TYPE_CONFIG[playType].label}
        </p>

        {/* Timer Mode */}
        {entryMode === 'timer' && !showForm && (
          <Card className="text-center">
            <Timer
              isRunning={isTimerRunning}
              initialSeconds={timerSeconds}
              onTimeUpdate={setTimerSeconds}
              onStart={handleStart}
              onStop={handleStop}
              color={PLAY_TYPE_CONFIG[playType].color}
            />
          </Card>
        )}

        {/* Manual Entry Mode */}
        {entryMode === 'manual' && !showForm && !isTimerRunning && (
          <Card>
            <CardHeader
              title="Log Past Play Time"
              subtitle={PLAY_TYPE_CONFIG[playType].label}
            />

            <div className="space-y-4">
              <Input
                type="date"
                label="Date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="time"
                  label="Start Time"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                />
                <Input
                  type="time"
                  label="End Time"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                />
              </div>

              <Button
                onClick={handleManualSave}
                className="w-full"
                disabled={!manualStartTime || !manualEndTime || saving}
                style={{ backgroundColor: PLAY_TYPE_CONFIG[playType].color }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>

              {/* Expandable details section */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <span>Add details (optional)</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetails && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <BabyMoodSelector
                    label="Baby's mood"
                    value={babyMood}
                    onChange={setBabyMood}
                  />

                  <Textarea
                    label="Notes (optional)"
                    placeholder="Any notes about this play session..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Save Form (Timer mode only) */}
        {showForm && entryMode === 'timer' && (
          <Card>
            <CardHeader
              title="Play Time Ended"
              subtitle={`${formatDuration(timerSeconds)} of ${PLAY_TYPE_CONFIG[playType].label}`}
            />

            <div className="space-y-4">
              {/* Action buttons at top */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDiscard}
                  className="px-3"
                  disabled={saving}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEditBeforeSave}
                  className="px-3"
                  disabled={saving}
                >
                  <Edit3 className="w-4 h-4 text-blue-500" />
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={saving}>
                  Resume
                </Button>
                <Button onClick={handleSave} className="flex-1" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>

              {/* Expandable details section */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <span>Add details (optional)</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetails && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <BabyMoodSelector
                    label="Baby's mood"
                    value={babyMood}
                    onChange={setBabyMood}
                  />

                  <Textarea
                    label="Notes (optional)"
                    placeholder="Any notes about this play session..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-lg">{PLAY_TYPE_CONFIG.tummy_time.emoji}</span>
              <span className="text-sm text-gray-500">Tummy Time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(todayTummyTime)}</p>
            <p className="text-xs text-gray-500">today</p>
          </Card>
          <Card className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-lg">🎮</span>
              <span className="text-sm text-gray-500">Total Play</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(todayTotalPlay)}</p>
            <p className="text-xs text-gray-500">{todaySessions.length} sessions</p>
          </Card>
        </div>

        {/* Recent Sessions */}
        {completedSessions.length > 0 && (
          <Card padding="none">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Play Sessions</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {completedSessions.slice(0, 5).map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-xl">{PLAY_TYPE_CONFIG[session.type].emoji}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {PLAY_TYPE_CONFIG[session.type].label}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(session.duration)}</span>
                      <span>•</span>
                      <span>{format(parseISO(session.startTime), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <MoodIndicator babyMood={session.babyMood} size="sm" />
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
            sessionType="play"
            session={selectedSession}
          />
        )}

        {/* Stale Timer Modal */}
        <StaleTimerModal
          isOpen={showStaleModal}
          duration={timerSeconds}
          activityName="play time"
          onContinue={handleStaleTimerContinue}
          onStopAndSave={handleStaleTimerStopAndSave}
          onDiscard={handleStaleTimerDiscard}
        />

        {/* Pre-save Edit Modal */}
        {showEditBeforeSave && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Before Saving</h3>
                <button
                  onClick={() => setShowEditBeforeSave(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <Input
                  type="datetime-local"
                  label="Start Time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
                <Input
                  type="number"
                  label="Duration (minutes)"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  min="1"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditBeforeSave(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleApplyEdit} className="flex-1">
                    Apply
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
