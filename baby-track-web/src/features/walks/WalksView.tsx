import { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { WalkSession, BabyMood, formatDuration } from '@/types';
import { createWalkSession, endWalkSession, createCompleteWalkSession, subscribeToWalkSessions, deleteWalkSession } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/stores/toastStore';
import { Clock, Timer as TimerIcon, Edit3, Trash2, Footprints, ChevronDown, ChevronUp } from 'lucide-react';

type EntryMode = 'timer' | 'manual';

const entryModeOptions = [
  { value: 'timer', label: 'Timer', icon: <TimerIcon className="w-4 h-4" /> },
  { value: 'manual', label: 'Manual', icon: <Edit3 className="w-4 h-4" /> },
];

const WALK_COLOR = '#8bc34a';

export function WalksView() {
  const { user } = useAuth();
  const { selectedBaby, babies } = useAppStore();

  const [sessions, setSessions] = useState<WalkSession[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('timer');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState(format(new Date(), 'HH:mm'));
  const [manualEndTime, setManualEndTime] = useState(format(new Date(), 'HH:mm'));

  // Subscribe to sessions
  useEffect(() => {
    if (!selectedBaby) return;
    const unsubscribe = subscribeToWalkSessions(selectedBaby.id, setSessions);
    return () => unsubscribe();
  }, [selectedBaby]);

  // Check for active session on load
  useEffect(() => {
    if (showForm) return;

    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      setActiveSessionId(activeSession.id);
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

  const handleStart = useCallback(async () => {
    if (!user || !selectedBaby || starting) return;

    setStarting(true);
    try {
      const sessionId = await createWalkSession(selectedBaby.id, user.uid, {
        startTime: new Date().toISOString(),
      });
      setActiveSessionId(sessionId);
      setIsTimerRunning(true);
      setTimerSeconds(0);
    } catch (error) {
      console.error('Error starting walk session:', error);
      toast.error('Failed to start walk. Please try again.');
    } finally {
      setStarting(false);
    }
  }, [user, selectedBaby, starting]);

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

    setSaving(true);
    try {
      await endWalkSession(
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

      toast.success(`${formatDuration(savedDuration)} walk logged`);
    } catch (error) {
      console.error('Error saving walk session:', error);
      toast.error('Failed to save walk. Please try again.');
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
    if (durationMinutes <= 0 || durationMinutes > 300) {
      toast.error('Please enter valid times (max 5 hours).');
      return;
    }

    setSaving(true);
    try {
      await createCompleteWalkSession(selectedBaby.id, user.uid, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: notes || null,
        babyMood,
      });

      setManualDate(new Date().toISOString().split('T')[0]);
      setManualStartTime(format(new Date(), 'HH:mm'));
      setManualEndTime(format(new Date(), 'HH:mm'));
      setNotes('');
      setBabyMood(null);

      toast.success(`${formatDuration(durationMinutes * 60)} walk logged`);
    } catch (error) {
      console.error('Error saving walk session:', error);
      toast.error('Failed to save walk. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setShowDetails(false);
    setIsTimerRunning(true);
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
      await deleteWalkSession(sessionIdToDelete);
      setActiveSessionId(null);
      setTimerSeconds(0);
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
      setShowDetails(false);
      toast.info('Walk discarded');
    } catch (error) {
      console.error('Error discarding walk session:', error);
      toast.error('Failed to discard walk. Please try again.');
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
  const todayTotalWalk = todaySessions.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div>
      <Header title="Walks" />

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

        {/* Timer Mode */}
        {entryMode === 'timer' && !showForm && (
          <Card className="text-center">
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${WALK_COLOR}20` }}
              >
                <Footprints className="w-8 h-8" style={{ color: WALK_COLOR }} />
              </div>
            </div>

            <Timer
              isRunning={isTimerRunning}
              initialSeconds={timerSeconds}
              onTimeUpdate={setTimerSeconds}
              onStart={handleStart}
              onStop={handleStop}
              color={WALK_COLOR}
            />
          </Card>
        )}

        {/* Manual Entry Mode */}
        {entryMode === 'manual' && !showForm && !isTimerRunning && (
          <Card>
            <CardHeader
              title="Log Past Walk"
              subtitle="Stroller walk or outing"
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

              <BabyMoodSelector
                label="Baby's mood"
                value={babyMood}
                onChange={setBabyMood}
              />

              <Textarea
                label="Notes (optional)"
                placeholder="Where did you go? How was the walk?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />

              <Button
                onClick={handleManualSave}
                className="w-full"
                disabled={!manualStartTime || !manualEndTime || saving}
                style={{ backgroundColor: WALK_COLOR }}
              >
                {saving ? 'Saving...' : 'Save Walk'}
              </Button>
            </div>
          </Card>
        )}

        {/* Save Form (Timer mode only) */}
        {showForm && entryMode === 'timer' && (
          <Card>
            <CardHeader
              title="Walk Ended"
              subtitle={`${formatDuration(timerSeconds)} walk`}
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
                    placeholder="Where did you go? How was the walk?"
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
        <Card className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Footprints className="w-5 h-5" style={{ color: WALK_COLOR }} />
            <span className="text-sm text-gray-500">Today's Walks</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(todayTotalWalk)}</p>
          <p className="text-xs text-gray-500">{todaySessions.length} walk{todaySessions.length !== 1 ? 's' : ''}</p>
        </Card>

        {/* Recent Sessions */}
        {completedSessions.length > 0 && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Recent Walks</h3>
            <div className="space-y-2">
              {completedSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${WALK_COLOR}20` }}
                    >
                      <Footprints className="w-5 h-5" style={{ color: WALK_COLOR }} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Walk</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{format(parseISO(session.startTime), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: WALK_COLOR }}>
                      {formatDuration(session.duration)}
                    </p>
                    {session.babyMood && (
                      <MoodIndicator babyMood={session.babyMood} size="sm" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
