import { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { BabyMoodSelector, MomMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { Baby, FeedingSession, BreastSide, BabyMood, MomMood, BREAST_SIDE_CONFIG, formatDuration } from '@/types';
import { createFeedingSession, subscribeToFeedingSessions } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { clsx } from 'clsx';
import { Clock, ChevronRight } from 'lucide-react';

interface BreastfeedingViewProps {
  baby: Baby;
}

export function BreastfeedingView({ baby }: BreastfeedingViewProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FeedingSession[]>([]);
  const [selectedSide, setSelectedSide] = useState<BreastSide>('left');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [momMood, setMomMood] = useState<MomMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Subscribe to sessions
  useEffect(() => {
    const unsubscribe = subscribeToFeedingSessions(baby.id, setSessions);
    return () => unsubscribe();
  }, [baby.id]);

  // Get last session to suggest next side
  const lastSession = sessions[0];
  const suggestedSide: BreastSide = lastSession?.breastSide === 'left' ? 'right' : 'left';

  useEffect(() => {
    if (!isTimerRunning) {
      setSelectedSide(suggestedSide);
    }
  }, [suggestedSide, isTimerRunning]);

  const handleStart = useCallback(() => {
    setIsTimerRunning(true);
    setStartTime(new Date());
    setShowForm(false);
  }, []);

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
    setStartTime(null);
    setShowForm(false);
    setNotes('');
    setBabyMood(null);
    setMomMood(null);
  }, []);

  const handleSave = async () => {
    if (!user || !startTime) return;

    setSaving(true);
    try {
      const endTime = new Date(startTime.getTime() + timerSeconds * 1000);

      await createFeedingSession(baby.id, user.uid, {
        breastSide: selectedSide,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: notes || null,
        babyMood,
        momMood,
      });

      handleReset();
    } catch (error) {
      console.error('Error saving feeding session:', error);
    } finally {
      setSaving(false);
    }
  };

  // Today's stats
  const todaySessions = sessions.filter((s) => isToday(parseISO(s.startTime)));
  const todayTotalSeconds = todaySessions.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="space-y-4">
      {/* Last Session Card */}
      {lastSession && !isTimerRunning && !showForm && (
        <Card className="border-l-4" style={{ borderLeftColor: BREAST_SIDE_CONFIG[lastSession.breastSide].color }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Last feeding</p>
              <p className="font-semibold text-gray-900">
                {BREAST_SIDE_CONFIG[lastSession.breastSide].label} side
              </p>
              <p className="text-sm text-gray-500">
                {formatDuration(lastSession.duration)} • {format(parseISO(lastSession.startTime), 'h:mm a')}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: BREAST_SIDE_CONFIG[suggestedSide].color }}
            >
              {suggestedSide === 'left' ? 'L' : 'R'}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Next suggested: {BREAST_SIDE_CONFIG[suggestedSide].label} side
          </p>
        </Card>
      )}

      {/* Side Selector */}
      <div className="flex justify-center gap-4">
        {(['left', 'right'] as BreastSide[]).map((side) => {
          const config = BREAST_SIDE_CONFIG[side];
          const isSelected = selectedSide === side;

          return (
            <button
              key={side}
              onClick={() => !isTimerRunning && setSelectedSide(side)}
              disabled={isTimerRunning}
              className={clsx(
                'w-28 h-28 rounded-full flex flex-col items-center justify-center',
                'border-4 transition-all duration-300',
                isSelected
                  ? 'border-transparent scale-105 shadow-lg'
                  : 'border-gray-200 opacity-50',
                isTimerRunning && !isSelected && 'opacity-30'
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

      {/* Timer */}
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

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1" disabled={saving}>
                Cancel
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
          <p className="text-3xl font-bold text-primary-600">{todaySessions.length}</p>
          <p className="text-sm text-gray-500">Sessions today</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-secondary-600">{formatDuration(todayTotalSeconds)}</p>
          <p className="text-sm text-gray-500">Total time</p>
        </Card>
      </div>

      {/* Session History */}
      {sessions.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Sessions</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="px-4 py-3 flex items-center gap-3"
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
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
