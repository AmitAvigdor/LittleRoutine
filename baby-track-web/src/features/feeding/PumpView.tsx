import { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Card, CardHeader } from '@/components/ui/Card';
import { Timer } from '@/components/ui/Timer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { MomMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { Baby, PumpSession, PumpSide, MomMood, VolumeUnit, PUMP_SIDE_CONFIG, formatDuration, convertVolume } from '@/types';
import { MilkStorageLocation, MILK_STORAGE_CONFIG } from '@/types/enums';
import { createPumpSession, subscribeToPumpSessions, createMilkStash, createBottleSession } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { Clock, Droplet, Timer as TimerIcon, Edit3, Refrigerator, Snowflake, Baby as BabyIcon, X } from 'lucide-react';

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
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(settings?.preferredVolumeUnit || 'oz');
  const [notes, setNotes] = useState('');
  const [momMood, setMomMood] = useState<MomMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
    // Reset manual entry fields
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualTime(format(new Date(), 'HH:mm'));
    setManualDuration('');
  }, []);

  const handleSave = async () => {
    if (!user) return;

    // For timer mode, we need startTime; for manual mode, we need duration
    if (entryMode === 'timer' && !startTime) return;
    if (entryMode === 'manual' && !manualDuration) return;

    setSaving(true);
    try {
      let sessionStartTime: Date;
      let sessionEndTime: Date;

      if (entryMode === 'timer') {
        sessionStartTime = startTime!;
        sessionEndTime = new Date(startTime!.getTime() + timerSeconds * 1000);
      } else {
        // Manual entry
        sessionStartTime = new Date(`${manualDate}T${manualTime}`);
        const durationMinutes = parseInt(manualDuration, 10);
        sessionEndTime = new Date(sessionStartTime.getTime() + durationMinutes * 60 * 1000);
      }

      const volumeValue = parseFloat(volume) || 0;

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
        handleReset();
      } else {
        handleReset();
      }
    } catch (error) {
      console.error('Error saving pump session:', error);
    } finally {
      setSaving(false);
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
    } finally {
      setShowMilkDestination(false);
      setSavedSessionData(null);
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

      {/* Side Selector */}
      <div className="flex justify-center">
        <SegmentedControl
          options={sideOptions}
          value={selectedSide}
          onChange={(value) => !isTimerRunning && setSelectedSide(value as PumpSide)}
        />
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
            color={PUMP_SIDE_CONFIG[selectedSide].color}
          />
        </Card>
      )}

      {/* Manual Entry Mode */}
      {entryMode === 'manual' && !showForm && (
        <Card>
          <CardHeader title="Log Past Session" subtitle="Enter pumping details manually" />

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
