import { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { SleepSession, SleepType, BabyMood, SLEEP_TYPE_CONFIG, formatSleepDuration } from '@/types';
import { createSleepSession, endSleepSession, subscribeToSleepSessions } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { clsx } from 'clsx';
import { Moon, Sun, Clock, Bed } from 'lucide-react';

const typeOptions = [
  { value: 'nap', label: 'Nap', icon: <Sun className="w-4 h-4" />, color: SLEEP_TYPE_CONFIG.nap.color },
  { value: 'night', label: 'Night', icon: <Moon className="w-4 h-4" />, color: SLEEP_TYPE_CONFIG.night.color },
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

  // Subscribe to sessions
  useEffect(() => {
    if (!selectedBaby) return;
    const unsubscribe = subscribeToSleepSessions(selectedBaby.id, setSessions);
    return () => unsubscribe();
  }, [selectedBaby?.id]);

  // Check for active session on load
  useEffect(() => {
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
  }, [sessions]);

  const handleStart = useCallback(async () => {
    if (!user || !selectedBaby) return;

    const sessionId = await createSleepSession(selectedBaby.id, user.uid, {
      startTime: new Date().toISOString(),
      type: sleepType,
    });

    setActiveSessionId(sessionId);
    setIsTimerRunning(true);
  }, [user, selectedBaby, sleepType]);

  const handleStop = useCallback(async (totalSeconds: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(totalSeconds);
    setShowForm(true);
  }, []);

  const handleSave = async () => {
    if (!activeSessionId) return;

    setSaving(true);
    try {
      await endSleepSession(
        activeSessionId,
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
    } catch (error) {
      console.error('Error saving sleep session:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    // Resume timer
    setIsTimerRunning(true);
  };

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  // Today's stats
  const todaySessions = sessions.filter((s) => !s.isActive && isToday(parseISO(s.startTime)));
  const todayNaps = todaySessions.filter((s) => s.type === 'nap');
  const todayNight = todaySessions.filter((s) => s.type === 'night');
  const todayNapTime = todayNaps.reduce((sum, s) => sum + s.duration, 0);
  const todayNightTime = todayNight.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div>
      <Header title="Sleep" />

      <div className="px-4 py-4 space-y-4">
        {/* Type Selector */}
        <div className="flex justify-center">
          <SegmentedControl
            options={typeOptions}
            value={sleepType}
            onChange={(value) => !isTimerRunning && setSleepType(value as SleepType)}
          />
        </div>

        {/* Timer Card */}
        <Card variant="elevated" className="text-center py-8">
          {!isTimerRunning && !showForm ? (
            <div>
              <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4"
                style={{ backgroundColor: `${SLEEP_TYPE_CONFIG[sleepType].color}20` }}
              >
                {sleepType === 'nap' ? (
                  <Sun className="w-12 h-12" style={{ color: SLEEP_TYPE_CONFIG[sleepType].color }} />
                ) : (
                  <Moon className="w-12 h-12" style={{ color: SLEEP_TYPE_CONFIG[sleepType].color }} />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start {sleepType === 'nap' ? 'Nap' : 'Night Sleep'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Tap the button to begin tracking
              </p>
              <Button
                onClick={handleStart}
                className="px-8"
                style={{ backgroundColor: SLEEP_TYPE_CONFIG[sleepType].color }}
              >
                <Bed className="w-5 h-5 mr-2" />
                Start Sleep
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
        </Card>

        {/* Save Form */}
        {showForm && (
          <Card>
            <CardHeader
              title="Sleep Ended"
              subtitle={`${formatSleepDuration(timerSeconds)} of ${sleepType === 'nap' ? 'napping' : 'night sleep'}`}
            />

            <div className="space-y-4">
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

              <div className="flex gap-3">
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

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sun className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-500">Naps</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{todayNaps.length}</p>
            <p className="text-xs text-gray-500">{formatSleepDuration(todayNapTime)} total</p>
          </Card>
          <Card className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="text-sm text-gray-500">Night</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{todayNight.length}</p>
            <p className="text-xs text-gray-500">{formatSleepDuration(todayNightTime)} total</p>
          </Card>
        </div>

        {/* Session History */}
        {sessions.filter(s => !s.isActive).length > 0 && (
          <Card padding="none">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Sleep</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {sessions.filter(s => !s.isActive).slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: SLEEP_TYPE_CONFIG[session.type].color }}
                  >
                    {session.type === 'nap' ? (
                      <Sun className="w-5 h-5" />
                    ) : (
                      <Moon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {SLEEP_TYPE_CONFIG[session.type].label}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatSleepDuration(session.duration)}</span>
                      <span>•</span>
                      <span>{format(parseISO(session.startTime), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <MoodIndicator babyMood={session.babyMood} size="sm" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
