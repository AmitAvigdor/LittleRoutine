import { useState, useEffect } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { EditSessionModal } from '@/components/ui/EditSessionModal';
import { WalkSession, BabyMood, formatDuration } from '@/types';
import { createCompleteWalkSession, subscribeToWalkSessions } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/stores/toastStore';
import { Clock, Footprints, ChevronDown, ChevronUp } from 'lucide-react';

const WALK_COLOR = '#8bc34a';

// Quick duration options in minutes
const QUICK_DURATIONS = [10, 15, 20, 30, 45, 60];

export function WalksView() {
  const { user } = useAuth();
  const { selectedBaby, babies } = useAppStore();

  const [sessions, setSessions] = useState<WalkSession[]>([]);
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSession, setSelectedSession] = useState<WalkSession | null>(null);

  // Manual entry state
  const [showManual, setShowManual] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState(format(new Date(), 'HH:mm'));
  const [manualEndTime, setManualEndTime] = useState(format(new Date(), 'HH:mm'));

  // Subscribe to sessions
  useEffect(() => {
    if (!selectedBaby) return;
    const unsubscribe = subscribeToWalkSessions(selectedBaby.id, setSessions);
    return () => unsubscribe();
  }, [selectedBaby]);

  const handleQuickLog = async (durationMinutes: number) => {
    if (!user || !selectedBaby || saving) return;

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - durationMinutes * 60 * 1000);

    setSaving(true);
    try {
      await createCompleteWalkSession(selectedBaby.id, user.uid, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: notes || null,
        babyMood,
      });

      setNotes('');
      setBabyMood(null);
      setShowDetails(false);

      const label = durationMinutes >= 60 ? `${durationMinutes / 60}h` : `${durationMinutes} min`;
      toast.success(`${label} walk logged`);
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
      setShowManual(false);

      toast.success(`${formatDuration(durationMinutes * 60)} walk logged`);
    } catch (error) {
      console.error('Error saving walk session:', error);
      toast.error('Failed to save walk. Please try again.');
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
        {/* Quick Log Card */}
        {!showManual && (
          <Card>
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${WALK_COLOR}20` }}
              >
                <Footprints className="w-8 h-8" style={{ color: WALK_COLOR }} />
              </div>
            </div>

            <CardHeader
              title="Quick Log"
              subtitle={`How long was the walk?`}
            />

            {/* Quick Duration Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {QUICK_DURATIONS.map((duration) => (
                <Button
                  key={duration}
                  variant="outline"
                  onClick={() => handleQuickLog(duration)}
                  disabled={saving}
                  className="flex flex-col items-center py-3"
                  style={{
                    borderColor: WALK_COLOR,
                    color: WALK_COLOR
                  }}
                >
                  <span className="text-lg font-bold">
                    {duration >= 60 ? `${duration / 60}` : duration}
                  </span>
                  <span className="text-xs">{duration >= 60 ? 'hour' : 'min'}</span>
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
                  placeholder="Where did you go? How was the walk?"
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
              Log a past walk →
            </button>
          </Card>
        )}

        {/* Manual Entry Mode */}
        {showManual && (
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
                  style={{ backgroundColor: WALK_COLOR }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
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
          <Card padding="none">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Walks</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {completedSessions.slice(0, 5).map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${WALK_COLOR}20` }}
                  >
                    <Footprints className="w-5 h-5" style={{ color: WALK_COLOR }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Walk</p>
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
            sessionType="walk"
            session={selectedSession}
          />
        )}
      </div>
    </div>
  );
}
