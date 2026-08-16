import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isToday, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MomMoodSelector } from '@/components/ui/MoodSelector';
import { StaleTimerModal, STALE_TIMER_THRESHOLD } from '@/components/ui/StaleTimerModal';
import { Baby, FeedingSession, PumpSession, BreastSide, BabyMood, MomMood, BREAST_SIDE_CONFIG, formatDuration, getLastBreastActivity, getSuggestedBreastSide } from '@/types';
import { createFeedingSession, startFeedingSession, endFeedingSession, updateFeedingSession, subscribeToFeedingSessions, subscribeToPumpSessions, deleteFeedingSession, pauseFeedingSession, resumeFeedingSession } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useHomeStore } from '@/stores/homeStore';
import { toast } from '@/stores/toastStore';
import { clsx } from 'clsx';
import { Clock, Timer as TimerIcon, Edit3, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

type EntryMode = 'timer' | 'manual';

interface BreastfeedingViewProps {
  baby: Baby;
}

export function BreastfeedingView({ baby }: BreastfeedingViewProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const upsertFeedingSession = useHomeStore((state) => state.upsertFeedingSession);
  const removeFeedingSession = useHomeStore((state) => state.removeFeedingSession);
  const [sessions, setSessions] = useState<FeedingSession[]>([]);
  const [pumpSessions, setPumpSessions] = useState<PumpSession[]>([]);
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
  const [isPaused, setIsPaused] = useState(false);

  // Entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('timer');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));
  const [manualDuration, setManualDuration] = useState('');

  // Expandable details state
  const [showDetails, setShowDetails] = useState(false);

  // Pre-save edit state
  const [showEditBeforeSave, setShowEditBeforeSave] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [originalDurationSeconds, setOriginalDurationSeconds] = useState(0); // Preserve exact seconds
  const [editedStartTime, setEditedStartTime] = useState<string | null>(null); // Stores the edited start time ISO string

  // Stale timer modal state
  const [showStaleModal, setShowStaleModal] = useState(false);
  const staleModalDismissedRef = useRef(false);
  const manualSideSelectionRef = useRef(false);
  const isHebrew = i18n.resolvedLanguage === 'he' || i18n.language === 'he';
  const dateLocale = isHebrew ? he : undefined;
  const clockFormat = isHebrew ? 'HH:mm' : 'h:mm a';

  const entryModeOptions = useMemo(
    () => [
      { value: 'timer', label: t('common.timer'), icon: <TimerIcon className="w-4 h-4" /> },
      { value: 'manual', label: t('common.manual'), icon: <Edit3 className="w-4 h-4" /> },
    ],
    [t]
  );

  const getShortSideLabel = useCallback(
    (side: BreastSide) => (side === 'left' ? t('activity.left') : t('activity.right')),
    [t]
  );

  const getSideInitial = useCallback(
    (side: BreastSide) => {
      if (!isHebrew) return side === 'left' ? 'L' : 'R';
      return side === 'left' ? 'ש' : 'י';
    },
    [isHebrew]
  );

  const formatLocalizedDuration = useCallback(
    (seconds: number) => {
      if (!isHebrew) return formatDuration(seconds);

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;

      if (hours > 0) {
        return minutes > 0 ? `${hours} שע׳ ${minutes} דק׳` : `${hours} שע׳`;
      }
      if (minutes > 0) {
        return remainingSeconds > 0 ? `${minutes} דק׳ ${remainingSeconds} שנ׳` : `${minutes} דק׳`;
      }
      return `${remainingSeconds} שנ׳`;
    },
    [isHebrew]
  );

  // Subscribe to sessions
  useEffect(() => {
    const unsubscribe = subscribeToFeedingSessions(baby.id, setSessions);
    return () => unsubscribe();
  }, [baby.id]);

  useEffect(() => {
    const unsubscribe = subscribeToPumpSessions(baby.id, setPumpSessions);
    return () => unsubscribe();
  }, [baby.id]);

  // Helper to calculate elapsed time accounting for paused duration
  const calculateElapsedTime = useCallback((session: FeedingSession): number => {
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
      manualSideSelectionRef.current = false;
      setActiveSessionId(activeSession.id);
      setSelectedSide(activeSession.breastSide);
      // Restore pause state from database
      setIsPaused(activeSession.isPaused || false);
      setIsTimerRunning(!activeSession.isPaused);
      // Calculate elapsed time accounting for paused duration
      const elapsed = calculateElapsedTime(activeSession);
      setTimerSeconds(elapsed);
    }
  }, [sessions, showForm, calculateElapsedTime]);

  // Re-sync timer when app becomes visible again (e.g., after closing and reopening)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !showForm) {
        const activeSession = sessions.find((s) => s.isActive);
        if (activeSession) {
          manualSideSelectionRef.current = false;
          setActiveSessionId(activeSession.id);
          setSelectedSide(activeSession.breastSide);
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

  // Check for stale timer (5+ hours) - uses calculateElapsedTime to account for pause duration
  useEffect(() => {
    if (staleModalDismissedRef.current || showForm || showStaleModal) return;

    const activeSession = sessions.find((s) => s.isActive);
    if (activeSession) {
      const elapsed = calculateElapsedTime(activeSession);
      if (elapsed >= STALE_TIMER_THRESHOLD) {
        setShowStaleModal(true);
      }
    }
  }, [sessions, showForm, showStaleModal, calculateElapsedTime]);

  // Also check when app becomes visible
  useEffect(() => {
    const checkStaleOnVisibility = () => {
      if (document.visibilityState === 'visible' && !staleModalDismissedRef.current && !showForm) {
        const activeSession = sessions.find((s) => s.isActive);
        if (activeSession) {
          const elapsed = calculateElapsedTime(activeSession);
          if (elapsed >= STALE_TIMER_THRESHOLD) {
            setShowStaleModal(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', checkStaleOnVisibility);
    return () => document.removeEventListener('visibilitychange', checkStaleOnVisibility);
  }, [sessions, showForm, calculateElapsedTime]);

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
        await deleteFeedingSession(activeSession.id);
        setActiveSessionId(null);
        setTimerSeconds(0);
        setIsTimerRunning(false);
        toast.info(t('feedingScreen.discarded'));
      } catch (error) {
        console.error('Error discarding feeding session:', error);
        toast.error(t('feedingScreen.discardError'));
      }
    }
  };

  // Use the latest completed feed or one-sided pump to suggest the next nursing side.
  const completedSessions = sessions.filter(s => !s.isActive);
  const lastBreastActivity = getLastBreastActivity(sessions, pumpSessions);
  const suggestedSide = getSuggestedBreastSide(sessions, pumpSessions);

  useEffect(() => {
    if (!isTimerRunning && !activeSessionId && !manualSideSelectionRef.current) {
      setSelectedSide(suggestedSide);
    }
  }, [suggestedSide, isTimerRunning, activeSessionId]);

  const handleSideSelect = useCallback((side: BreastSide) => {
    manualSideSelectionRef.current = true;
    setSelectedSide(side);
  }, []);

  const handleStart = useCallback(async () => {
    if (!user || starting) return;

    staleModalDismissedRef.current = false; // Reset for new timer
    manualSideSelectionRef.current = true;
    setStarting(true);
    const optimisticId = `optimistic-feeding-${Date.now()}`;
    const startTime = new Date().toISOString();
    upsertFeedingSession({
      id: optimisticId,
      babyId: baby.id,
      userId: user.uid,
      date: startTime.split('T')[0],
      duration: 0,
      breastSide: selectedSide,
      startTime,
      endTime: null,
      isActive: true,
      isPaused: false,
      pausedAt: null,
      totalPausedDuration: 0,
      notes: null,
      babyMood: null,
      momMood: null,
      loggedBy: null,
      createdAt: startTime,
      updatedAt: startTime,
    });
    try {
      const sessionId = await startFeedingSession(baby.id, user.uid, {
        startTime,
        breastSide: selectedSide,
      });

      removeFeedingSession(optimisticId);
      setActiveSessionId(sessionId);
      setIsTimerRunning(true);
      setShowForm(false);
    } catch (error) {
      removeFeedingSession(optimisticId);
      console.error('Error starting feeding session:', error);
      toast.error(t('feedingScreen.startError'));
    } finally {
      setStarting(false);
    }
  }, [user, starting, upsertFeedingSession, baby.id, selectedSide, removeFeedingSession, t]);

  const handlePause = useCallback(async () => {
    setIsTimerRunning(false);
    setIsPaused(true);

    // Persist pause state to Firestore
    if (activeSessionId) {
      try {
        await pauseFeedingSession(activeSessionId);
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
        await resumeFeedingSession(activeSessionId);
        setIsTimerRunning(true);
        setIsPaused(false);
      } catch (error) {
        console.error('Error resuming session:', error);
        toast.error(t('feedingScreen.resumeError'));
      }
    } else {
      setIsTimerRunning(true);
      setIsPaused(false);
    }
  }, [activeSessionId, t]);

  const handleStop = useCallback((totalSeconds: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(totalSeconds);
    setShowForm(true);
  }, []);

  const handleReset = useCallback(() => {
    manualSideSelectionRef.current = false;
    setIsTimerRunning(false);
    setIsPaused(false);
    setTimerSeconds(0);
    setActiveSessionId(null);
    setShowForm(false);
    setShowDetails(false);
    setNotes('');
    setBabyMood(null);
    setMomMood(null);
    setEditedStartTime(null);
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
      toast.info(t('feedingScreen.discarded'));
    } catch (error) {
      console.error('Error discarding feeding session:', error);
      toast.error(t('feedingScreen.discardError'));
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
    setOriginalDurationSeconds(timerSeconds); // Preserve exact seconds
    setEditDuration(Math.floor(timerSeconds / 60).toString());
    setShowEditBeforeSave(true);
  };

  // Apply edit changes
  const handleApplyEdit = () => {
    const durationMinutes = parseInt(editDuration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      toast.error(t('validation.validDuration'));
      return;
    }
    // Validate and store the edited start time
    const parsedStartTime = new Date(editStartTime);
    if (isNaN(parsedStartTime.getTime())) {
      toast.error(t('validation.validStartTime'));
      return;
    }
    if (parsedStartTime > new Date()) {
      toast.error(t('validation.startTimeFuture'));
      return;
    }
    setEditedStartTime(parsedStartTime.toISOString());
    // Only update timerSeconds if duration was actually changed
    // Compare with original rounded minutes to detect user edits
    const originalMinutes = Math.floor(originalDurationSeconds / 60);
    if (durationMinutes !== originalMinutes) {
      setTimerSeconds(durationMinutes * 60);
    }
    // If duration wasn't changed, keep the original seconds for precision
    setShowEditBeforeSave(false);
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

      const savedDuration = timerSeconds;
      const savedSide = selectedSide;

      setSaving(true);
      try {
        if (editedStartTime) {
          // User edited the session - use updateFeedingSession with the edited times
          const startTime = new Date(editedStartTime);
          const endTime = new Date(startTime.getTime() + timerSeconds * 1000);
          await updateFeedingSession(sessionIdToSave, {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            breastSide: selectedSide,
            notes: notes || null,
            babyMood,
            momMood,
          });
        } else {
          // Normal save - use endFeedingSession
          await endFeedingSession(
            sessionIdToSave,
            new Date().toISOString(),
            notes || null,
            babyMood,
            momMood
          );
        }
        handleReset();

        toast.success(t('feedingScreen.logged', {
          duration: formatLocalizedDuration(savedDuration),
          side: getShortSideLabel(savedSide),
        }));
      } catch (error) {
        console.error('Error saving feeding session:', error);
        toast.error(t('feedingScreen.saveError'));
      } finally {
        setSaving(false);
      }
    } else {
      // Manual entry
      if (!manualDuration) return;

      const durationMinutes = parseInt(manualDuration, 10);
      if (isNaN(durationMinutes) || durationMinutes <= 0 || durationMinutes > 120) {
        toast.error(t('validation.validDurationRange', { min: 1, max: 120 }));
        return;
      }

      // Validate date and time inputs
      if (!manualDate || !manualTime) {
        toast.error(t('validation.validDateTime'));
        return;
      }

      const sessionStartTime = new Date(`${manualDate}T${manualTime}`);

      // Check if date is valid
      if (isNaN(sessionStartTime.getTime())) {
        toast.error(t('validation.invalidDateTime'));
        return;
      }

      // Check if date is not in the future
      if (sessionStartTime > new Date()) {
        toast.error(t('validation.startTimeFuture'));
        return;
      }

      setSaving(true);
      try {
        const sessionEndTime = new Date(sessionStartTime.getTime() + durationMinutes * 60 * 1000);

        await createFeedingSession(baby.id, user.uid, {
          breastSide: selectedSide,
          startTime: sessionStartTime.toISOString(),
          endTime: sessionEndTime.toISOString(),
          notes: notes || null,
          babyMood,
          momMood,
        });

        const savedSide = selectedSide;
        handleReset();
        toast.success(t('feedingScreen.logged', {
          duration: formatLocalizedDuration(durationMinutes * 60),
          side: getShortSideLabel(savedSide),
        }));
      } catch (error) {
        console.error('Error saving feeding session:', error);
        toast.error(t('feedingScreen.saveError'));
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
      {lastBreastActivity && !isTimerRunning && !showForm && entryMode === 'timer' && !activeSessionId && (
        <div
          className="rounded-2xl p-4 text-center border"
          style={{
            backgroundColor: `${BREAST_SIDE_CONFIG[suggestedSide].color}08`,
            borderColor: `${BREAST_SIDE_CONFIG[suggestedSide].color}20`
          }}
        >
          <p className="text-sm text-gray-500 mb-1">{t('feedingScreen.startWith')}</p>
          <p
            className="text-2xl font-bold"
            style={{ color: BREAST_SIDE_CONFIG[suggestedSide].color }}
          >
            {t('feedingScreen.side', { side: getShortSideLabel(suggestedSide) })}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {lastBreastActivity.source === 'pump'
              ? t('feedingScreen.lastPumped', {
                  side: getShortSideLabel(lastBreastActivity.side),
                  time: format(parseISO(lastBreastActivity.timestamp), clockFormat, { locale: dateLocale }),
                })
              : t('feedingScreen.lastFed', {
                  side: getShortSideLabel(lastBreastActivity.side),
                  time: format(parseISO(lastBreastActivity.timestamp), clockFormat, { locale: dateLocale }),
                })}
          </p>
        </div>
      )}

      {/* Side Selector */}
      <div className="flex justify-center gap-6" dir="ltr">
        {(['left', 'right'] as BreastSide[]).map((side) => {
          const config = BREAST_SIDE_CONFIG[side];
          const isSelected = selectedSide === side;

          return (
            <button
              key={side}
              onClick={() => !isTimerRunning && !activeSessionId && !starting && handleSideSelect(side)}
              disabled={isTimerRunning || !!activeSessionId || starting}
              className={clsx(
                'relative w-24 h-24 rounded-full flex flex-col items-center justify-center',
                'transition-all duration-300 transform',
                isSelected
                  ? 'scale-110 shadow-xl'
                  : 'scale-100 opacity-40 hover:opacity-60',
                (isTimerRunning || activeSessionId || starting) && !isSelected && 'opacity-20 cursor-not-allowed'
              )}
              style={isSelected ? {
                background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
                boxShadow: `0 10px 30px -10px ${config.color}80`
              } : {
                backgroundColor: '#f3f4f6',
                border: '2px solid #e5e7eb'
              }}
            >
              <span
                className={clsx(
                  'text-3xl font-bold',
                  isSelected ? 'text-white' : 'text-gray-400'
                )}
              >
                {getSideInitial(side)}
              </span>
              <span
                className={clsx(
                  'text-xs font-medium mt-0.5',
                  isSelected ? 'text-white/90' : 'text-gray-400'
                )}
              >
                {getShortSideLabel(side)}
              </span>
              {isSelected && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ backgroundColor: config.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Timer Mode */}
      {entryMode === 'timer' && (
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${BREAST_SIDE_CONFIG[selectedSide].color}08 0%, ${BREAST_SIDE_CONFIG[selectedSide].color}03 100%)`,
          }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10"
            style={{ backgroundColor: BREAST_SIDE_CONFIG[selectedSide].color }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-5"
            style={{ backgroundColor: BREAST_SIDE_CONFIG[selectedSide].color }}
          />

          <div className="relative py-10 px-4">
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
              color={BREAST_SIDE_CONFIG[selectedSide].color}
            />
          </div>
        </div>
      )}

      {/* Manual Entry Mode */}
      {entryMode === 'manual' && !showForm && (
        <Card>
          <CardHeader
            title={t('feedingScreen.logPastFeeding')}
            subtitle={t('feedingScreen.sideSubtitle', { side: getShortSideLabel(selectedSide) })}
          />

          <div className="space-y-4">
            <Input
              type="date"
              label={t('common.date')}
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
            <Input
              type="time"
              label={t('form.startTime')}
              value={manualTime}
              onChange={(e) => setManualTime(e.target.value)}
            />

            <Input
              type="number"
              label={t('form.durationMinutes')}
              placeholder={t('feedingScreen.durationPlaceholder')}
              value={manualDuration}
              onChange={(e) => setManualDuration(e.target.value)}
              min="1"
              max="120"
            />

            <Button
              onClick={handleSave}
              className="w-full"
              disabled={!manualDuration || saving}
            >
              {saving ? t('common.saving') : t('common.save')}
            </Button>

            {/* Expandable details section */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <span>{t('common.addDetailsOptional')}</span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDetails && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <BabyMoodSelector
                  label={t('form.babyMood')}
                  value={babyMood}
                  onChange={setBabyMood}
                />

                <MomMoodSelector
                  label={t('form.yourMood')}
                  value={momMood}
                  onChange={setMomMood}
                />

                <Textarea
                  label={t('form.notesOptional')}
                  placeholder={t('feedingScreen.notesPlaceholder')}
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
            title={t('feedingScreen.sessionComplete')}
            subtitle={t('feedingScreen.sessionCompleteSubtitle', {
              duration: formatLocalizedDuration(timerSeconds),
              side: getShortSideLabel(selectedSide),
            })}
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
                <Edit3 className="w-4 h-4 text-gray-600" />
              </Button>
              <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={saving}>
                {t('feedingScreen.resume')}
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>

            {/* Expandable details section */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <span>{t('common.addDetailsOptional')}</span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDetails && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <BabyMoodSelector
                  label={t('form.babyMood')}
                  value={babyMood}
                  onChange={setBabyMood}
                />

                <MomMoodSelector
                  label={t('form.yourMood')}
                  value={momMood}
                  onChange={setMomMood}
                />

                <Textarea
                  label={t('form.notesOptional')}
                  placeholder={t('feedingScreen.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-2xl p-4 text-center border border-primary-100">
          <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-2">
            <TimerIcon className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-3xl font-bold text-primary-600">{todaySessions.length}</p>
          <p className="text-sm text-gray-500 mt-1">{t('feedingScreen.sessionsToday')}</p>
        </div>
        <div className="bg-gradient-to-br from-secondary-50 to-secondary-100/50 rounded-2xl p-4 text-center border border-secondary-100">
          <div className="w-10 h-10 rounded-full bg-secondary-500/10 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5 text-secondary-600" />
          </div>
          <p className="text-3xl font-bold text-secondary-600">{formatLocalizedDuration(todayTotalSeconds)}</p>
          <p className="text-sm text-gray-500 mt-1">{t('feedingScreen.totalTime')}</p>
        </div>
      </div>

      {/* Stale Timer Modal */}
      <StaleTimerModal
        isOpen={showStaleModal}
        duration={timerSeconds}
        activityName={t('activity.breastfeeding')}
        onContinue={handleStaleTimerContinue}
        onStopAndSave={handleStaleTimerStopAndSave}
        onDiscard={handleStaleTimerDiscard}
      />

      {/* Pre-save Edit Modal */}
      {showEditBeforeSave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader title={t('feedingScreen.editSession')} subtitle={t('feedingScreen.adjustBeforeSaving')} />
            <div className="space-y-4">
              <Input
                type="datetime-local"
                label={t('form.startTime')}
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
              />
              <Input
                type="number"
                label={t('form.durationMinutes')}
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                min="1"
                max="180"
              />
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditBeforeSave(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleApplyEdit} className="flex-1">
                  {t('common.apply')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
