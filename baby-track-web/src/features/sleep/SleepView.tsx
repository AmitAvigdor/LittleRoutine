import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { EditSessionModal } from '@/components/ui/EditSessionModal';
import { StaleTimerModal, STALE_TIMER_THRESHOLD } from '@/components/ui/StaleTimerModal';
import { SleepSession, SleepType, BabyMood, SLEEP_TYPE_CONFIG, formatSleepDuration } from '@/types';
import { createSleepSession, endSleepSession, createCompleteSleepSession, subscribeToSleepSessions, deleteSleepSession } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/stores/toastStore';
import { Moon, Sun, Clock, Bed, Timer as TimerIcon, Edit3, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';

type EntryMode = 'timer' | 'manual';

const entryModeOptions = [
  { value: 'timer', label: 'Timer', icon: <TimerIcon className="w-4 h-4" /> },
  { value: 'manual', label: 'Manual', icon: <Edit3 className="w-4 h-4" /> },
];


export function SleepView() {
  const { user } = useAuth();
  const { selectedBaby, babies } = useAppStore();
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [sleepType, setSleepType] = useState<SleepType>('nap');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  // Entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('timer');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));
  const [manualDuration, setManualDuration] = useState('');

  // Edit modal state
  const [selectedSession, setSelectedSession] = useState<SleepSession | null>(null);

  // Expandable details state
  const [showDetails, setShowDetails] = useState(false);

  // Pre-save edit state
  const [showEditBeforeSave, setShowEditBeforeSave] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editDuration, setEditDuration] = useState('');

  // Stale timer modal state
  const [showStaleModal, setShowStaleModal] = useState(false);
  const staleModalDismissedRef = useRef(false);

  // Subscribe to sessions
  useEffect(() => {
    if (!selectedBaby) return;
    const unsubscribe = subscribeToSleepSessions(selectedBaby.id, setSessions);
    return () => unsubscribe();
  }, [selectedBaby]);

  // Check for active session on load
  useEffect(() => {
    // Don't override local state if user has already stopped the timer (showForm is true)
    if (showForm) return;

    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      setActiveSessionId(activeSession.id);
      setSleepType(activeSession.type);
      setIsTimerRunning(true);
      // Calculate elapsed time
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
          setSleepType(activeSession.type);
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

  // Check for stale timer (5+ hours) - skip for night sleep
  useEffect(() => {
    if (staleModalDismissedRef.current || showForm || showStaleModal) return;

    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      // Don't show stale modal for night sleep - it's expected to be long
      if (activeSession.type === 'night') return;

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
          // Don't show stale modal for night sleep - it's expected to be long
          if (activeSession.type === 'night') return;

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
        await deleteSleepSession(activeSession.id);
        setActiveSessionId(null);
        setTimerSeconds(0);
        setIsTimerRunning(false);
        toast.info('Sleep session discarded');
      } catch (error) {
        console.error('Error discarding sleep session:', error);
        toast.error('Failed to discard session');
      }
    }
  };

  const handleStart = useCallback(async () => {
    if (!user || !selectedBaby || starting) return;

    staleModalDismissedRef.current = false; // Reset for new timer
    setStarting(true);
    try {
      const sessionId = await createSleepSession(selectedBaby.id, user.uid, {
        startTime: new Date().toISOString(),
        type: sleepType,
      });

      setActiveSessionId(sessionId);
      setIsTimerRunning(true);
    } catch (error) {
      console.error('Error starting sleep session:', error);
      toast.error('Failed to start sleep tracking. Please try again.');
    } finally {
      setStarting(false);
    }
  }, [user, selectedBaby, sleepType, starting]);

  const handleStop = useCallback(async (totalSeconds: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(totalSeconds);
    setShowForm(true);
  }, []);

  const handleSave = async () => {
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
    const savedType = sleepType;

    setSaving(true);
    try {
      await endSleepSession(
        sessionIdToSave,
        new Date().toISOString(),
        notes || null,
        babyMood
      );

      // Reset only on success
      setActiveSessionId(null);
      setTimerSeconds(0);
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
      setShowDetails(false);

      toast.success(`${formatSleepDuration(savedDuration)} ${savedType} logged`);
    } catch (error) {
      console.error('Error saving sleep session:', error);
      toast.error('Failed to save sleep session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!user || !selectedBaby || !manualDuration) return;

    const durationMinutes = parseInt(manualDuration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0 || durationMinutes > 720) {
      toast.error('Please enter a valid duration (1-720 minutes).');
      return;
    }

    // Validate date and time inputs
    if (!manualDate || !manualTime) {
      toast.error('Please enter a valid date and time.');
      return;
    }

    const startTime = new Date(`${manualDate}T${manualTime}`);

    // Check if date is valid
    if (isNaN(startTime.getTime())) {
      toast.error('Invalid date or time. Please check your input.');
      return;
    }

    // Check if date is not in the future
    if (startTime > new Date()) {
      toast.error('Start time cannot be in the future.');
      return;
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const savedType = sleepType;

    setSaving(true);
    try {
      await createCompleteSleepSession(selectedBaby.id, user.uid, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: sleepType,
        notes: notes || null,
        babyMood,
      });

      // Reset form
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualTime(format(new Date(), 'HH:mm'));
      setManualDuration('');
      setNotes('');
      setBabyMood(null);

      toast.success(`${formatSleepDuration(durationMinutes * 60)} ${savedType} logged`);
    } catch (error) {
      console.error('Error saving sleep session:', error);
      toast.error('Failed to save sleep session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setShowDetails(false);
    // Resume timer
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
    // Find the session to delete
    let sessionIdToDelete = activeSessionId;
    if (!sessionIdToDelete) {
      const activeSession = sessions.find((s) => s.isActive);
      sessionIdToDelete = activeSession?.id ?? null;
    }

    if (!sessionIdToDelete) {
      // No session to delete, just reset
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
      await deleteSleepSession(sessionIdToDelete);
      setActiveSessionId(null);
      setTimerSeconds(0);
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
      setShowDetails(false);
      toast.info('Sleep session discarded');
    } catch (error) {
      console.error('Error discarding sleep session:', error);
      toast.error('Failed to discard session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  // Today's stats
  // For naps: count by start time (naps don't span days)
  // For night sleep: count by end time (you want to see it on the day you wake up)
  const completedSessions = sessions.filter((s) => !s.isActive && s.endTime);
  const todayNaps = completedSessions.filter(
    (s) => s.type === 'nap' && isToday(parseISO(s.startTime))
  );
  const todayNight = completedSessions.filter(
    (s) => s.type === 'night' && s.endTime && isToday(parseISO(s.endTime))
  );
  const todayNapTime = todayNaps.reduce((sum, s) => sum + s.duration, 0);
  const todayNightTime = todayNight.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div>
      <Header title="Sleep" />

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

        {/* Type Selector */}
        <div className="flex justify-center gap-4">
          {(['nap', 'night'] as SleepType[]).map((type) => {
            const config = SLEEP_TYPE_CONFIG[type];
            const isSelected = sleepType === type;
            const Icon = type === 'nap' ? Sun : Moon;

            return (
              <button
                key={type}
                onClick={() => !isTimerRunning && setSleepType(type)}
                disabled={isTimerRunning}
                className={clsx(
                  'relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300',
                  isSelected
                    ? 'text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                  isTimerRunning && !isSelected && 'opacity-40 cursor-not-allowed'
                )}
                style={isSelected ? {
                  background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
                  boxShadow: `0 8px 20px -8px ${config.color}80`
                } : undefined}
              >
                <Icon className={clsx('w-5 h-5', isSelected ? 'text-white' : 'text-gray-400')} />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Timer Mode */}
        {entryMode === 'timer' && (
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(180deg, ${SLEEP_TYPE_CONFIG[sleepType].color}10 0%, ${SLEEP_TYPE_CONFIG[sleepType].color}03 100%)`,
            }}
          >
            {/* Decorative elements */}
            <div
              className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-15"
              style={{ backgroundColor: SLEEP_TYPE_CONFIG[sleepType].color }}
            />
            <div
              className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10"
              style={{ backgroundColor: SLEEP_TYPE_CONFIG[sleepType].color }}
            />
            {sleepType === 'night' && (
              <>
                <div className="absolute top-6 right-8 w-2 h-2 rounded-full bg-indigo-300/40" />
                <div className="absolute top-12 right-16 w-1.5 h-1.5 rounded-full bg-indigo-300/30" />
                <div className="absolute top-8 right-24 w-1 h-1 rounded-full bg-indigo-300/20" />
              </>
            )}

            <div className="relative py-10 px-4">
              {!isTimerRunning && !showForm ? (
                <div className="text-center">
                  <div
                    className="w-28 h-28 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${SLEEP_TYPE_CONFIG[sleepType].color}20 0%, ${SLEEP_TYPE_CONFIG[sleepType].color}10 100%)`,
                      boxShadow: `0 10px 30px -10px ${SLEEP_TYPE_CONFIG[sleepType].color}40`
                    }}
                  >
                    {sleepType === 'nap' ? (
                      <Sun className="w-14 h-14" style={{ color: SLEEP_TYPE_CONFIG[sleepType].color }} />
                    ) : (
                      <Moon className="w-14 h-14" style={{ color: SLEEP_TYPE_CONFIG[sleepType].color }} />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Start {sleepType === 'nap' ? 'Nap' : 'Night Sleep'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Tap the button to begin tracking
                  </p>
                  <Button
                    onClick={handleStart}
                    className="px-8 py-3 text-base shadow-lg hover:shadow-xl transition-shadow"
                    style={{
                      background: `linear-gradient(135deg, ${SLEEP_TYPE_CONFIG[sleepType].color} 0%, ${SLEEP_TYPE_CONFIG[sleepType].color}dd 100%)`,
                      boxShadow: `0 8px 20px -8px ${SLEEP_TYPE_CONFIG[sleepType].color}80`
                    }}
                    disabled={starting}
                  >
                    <Bed className="w-5 h-5 mr-2" />
                    {starting ? 'Starting...' : 'Start Sleep'}
                  </Button>
                </div>
              ) : (
                <Timer
                  initialSeconds={timerSeconds}
                  isRunning={isTimerRunning}
                  onStop={handleStop}
                  onTimeUpdate={setTimerSeconds}
                  showControls={!showForm}
                  color={SLEEP_TYPE_CONFIG[sleepType].color}
                />
              )}
            </div>
          </div>
        )}

        {/* Manual Entry Mode */}
        {entryMode === 'manual' && (
          <Card>
            <CardHeader
              title="Log Past Sleep"
              subtitle={sleepType === 'nap' ? 'Nap' : 'Night Sleep'}
            />

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
                  label="Time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                />
              </div>

              <Input
                type="number"
                label="Duration (minutes)"
                placeholder="e.g. 45"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                min="1"
                max="720"
              />

              <Button
                onClick={handleManualSave}
                className="w-full"
                disabled={!manualDuration || saving}
                style={{ backgroundColor: SLEEP_TYPE_CONFIG[sleepType].color }}
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
                    label="Baby's mood when waking"
                    value={babyMood}
                    onChange={setBabyMood}
                  />

                  <Textarea
                    label="Notes (optional)"
                    placeholder="Any notes about this sleep..."
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
              title="Sleep Ended"
              subtitle={`${formatSleepDuration(timerSeconds)} of ${sleepType === 'nap' ? 'napping' : 'night sleep'}`}
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
                    label="Baby's mood when waking"
                    value={babyMood}
                    onChange={setBabyMood}
                  />

                  <Textarea
                    label="Notes (optional)"
                    placeholder="Any notes about this sleep..."
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
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 text-center border border-orange-100">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
              <Sun className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-sm text-gray-500 mb-0.5">Naps</p>
            <p className="text-2xl font-bold text-gray-900">{todayNaps.length}</p>
            <p className="text-xs text-gray-500 mt-1">{formatSleepDuration(todayNapTime)} total</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 text-center border border-indigo-100">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-2">
              <Moon className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-sm text-gray-500 mb-0.5">Night</p>
            <p className="text-2xl font-bold text-gray-900">{todayNight.length}</p>
            <p className="text-xs text-gray-500 mt-1">{formatSleepDuration(todayNightTime)} total</p>
          </div>
        </div>

        {/* Session History */}
        {sessions.filter(s => !s.isActive).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">Recent Sleep</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {sessions.filter(s => !s.isActive).slice(0, 5).map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${SLEEP_TYPE_CONFIG[session.type].color} 0%, ${SLEEP_TYPE_CONFIG[session.type].color}cc 100%)`
                    }}
                  >
                    {session.type === 'nap' ? (
                      <Sun className="w-5 h-5" />
                    ) : (
                      <Moon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {SLEEP_TYPE_CONFIG[session.type].label}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium">{formatSleepDuration(session.duration)}</span>
                      <span>•</span>
                      <span className="truncate">{format(parseISO(session.startTime), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <MoodIndicator babyMood={session.babyMood} size="sm" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Edit Session Modal */}
        {selectedSession && (
          <EditSessionModal
            isOpen={!!selectedSession}
            onClose={() => setSelectedSession(null)}
            sessionType="sleep"
            session={selectedSession}
          />
        )}

        {/* Stale Timer Modal */}
        <StaleTimerModal
          isOpen={showStaleModal}
          duration={timerSeconds}
          activityName="sleep"
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
