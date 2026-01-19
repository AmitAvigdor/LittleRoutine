import { useState, useEffect, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { DiaperChange, DiaperType, BabyMood, DIAPER_TYPE_CONFIG } from '@/types';
import { createDiaperChange, subscribeToDiaperChanges } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { clsx } from 'clsx';
import { Droplet, Circle, Layers, Clock, Check } from 'lucide-react';

const DIAPER_ICONS: Record<DiaperType, React.ReactNode> = {
  wet: <Droplet className="w-8 h-8" />,
  dirty: <Circle className="w-8 h-8" />,
  both: <Layers className="w-8 h-8" />,
};

export function DiaperView() {
  const { user } = useAuth();
  const { selectedBaby, babies } = useAppStore();
  const [changes, setChanges] = useState<DiaperChange[]>([]);
  const [selectedType, setSelectedType] = useState<DiaperType | null>(null);
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Subscribe to changes
  useEffect(() => {
    if (!selectedBaby) return;
    const unsubscribe = subscribeToDiaperChanges(selectedBaby.id, setChanges);
    return () => unsubscribe();
  }, [selectedBaby]);

  const handleQuickLog = async (type: DiaperType) => {
    if (!user || !selectedBaby) return;

    try {
      await createDiaperChange(selectedBaby.id, user.uid, {
        type,
        timestamp: new Date().toISOString(),
        notes: null,
        babyMood: null,
      });

      // Show feedback
      setJustSaved(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => setJustSaved(false), 1500);
    } catch (error) {
      console.error('Error saving diaper change:', error);
    }
  };

  const handleDetailedLog = (type: DiaperType) => {
    setSelectedType(type);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !selectedBaby || !selectedType) return;

    setSaving(true);
    try {
      await createDiaperChange(selectedBaby.id, user.uid, {
        type: selectedType,
        timestamp: new Date().toISOString(),
        notes: notes || null,
        babyMood,
      });

      // Reset form only on success
      setSelectedType(null);
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
      setJustSaved(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => setJustSaved(false), 1500);
    } catch (error) {
      console.error('Error saving diaper change:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedType(null);
    setNotes('');
    setBabyMood(null);
    setShowForm(false);
  };

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  // Today's stats
  const todayChanges = changes.filter((c) => isToday(parseISO(c.timestamp)));
  const stats = {
    total: todayChanges.length,
    wet: todayChanges.filter((c) => c.type === 'wet').length,
    dirty: todayChanges.filter((c) => c.type === 'dirty').length,
    both: todayChanges.filter((c) => c.type === 'both').length,
  };

  return (
    <div>
      <Header title="Diaper" />

      <div className="px-4 py-4 space-y-4">
        {/* Quick Log Buttons */}
        {!showForm && (
          <Card>
            <div className="text-center mb-4">
              <h3 className="font-semibold text-gray-900">Quick Log</h3>
              <p className="text-sm text-gray-500">Tap to log, hold for details</p>
            </div>

            {justSaved && (
              <div className="flex items-center justify-center gap-2 mb-4 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Saved!</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {(['wet', 'dirty', 'both'] as DiaperType[]).map((type) => {
                const config = DIAPER_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => handleQuickLog(type)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleDetailedLog(type);
                    }}
                    className={clsx(
                      'flex flex-col items-center justify-center py-6 rounded-2xl',
                      'border-2 transition-all duration-200',
                      'hover:scale-105 active:scale-95'
                    )}
                    style={{
                      borderColor: config.color,
                      backgroundColor: `${config.color}10`,
                    }}
                  >
                    <div style={{ color: config.color }}>
                      {DIAPER_ICONS[type]}
                    </div>
                    <span
                      className="mt-2 font-medium"
                      style={{ color: config.color }}
                    >
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-center text-gray-400 mt-3">
              Long press for detailed entry
            </p>
          </Card>
        )}

        {/* Detailed Form */}
        {showForm && selectedType && (
          <Card>
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-2"
                style={{ backgroundColor: `${DIAPER_TYPE_CONFIG[selectedType].color}20` }}
              >
                <span style={{ color: DIAPER_TYPE_CONFIG[selectedType].color }}>
                  {DIAPER_ICONS[selectedType]}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">
                {DIAPER_TYPE_CONFIG[selectedType].label} Diaper
              </h3>
            </div>

            <div className="space-y-4">
              <BabyMoodSelector
                label="Baby's mood"
                value={babyMood}
                onChange={setBabyMood}
              />

              <Textarea
                label="Notes (optional)"
                placeholder="Any notes about this change..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex-1" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Today's Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="text-center p-3">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </Card>
          <Card className="text-center p-3">
            <p
              className="text-2xl font-bold"
              style={{ color: DIAPER_TYPE_CONFIG.wet.color }}
            >
              {stats.wet}
            </p>
            <p className="text-xs text-gray-500">Wet</p>
          </Card>
          <Card className="text-center p-3">
            <p
              className="text-2xl font-bold"
              style={{ color: DIAPER_TYPE_CONFIG.dirty.color }}
            >
              {stats.dirty}
            </p>
            <p className="text-xs text-gray-500">Dirty</p>
          </Card>
          <Card className="text-center p-3">
            <p
              className="text-2xl font-bold"
              style={{ color: DIAPER_TYPE_CONFIG.both.color }}
            >
              {stats.both}
            </p>
            <p className="text-xs text-gray-500">Both</p>
          </Card>
        </div>

        {/* Change History */}
        {changes.length > 0 && (
          <Card padding="none">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Changes</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {changes.slice(0, 10).map((change) => (
                <div
                  key={change.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: DIAPER_TYPE_CONFIG[change.type].color }}
                  >
                    {change.type === 'wet' && <Droplet className="w-5 h-5" />}
                    {change.type === 'dirty' && <Circle className="w-5 h-5" />}
                    {change.type === 'both' && <Layers className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {DIAPER_TYPE_CONFIG[change.type].label}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{format(parseISO(change.timestamp), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <MoodIndicator babyMood={change.babyMood} size="sm" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
