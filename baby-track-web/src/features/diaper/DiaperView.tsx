import { useState, useEffect, useRef, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { DiaperChange, DiaperType, BabyMood, DIAPER_TYPE_CONFIG } from '@/types';
import { createDiaperChange, subscribeToDiaperChanges, deleteDiaperChange, updateDiaperChange } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/stores/toastStore';
import { clsx } from 'clsx';
import { Droplet, Circle, Layers, Clock, Check, Edit3, Trash2 } from 'lucide-react';

type EntryMode = 'quick' | 'manual';

const entryModeOptions = [
  { value: 'quick', label: 'Quick Log' },
  { value: 'manual', label: 'Manual Entry', icon: <Edit3 className="w-4 h-4" /> },
];

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
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  // Entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('quick');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));

  // Edit mode state
  const [editingChange, setEditingChange] = useState<DiaperChange | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
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

      toast.success(`${DIAPER_TYPE_CONFIG[type].label} diaper logged`);
    } catch (error) {
      console.error('Error saving diaper change:', error);
      toast.error('Failed to save diaper change. Please try again.');
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
      toast.error('Failed to save diaper change. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!user || !selectedBaby || !selectedType || !manualDate || !manualTime) return;

    const timestamp = new Date(`${manualDate}T${manualTime}`);

    setSaving(true);
    try {
      await createDiaperChange(selectedBaby.id, user.uid, {
        type: selectedType,
        timestamp: timestamp.toISOString(),
        notes: notes || null,
        babyMood,
      });

      // Reset form
      setSelectedType(null);
      setNotes('');
      setBabyMood(null);
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualTime(format(new Date(), 'HH:mm'));

      toast.success(`${DIAPER_TYPE_CONFIG[selectedType].label} diaper logged`);
    } catch (error) {
      console.error('Error saving diaper change:', error);
      toast.error('Failed to save diaper change. Please try again.');
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

  const handleEditClick = (change: DiaperChange) => {
    setEditingChange(change);
    setSelectedType(change.type);
    setNotes(change.notes || '');
    setBabyMood(change.babyMood);
    setManualDate(change.timestamp.split('T')[0]);
    setManualTime(format(parseISO(change.timestamp), 'HH:mm'));
  };

  const handleEditSave = async () => {
    if (!editingChange || !selectedType) return;

    const timestamp = new Date(`${manualDate}T${manualTime}`);

    setSaving(true);
    try {
      await updateDiaperChange(editingChange.id, {
        type: selectedType,
        timestamp: timestamp.toISOString(),
        notes: notes || null,
        babyMood,
      });

      // Reset edit state
      setEditingChange(null);
      setSelectedType(null);
      setNotes('');
      setBabyMood(null);
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualTime(format(new Date(), 'HH:mm'));

      toast.success('Diaper change updated');
    } catch (error) {
      console.error('Error updating diaper change:', error);
      toast.error('Failed to update diaper change. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingChange(null);
    setSelectedType(null);
    setNotes('');
    setBabyMood(null);
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualTime(format(new Date(), 'HH:mm'));
  };

  const handleDelete = async () => {
    if (!editingChange) return;

    setSaving(true);
    try {
      await deleteDiaperChange(editingChange.id);
      setEditingChange(null);
      setSelectedType(null);
      setNotes('');
      setBabyMood(null);
      toast.info('Diaper change deleted');
    } catch (error) {
      console.error('Error deleting diaper change:', error);
      toast.error('Failed to delete diaper change. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Long press handlers for mobile
  const handleTouchStart = useCallback((type: DiaperType) => {
    longPressTriggeredRef.current = false;
    longPressTimeoutRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      handleDetailedLog(type);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const handleButtonClick = useCallback((type: DiaperType) => {
    // Don't trigger quick log if long press was just triggered
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    handleQuickLog(type);
  }, [user, selectedBaby]);

  const handleTouchMove = useCallback(() => {
    // Cancel long press if user moves finger
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

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

  // Check if we're in edit mode or detail form
  const isEditing = editingChange !== null;
  const isInDetailForm = showForm && selectedType !== null;

  return (
    <div>
      <Header title="Diaper" />

      <div className="px-4 py-4 space-y-4">
        {/* Entry Mode Toggle - hide when in form or editing */}
        {!isInDetailForm && !isEditing && (
          <div className="flex justify-center">
            <SegmentedControl
              options={entryModeOptions}
              value={entryMode}
              onChange={(value) => setEntryMode(value as EntryMode)}
            />
          </div>
        )}

        {/* Quick Log Mode */}
        {entryMode === 'quick' && !isInDetailForm && !isEditing && (
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
                    onTouchStart={() => handleTouchStart(type)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onClick={() => handleButtonClick(type)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleDetailedLog(type);
                    }}
                    className={clsx(
                      'flex flex-col items-center justify-center py-6 rounded-2xl',
                      'border-2 transition-all duration-200',
                      'hover:scale-105 active:scale-95',
                      'select-none touch-manipulation'
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

        {/* Manual Entry Mode */}
        {entryMode === 'manual' && !isInDetailForm && !isEditing && (
          <Card>
            <div className="text-center mb-4">
              <h3 className="font-semibold text-gray-900">Log Past Diaper Change</h3>
            </div>

            <div className="space-y-4">
              {/* Diaper Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['wet', 'dirty', 'both'] as DiaperType[]).map((type) => {
                    const config = DIAPER_TYPE_CONFIG[type];
                    const isSelected = selectedType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={clsx(
                          'flex flex-col items-center justify-center py-4 rounded-xl',
                          'border-2 transition-all duration-200',
                          isSelected ? 'scale-105' : 'opacity-60'
                        )}
                        style={{
                          borderColor: config.color,
                          backgroundColor: isSelected ? `${config.color}20` : `${config.color}10`,
                        }}
                      >
                        <div style={{ color: config.color }}>
                          {type === 'wet' && <Droplet className="w-6 h-6" />}
                          {type === 'dirty' && <Circle className="w-6 h-6" />}
                          {type === 'both' && <Layers className="w-6 h-6" />}
                        </div>
                        <span
                          className="mt-1 text-sm font-medium"
                          style={{ color: config.color }}
                        >
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  label="Date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
                <Input
                  type="time"
                  label="Time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                />
              </div>

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

              <Button
                onClick={handleManualSave}
                className="w-full"
                disabled={!selectedType || saving}
              >
                {saving ? 'Saving...' : 'Save Diaper Change'}
              </Button>
            </div>
          </Card>
        )}

        {/* Detailed Form (from long press) */}
        {isInDetailForm && !isEditing && (
          <Card>
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-2"
                style={{ backgroundColor: `${DIAPER_TYPE_CONFIG[selectedType!].color}20` }}
              >
                <span style={{ color: DIAPER_TYPE_CONFIG[selectedType!].color }}>
                  {DIAPER_ICONS[selectedType!]}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">
                {DIAPER_TYPE_CONFIG[selectedType!].label} Diaper
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

        {/* Edit Form */}
        {isEditing && (
          <Card>
            <div className="text-center mb-4">
              <h3 className="font-semibold text-gray-900">Edit Diaper Change</h3>
            </div>

            <div className="space-y-4">
              {/* Diaper Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['wet', 'dirty', 'both'] as DiaperType[]).map((type) => {
                    const config = DIAPER_TYPE_CONFIG[type];
                    const isSelected = selectedType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={clsx(
                          'flex flex-col items-center justify-center py-4 rounded-xl',
                          'border-2 transition-all duration-200',
                          isSelected ? 'scale-105' : 'opacity-60'
                        )}
                        style={{
                          borderColor: config.color,
                          backgroundColor: isSelected ? `${config.color}20` : `${config.color}10`,
                        }}
                      >
                        <div style={{ color: config.color }}>
                          {type === 'wet' && <Droplet className="w-6 h-6" />}
                          {type === 'dirty' && <Circle className="w-6 h-6" />}
                          {type === 'both' && <Layers className="w-6 h-6" />}
                        </div>
                        <span
                          className="mt-1 text-sm font-medium"
                          style={{ color: config.color }}
                        >
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  label="Date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
                <Input
                  type="time"
                  label="Time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                />
              </div>

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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="px-3"
                  disabled={saving}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
                <Button variant="outline" onClick={handleEditCancel} className="flex-1" disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} className="flex-1" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Today's Stats */}
        {!isInDetailForm && !isEditing && (
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
        )}

        {/* Change History */}
        {changes.length > 0 && !isInDetailForm && !isEditing && (
          <Card padding="none">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Changes</h3>
              <p className="text-xs text-gray-500">Tap to edit</p>
            </div>
            <div className="divide-y divide-gray-50">
              {changes.slice(0, 10).map((change) => (
                <button
                  key={change.id}
                  onClick={() => handleEditClick(change)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
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
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
