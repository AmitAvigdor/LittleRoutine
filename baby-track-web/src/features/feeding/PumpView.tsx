import { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { MomMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { Baby, PumpSession, PumpSide, MomMood, VolumeUnit, PUMP_SIDE_CONFIG, formatDuration, convertVolume } from '@/types';
import { createPumpSession, subscribeToPumpSessions } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { clsx } from 'clsx';
import { Clock, Droplet } from 'lucide-react';

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
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(settings?.preferredVolumeUnit || 'oz');
  const [notes, setNotes] = useState('');
  const [momMood, setMomMood] = useState<MomMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setVolume('');
    setNotes('');
    setMomMood(null);
  }, []);

  const handleSave = async () => {
    if (!user || !startTime) return;

    setSaving(true);
    try {
      const endTime = new Date(startTime.getTime() + timerSeconds * 1000);

      await createPumpSession(baby.id, user.uid, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        side: selectedSide,
        volume: parseFloat(volume) || 0,
        volumeUnit,
        notes: notes || null,
        momMood,
      });

      handleReset();
    } catch (error) {
      console.error('Error saving pump session:', error);
    } finally {
      setSaving(false);
    }
  };

  // Today's stats
  const todaySessions = sessions.filter((s) => isToday(parseISO(s.startTime)));
  const todayTotalVolume = todaySessions.reduce((sum, s) => {
    const vol = convertVolume(s.volume, s.volumeUnit, volumeUnit);
    return sum + vol;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Side Selector */}
      <div className="flex justify-center">
        <SegmentedControl
          options={sideOptions}
          value={selectedSide}
          onChange={(value) => !isTimerRunning && setSelectedSide(value as PumpSide)}
        />
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
          color={PUMP_SIDE_CONFIG[selectedSide].color}
        />
      </Card>

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
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
