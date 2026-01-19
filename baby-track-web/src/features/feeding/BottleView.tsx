import { useState, useEffect } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { Baby, BottleSession, BottleContentType, BabyMood, VolumeUnit, BOTTLE_CONTENT_CONFIG, convertVolume } from '@/types';
import { createBottleSession, subscribeToBottleSessions } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { clsx } from 'clsx';
import { Clock, Milk, Plus } from 'lucide-react';

interface BottleViewProps {
  baby: Baby;
}

const contentOptions = [
  { value: 'breastMilk', label: 'Breast Milk', color: BOTTLE_CONTENT_CONFIG.breastMilk.color },
  { value: 'formula', label: 'Formula', color: BOTTLE_CONTENT_CONFIG.formula.color },
  { value: 'mixed', label: 'Mixed', color: BOTTLE_CONTENT_CONFIG.mixed.color },
];

export function BottleView({ baby }: BottleViewProps) {
  const { user } = useAuth();
  const { settings } = useAppStore();
  const [sessions, setSessions] = useState<BottleSession[]>([]);
  const [contentType, setContentType] = useState<BottleContentType>('breastMilk');
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(settings?.preferredVolumeUnit || 'oz');
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Subscribe to sessions
  useEffect(() => {
    const unsubscribe = subscribeToBottleSessions(baby.id, setSessions);
    return () => unsubscribe();
  }, [baby.id]);

  useEffect(() => {
    if (settings?.preferredVolumeUnit) {
      setVolumeUnit(settings.preferredVolumeUnit);
    }
  }, [settings?.preferredVolumeUnit]);

  const handleQuickAdd = (quickVolume: number) => {
    setVolume(quickVolume.toString());
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !volume) return;

    setSaving(true);
    try {
      await createBottleSession(baby.id, user.uid, {
        timestamp: new Date().toISOString(),
        volume: parseFloat(volume),
        volumeUnit,
        contentType,
        notes: notes || null,
        babyMood,
      });

      // Reset form only on success
      setVolume('');
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving bottle session:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setVolume('');
    setNotes('');
    setBabyMood(null);
    setShowForm(false);
  };

  // Today's stats
  const todaySessions = sessions.filter((s) => isToday(parseISO(s.timestamp)));
  const todayTotalVolume = todaySessions.reduce((sum, s) => {
    const vol = convertVolume(s.volume, s.volumeUnit, volumeUnit);
    return sum + vol;
  }, 0);

  // Quick add amounts
  const quickAmounts = volumeUnit === 'oz' ? [2, 3, 4, 5, 6] : [60, 90, 120, 150, 180];

  return (
    <div className="space-y-4">
      {/* Content Type Selector */}
      <div className="flex justify-center">
        <SegmentedControl
          options={contentOptions}
          value={contentType}
          onChange={(value) => setContentType(value as BottleContentType)}
        />
      </div>

      {/* Quick Add Buttons */}
      {!showForm && (
        <Card>
          <CardHeader title="Quick Add" subtitle="Tap to log a feeding" />
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAdd(amount)}
                className={clsx(
                  'flex-1 min-w-[60px] py-4 rounded-xl text-center',
                  'border-2 border-gray-200 hover:border-primary-300',
                  'transition-all duration-200 hover:bg-primary-50'
                )}
              >
                <p className="text-2xl font-bold text-gray-900">{amount}</p>
                <p className="text-xs text-gray-500">{volumeUnit}</p>
              </button>
            ))}
            <button
              onClick={() => setShowForm(true)}
              className={clsx(
                'flex-1 min-w-[60px] py-4 rounded-xl text-center',
                'border-2 border-dashed border-gray-300 hover:border-primary-300',
                'transition-all duration-200 hover:bg-primary-50'
              )}
            >
              <Plus className="w-6 h-6 mx-auto text-gray-400" />
              <p className="text-xs text-gray-500 mt-1">Custom</p>
            </button>
          </div>
        </Card>
      )}

      {/* Entry Form */}
      {showForm && (
        <Card>
          <CardHeader
            title="Log Bottle Feeding"
            subtitle={BOTTLE_CONTENT_CONFIG[contentType].label}
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
                autoFocus
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

            <BabyMoodSelector
              label="Baby's mood"
              value={babyMood}
              onChange={setBabyMood}
            />

            <Textarea
              label="Notes (optional)"
              placeholder="Any notes about this feeding..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={!volume || saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary-600">{todaySessions.length}</p>
          <p className="text-sm text-gray-500">Feedings today</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary-600">
            {todayTotalVolume.toFixed(1)} {volumeUnit}
          </p>
          <p className="text-sm text-gray-500">Total volume</p>
        </Card>
      </div>

      {/* Session History */}
      {sessions.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Feedings</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="px-4 py-3 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: BOTTLE_CONTENT_CONFIG[session.contentType].color }}
                >
                  <Milk className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {session.volume} {session.volumeUnit} • {BOTTLE_CONTENT_CONFIG[session.contentType].label}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{format(parseISO(session.timestamp), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
                <MoodIndicator babyMood={session.babyMood} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
