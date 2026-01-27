import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { MomMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { EditSessionModal } from '@/components/ui/EditSessionModal';
import { StaleTimerModal, STALE_TIMER_THRESHOLD } from '@/components/ui/StaleTimerModal';
import { Baby, PumpSession, PumpSide, MomMood, VolumeUnit, PUMP_SIDE_CONFIG, formatDuration, convertVolume } from '@/types';
import { MilkStorageLocation } from '@/types/enums';
import { createPumpSession, startPumpSession, endPumpSession, subscribeToPumpSessions, deletePumpSession, createMilkStash, createBottleSession, pausePumpSession, resumePumpSession } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/stores/toastStore';
import { Clock, Droplet, Timer as TimerIcon, Edit3, Refrigerator, Snowflake, Baby as BabyIcon, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

type MilkDestination = 'fridge' | 'freezer' | 'use' | null;

type EntryMode = 'timer' | 'manual';

const entryModeOptions = [
  { value: 'timer', label: 'Timer', icon: <TimerIcon className="w-4 h-4" /> },
  { value: 'manual', label: 'Manual', icon: <Edit3 className="w-4 h-4" /> },
];

interface PumpViewProps {
  baby: Baby;
}

const sideOptions = [
  { value: 'left', label: 'Left', color: PUMP_SIDE_CONFIG.left.color },
  { value: 'right', label: 'Right', color: PUMP_SIDE_CONFIG.right.color },
  { value: 'both', label: 'Both', color: PUMP_SIDE_CONFIG.both.color },
];

export function PumpView({ baby }: PumpViewProps) {
  const { user } = useAuth();
  const { settings } = useAppStore();
  const [sessions, setSessions] = useState<PumpSession[]>([]);
  const [selectedSide, setSelectedSide] = useState<PumpSide>('both');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(settings?.preferredVolumeUnit || 'oz');
  const [notes, setNotes] = useState('');
  const [momMood, setMomMood] = useState<MomMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Milk destination state
  const [showMilkDestination, setShowMilkDestination] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<{
    volume: number;
    volumeUnit: VolumeUnit;
    pumpedDate: string;
  } | null>(null);

  // Entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('timer');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));
  const [manualDuration, setManualDuration] = useState('');

  // Pre-save edit state
  const [showEditBeforeSave, setShowEditBeforeSave] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editDuration, setEditDuration] = useState('');

  // Edit modal state
  const [selectedSession, setSelectedSession] = useState<PumpSession | null>(null);

  // Expandable details state
  const [showDetails, setShowDetails] = useState(false);

  // Stale timer modal state
  const [showStaleModal, setShowStaleModal] = useState(false);
  const staleModalDismissedRef = useRef(false);

  // Subscribe to sessions
  useEffect(() => {
    const unsubscribe = subscribeToPumpSessions(baby.id, setSessions);
    return () => unsubscribe();
  }, [baby.id]);

  useEffect(() => {
    if (settings?.preferredVolumeUnit) {
      setVolumeUnit(settings.preferredVolumeUnit);
    }
  }, [settings?.preferredVolumeUnit]);

  // Helper to calculate elapsed time accounting for paused duration
  const calculateElapsedTime = useCallback((session: PumpSession): number => {
    const startTime = new Date(session.startTime);
    const totalPausedDuration = session.totalPausedDuration || 0;

    if (session.isPaused && session.pausedAt) {
      // If currently paused, elapsed time is up to when it was paused minus total paused duration
      const pausedAt = new Date(session.pausedAt);
      return Math.floor((pausedAt.getTime() - startTime.getTime()) / 1000) - totalPausedDuration;
    }

    // If running, elapsed time is current time minus start time minus total paused duration
    return Math.floor((Date.now() - startTime.getTime()) / 1000) - totalPausedDuration;
  }, []);

  // Check for active session on load and resume it
  useEffect(() => {
    // Don't override local state if user has already stopped the timer (showForm is true)
    if (showForm) return;

    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      setActiveSessionId(activeSession.id);
      setSelectedSide(activeSession.side);
      // Restore pause state from database
      setIsPaused(activeSession.isPaused || false);
      setIsTimerRunning(!activeSession.isPaused);
      // Calculate elapsed time accounting for paused duration
      const elapsed = calculateElapsedTime(activeSession);
      setTimerSeconds(elapsed);
    }
  }, [sessions, showForm, calculateElapsedTime]);

  // Re-sync timer when app becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !showForm) {
        const activeSession = sessions.find((s) => s.isActive);
        if (activeSession) {
          setActiveSessionId(activeSession.id);
          setSelectedSide(activeSession.side);
          // Restore pause state from database
          setIsPaused(activeSession.isPaused || false);
          setIsTimerRunning(!activeSession.isPaused);
          // Calculate elapsed time accounting for paused duration
          const elapsed = calculateElapsedTime(activeSession);
          setTimerSeconds(elapsed);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessions, showForm, calculateElapsedTime]);

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
        await deletePumpSession(activeSession.id);
        setActiveSessionId(null);
        setTimerSeconds(0);
        setIsTimerRunning(false);
        toast.info('Pump session discarded');
      } catch (error) {
        console.error('Error discarding pump session:', error);
        toast.error('Failed to discard session');
      }
    }
  };

  const handleStart = useCallback(async () => {
    if (!user || starting) return;

    staleModalDismissedRef.current = false; // Reset for new timer
    setStarting(true);
    try {
      const sessionId = await startPumpSession(baby.id, user.uid, {
        startTime: new Date().toISOString(),
        side: selectedSide,
        volumeUnit,
      });

      setActiveSessionId(sessionId);
      setIsTimerRunning(true);
      setShowForm(false);
    } catch (error) {
      console.error('Error starting pump session:', error);
      toast.error('Failed to start pump session. Please try again.');
    } finally {
      setStarting(false);
    }
  }, [user, baby.id, selectedSide, volumeUnit, starting]);

  const handlePause = useCallback(async () => {
    setIsTimerRunning(false);
    setIsPaused(true);

    // Persist pause state to Firestore
    if (activeSessionId) {
      try {
        await pausePumpSession(activeSessionId);
      } catch (error) {
        console.error('Error pausing session:', error);
        // Revert local state if Firestore update fails
        setIsTimerRunning(true);
        setIsPaused(false);
      }
    }
  }, [activeSessionId]);

  const handleResume = useCallback(async () => {
    // Resume from pause - persist to Firestore
    if (activeSessionId) {
      try {
        await resumePumpSession(activeSessionId);
        setIsTimerRunning(true);
        setIsPaused(false);
      } catch (error) {
        console.error('Error resuming session:', error);
        toast.error('Failed to resume session');
      }
    } else {
      setIsTimerRunning(true);
      setIsPaused(false);
    }
  }, [activeSessionId]);

  const handleStop = useCallback((totalSeconds: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(totalSeconds);
    setShowForm(true);
  }, []);

  const handleReset = useCallback(() => {
    setIsTimerRunning(false);
    setIsPaused(false);
    setTimerSeconds(0);
    setActiveSessionId(null);
    setShowForm(false);
    setVolume('');
    setNotes('');
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
      await deletePumpSession(sessionIdToDelete);
      handleReset();
      toast.info('Pump session discarded');
    } catch (error) {
      console.error('Error discarding pump session:', error);
      toast.error('Failed to discard session. Please try again.');
    } finally {
      setSaving(false);
    }
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

  const handleSave = async () => {
    if (!user) return;

    // Validate volume if provided
    const parsedVolume = parseFloat(volume);
    if (volume && (isNaN(parsedVolume) || parsedVolume < 0)) {
      toast.error('Please enter a valid volume (0 or greater).');
      return;
    }
    const volumeValue = parsedVolume || 0;

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

      setSaving(true);
      try {
        // Get the active session to get the start time for milk destination
        const activeSession = sessions.find((s) => s.id === sessionIdToSave);
        const pumpedDate = activeSession?.startTime || new Date().toISOString();

        await endPumpSession(
          sessionIdToSave,
          new Date().toISOString(),
          volumeValue,
          volumeUnit,
          notes || null,
          momMood
        );

        // If there's volume, show milk destination dialog
        if (volumeValue > 0) {
          setSavedSessionData({
            volume: volumeValue,
            volumeUnit,
            pumpedDate,
          });
          setShowMilkDestination(true);
        }

        handleReset();
      } catch (error) {
        console.error('Error saving pump session:', error);
        toast.error('Failed to save pump session. Please try again.');
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

      // Validate date and time inputs
      if (!manualDate || !manualTime) {
        toast.error('Please enter a valid date and time.');
        return;
      }

      const sessionStartTime = new Date(`${manualDate}T${manualTime}`);

      // Check if date is valid
      if (isNaN(sessionStartTime.getTime())) {
        toast.error('Invalid date or time. Please check your input.');
        return;
      }

      // Check if date is not in the future
      if (sessionStartTime > new Date()) {
        toast.error('Start time cannot be in the future.');
        return;
      }

      // Validate volume if provided
      if (volume) {
        const parsedVolume = parseFloat(volume);
        if (isNaN(parsedVolume) || parsedVolume < 0) {
          toast.error('Please enter a valid volume (0 or greater).');
          return;
        }
      }

      setSaving(true);
      try {
        const sessionEndTime = new Date(sessionStartTime.getTime() + durationMinutes * 60 * 1000);

        await createPumpSession(baby.id, user.uid, {
          startTime: sessionStartTime.toISOString(),
          endTime: sessionEndTime.toISOString(),
          side: selectedSide,
          volume: volumeValue,
          volumeUnit,
          notes: notes || null,
          momMood,
        });

        // If there's volume, show milk destination dialog
        if (volumeValue > 0) {
          setSavedSessionData({
            volume: volumeValue,
            volumeUnit,
            pumpedDate: sessionStartTime.toISOString(),
          });
          setShowMilkDestination(true);
        }

        handleReset();
      } catch (error) {
        console.error('Error saving pump session:', error);
        toast.error('Failed to save pump session. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleMilkDestination = async (destination: MilkDestination) => {
    if (!user || !savedSessionData) {
      setShowMilkDestination(false);
      setSavedSessionData(null);
      return;
    }

    try {
      if (destination === 'fridge' || destination === 'freezer') {
        // Create milk stash entry
        const location: MilkStorageLocation = destination === 'fridge' ? 'fridge' : 'freezer';
        await createMilkStash(user.uid, {
          volume: savedSessionData.volume,
          volumeUnit: savedSessionData.volumeUnit,
          location,
          pumpedDate: savedSessionData.pumpedDate,
          notes: null,
        });
      } else if (destination === 'use') {
        // Create bottle feeding session with the pumped milk
        await createBottleSession(baby.id, user.uid, {
          timestamp: new Date().toISOString(),
          volume: savedSessionData.volume,
          volumeUnit: savedSessionData.volumeUnit,
          contentType: 'breastMilk',
          notes: 'Fresh from pump',
          babyMood: null,
        });
      }
      // If destination is null (skip), do nothing
    } catch (error) {
      console.error('Error handling milk destination:', error);
      toast.error('Failed to save milk destination. Please try again.');
    } finally {
      setShowMilkDestination(false);
      setSavedSessionData(null);
    }
  };

  // Filter out active sessions for stats and history
  const completedSessions = sessions.filter(s => !s.isActive);

  // Today's stats (exclude active sessions)
  const todaySessions = completedSessions.filter((s) => isToday(parseISO(s.startTime)));
  const todayTotalVolume = todaySessions.reduce((sum, s) => {
    const vol = convertVolume(s.volume, s.volumeUnit, volumeUnit);
    return sum + vol;
  }, 0);

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

      {/* Side Selector */}
      <div className="flex justify-center">
        <SegmentedControl
          options={sideOptions}
          value={selectedSide}
          onChange={(value) => !isTimerRunning && !activeSessionId && setSelectedSide(value as PumpSide)}
        />
      </div>

      {/* Timer Mode */}
      {entryMode === 'timer' && (
        <Card variant="elevated" className="text-center py-8">
          <Timer
            initialSeconds={timerSeconds}
            isRunning={isTimerRunning}
            isPaused={isPaused}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
            onReset={handleReset}
            onTimeUpdate={setTimerSeconds}
            color={PUMP_SIDE_CONFIG[selectedSide].color}
          />
        </Card>
      )}

      {/* Manual Entry Mode */}
      {entryMode === 'manual' && !showForm && (
        <Card>
          <CardHeader title="Log Past Session" subtitle={`${PUMP_SIDE_CONFIG[selectedSide].label} side`} />

          <div className="space-y-4">
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

            <Input
              type="number"
              label="Duration (minutes)"
              placeholder="e.g. 20"
              value={manualDuration}
              onChange={(e) => setManualDuration(e.target.value)}
              min="1"
              max="120"
            />

            <div className="flex gap-3">
              <Input
                type="number"
                label="Volume"
                placeholder="0"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="flex-1"
                step="0.5"
                min="0"
              />
              <div className="w-24 pt-6">
                <SegmentedControl
                  options={[
                    { value: 'oz', label: 'oz' },
                    { value: 'ml', label: 'ml' },
                  ]}
                  value={volumeUnit}
                  onChange={(value) => setVolumeUnit(value as VolumeUnit)}
                  size="sm"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="w-full"
              disabled={!manualDuration || saving}
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
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Save Form */}
      {showForm && (
        <Card>
          <CardHeader
            title="Session Complete"
            subtitle={`${formatDuration(timerSeconds)} - ${PUMP_SIDE_CONFIG[selectedSide].label} side`}
          />

          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                type="number"
                label="Volume"
                placeholder="0"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="flex-1"
                step="0.5"
                min="0"
              />
              <div className="w-24 pt-6">
                <SegmentedControl
                  options={[
                    { value: 'oz', label: 'oz' },
                    { value: 'ml', label: 'ml' },
                  ]}
                  value={volumeUnit}
                  onChange={(value) => setVolumeUnit(value as VolumeUnit)}
                  size="sm"
                />
              </div>
            </div>

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
                {saving ? 'Saving...' : 'Save Session'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-blue-600">{todaySessions.length}</p>
          <p className="text-sm text-gray-500">Sessions today</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-blue-600">
            {todayTotalVolume.toFixed(1)} {volumeUnit}
          </p>
          <p className="text-sm text-gray-500">Total volume</p>
        </Card>
      </div>

      {/* Milk Destination Dialog */}
      {showMilkDestination && savedSessionData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">What would you like to do with the milk?</h3>
              <button
                onClick={() => handleMilkDestination(null)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {savedSessionData.volume} {savedSessionData.volumeUnit} pumped
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleMilkDestination('fridge')}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Refrigerator className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Store in Fridge</p>
                  <p className="text-xs text-gray-500">Add to milk stash</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleMilkDestination('freezer')}
              >
                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Snowflake className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Store in Freezer</p>
                  <p className="text-xs text-gray-500">Add to milk stash</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleMilkDestination('use')}
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <BabyIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Use Now</p>
                  <p className="text-xs text-gray-500">Log as bottle feeding</p>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-500"
                onClick={() => handleMilkDestination(null)}
              >
                Skip for now
              </Button>
            </div>
          </Card>
        </div>
      )}

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
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: PUMP_SIDE_CONFIG[session.side].color }}
                >
                  <Droplet className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {session.volume} {session.volumeUnit} • {PUMP_SIDE_CONFIG[session.side].label}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(session.duration)}</span>
                    <span>•</span>
                    <span>{format(parseISO(session.startTime), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
                <MoodIndicator momMood={session.momMood} size="sm" />
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
          sessionType="pump"
          session={selectedSession}
        />
      )}

      {/* Stale Timer Modal */}
      <StaleTimerModal
        isOpen={showStaleModal}
        duration={timerSeconds}
        activityName="pump"
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
  );
}
