import { useState, useEffect } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { EditSessionModal } from '@/components/ui/EditSessionModal';
import { PlaySession, PlayType, BabyMood, PLAY_TYPE_CONFIG, formatDuration } from '@/types';
import { createCompletePlaySession, subscribeToPlaySessions } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

const playTypeOptions = Object.entries(PLAY_TYPE_CONFIG).map(([value, config]) => ({
  value,
  label: config.emoji,
}));

// Quick duration options in minutes
const QUICK_DURATIONS = [5, 10, 15, 20, 30];

export function PlayTimeView() {
  const { user } = useAuth();
  const { selectedBaby, babies } = useAppStore();

  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [playType, setPlayType] = useState<PlayType>('tummy_time');
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PlaySession | null>(null);

  // Manual entry state
  const [showManual, setShowManual] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState(format(new Date(), 'HH:mm'));
  const [manualEndTime, setManualEndTime] = useState(format(new Date(), 'HH:mm'));

  // Subscribe to sessions
  useEffect(() => {
    if (!selectedBaby) return;
    const unsubscribe = subscribeToPlaySessions(selectedBaby.id, setSessions);
    return () => unsubscribe();
  }, [selectedBaby]);

  const handleQuickLog = async (durationMinutes: number) => {
    if (!user || !selectedBaby || saving) return;

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - durationMinutes * 60 * 1000);
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

      setNotes('');
      setBabyMood(null);
      setShowDetails(false);

    } catch (error) {
      console.error('Error saving play session:', error);
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
      setShowManual(false);

    } catch (error) {
      console.error('Error saving play session:', error);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header title="Play Time" />

      <div className="px-4 py-4 space-y-5">
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

        {/* Quick Log Card */}
        {!showManual && (
          <Card>
            <CardHeader
              title="Quick Log"
              subtitle={`How long did ${selectedBaby?.name || 'baby'} play?`}
            />

            {/* Quick Duration Buttons */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {QUICK_DURATIONS.map((duration) => (
                <Button
                  key={duration}
                  variant="outline"
                  onClick={() => handleQuickLog(duration)}
                  disabled={saving}
                  className="flex flex-col items-center py-3"
                  style={{
                    borderColor: PLAY_TYPE_CONFIG[playType].color,
                    color: PLAY_TYPE_CONFIG[playType].color
                  }}
                >
                  <span className="text-lg font-bold">{duration}</span>
                  <span className="text-xs">min</span>
                </Button>
              ))}
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

            {/* Link to manual entry */}
            <button
              onClick={() => setShowManual(true)}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4 py-2"
            >
              Log a past session →
            </button>
          </Card>
        )}

        {/* Manual Entry Mode */}
        {showManual && (
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowManual(false)}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualSave}
                  className="flex-1"
                  disabled={!manualStartTime || !manualEndTime || saving}
                  style={{ backgroundColor: PLAY_TYPE_CONFIG[playType].color }}
                >
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
      </div>
    </div>
  );
}
