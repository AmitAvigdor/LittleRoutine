import { useState, useEffect, useRef, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MoodIndicator } from '@/components/ui/MoodSelector';
import { DiaperChange, DiaperType, BabyMood, DIAPER_TYPE_CONFIG } from '@/types';
import { createDiaperChange, deleteDiaperChange, updateDiaperChange } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { useHomeStore } from '@/stores/homeStore';
import { prefetchHomeData } from '@/features/dashboard/homeDataSync';
import { toast } from '@/stores/toastStore';
import { clsx } from 'clsx';
import { Droplet, Circle, Clock, Check, Edit3, Trash2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { consumeDiaperBagSupplies, DIAPER_BAG_ITEM_IDS } from './diaperBagStorage';

type EntryMode = 'quick' | 'manual';
type DiaperSource = 'home' | 'bag';

const entryModeOptions = [
  { value: 'quick', label: 'Quick', icon: <Zap className="w-4 h-4" /> },
  { value: 'manual', label: 'Manual', icon: <Edit3 className="w-4 h-4" /> },
];

const diaperSourceOptions = [
  { value: 'home', label: 'From Home' },
  { value: 'bag', label: 'From Bag' },
];

const DIAPER_ICONS: Record<DiaperType, React.ReactNode> = {
  wet: <Droplet className="w-8 h-8" />,
  full: <Circle className="w-8 h-8" />,
};

export function DiaperView() {
  const { user } = useAuth();
  const { selectedBaby, babies } = useAppStore();
  const changes = useHomeStore((state) => state.diaperChanges);
  const addOptimisticDiaperChange = useHomeStore((state) => state.addOptimisticDiaperChange);
  const updateDiaperChangeOptimistically = useHomeStore((state) => state.updateDiaperChangeOptimistically);
  const removeDiaperChangeFromStore = useHomeStore((state) => state.removeDiaperChange);
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
  const [diaperSource, setDiaperSource] = useState<DiaperSource>('home');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));

  // Edit mode state
  const [editingChange, setEditingChange] = useState<DiaperChange | null>(null);

  // Expandable details state
  const [showDetails, setShowDetails] = useState(false);

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

  const buildOptimisticChange = useCallback((change: {
    id: string;
    type: DiaperType;
    timestamp: string;
    notes: string | null;
    babyMood: BabyMood | null;
  }): DiaperChange | null => {
    if (!selectedBaby || !user) {
      return null;
    }

    return {
      id: change.id,
      babyId: selectedBaby.id,
      userId: user.uid,
      date: change.timestamp.split('T')[0],
      type: change.type,
      timestamp: change.timestamp,
      notes: change.notes,
      babyMood: change.babyMood,
      createdAt: change.timestamp,
      updatedAt: change.timestamp,
    };
  }, [selectedBaby, user]);

  const handleQuickLog = useCallback(async (type: DiaperType) => {
    if (!user || !selectedBaby) return;
    const source = diaperSource;
    const timestamp = new Date().toISOString();
    const optimisticChange = buildOptimisticChange({
      id: `optimistic-diaper-${Date.now()}`,
      type,
      timestamp,
      notes: null,
      babyMood: null,
    });

    if (optimisticChange) {
      addOptimisticDiaperChange(optimisticChange);
    }

    try {
      await createDiaperChange(selectedBaby.id, user.uid, {
        type,
        timestamp,
        notes: null,
        babyMood: null,
      });

      prefetchHomeData({ userId: user.uid, babyId: selectedBaby.id });
      toast.success(`${DIAPER_TYPE_CONFIG[type].label} diaper logged`);
      applyBagSourceAdjustment(user.uid, source);
      setDiaperSource('home');
    } catch (error) {
      if (optimisticChange) {
        removeDiaperChangeFromStore(optimisticChange.id);
      }
      console.error('Error saving diaper change:', error);
      toast.error('Failed to save diaper change. Please try again.');
    }
  }, [
    addOptimisticDiaperChange,
    buildOptimisticChange,
    diaperSource,
    removeDiaperChangeFromStore,
    selectedBaby,
    user,
  ]);

  const handleDetailedLog = (type: DiaperType) => {
    setSelectedType(type);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !selectedBaby || !selectedType) return;
    const source = diaperSource;
    const timestamp = new Date().toISOString();
    const optimisticChange = buildOptimisticChange({
      id: `optimistic-diaper-${Date.now()}`,
      type: selectedType,
      timestamp,
      notes: notes || null,
      babyMood,
    });

    setSaving(true);
    if (optimisticChange) {
      addOptimisticDiaperChange(optimisticChange);
    }
    try {
      await createDiaperChange(selectedBaby.id, user.uid, {
        type: selectedType,
        timestamp,
        notes: notes || null,
        babyMood,
      });

      prefetchHomeData({ userId: user.uid, babyId: selectedBaby.id });
      // Reset form only on success
      setSelectedType(null);
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
      setShowDetails(false);
      setDiaperSource('home');
      setJustSaved(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => setJustSaved(false), 1500);
      applyBagSourceAdjustment(user.uid, source);
    } catch (error) {
      if (optimisticChange) {
        removeDiaperChangeFromStore(optimisticChange.id);
      }
      console.error('Error saving diaper change:', error);
      toast.error('Failed to save diaper change. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!user || !selectedBaby || !selectedType || !manualDate || !manualTime) return;
    const source = diaperSource;

    const timestamp = new Date(`${manualDate}T${manualTime}`);

    // Check if date is valid
    if (isNaN(timestamp.getTime())) {
      toast.error('Invalid date or time. Please check your input.');
      return;
    }

    // Check if date is not in the future
    if (timestamp > new Date()) {
      toast.error('Time cannot be in the future.');
      return;
    }

    setSaving(true);
    const optimisticChange = buildOptimisticChange({
      id: `optimistic-diaper-${Date.now()}`,
      type: selectedType,
      timestamp: timestamp.toISOString(),
      notes: notes || null,
      babyMood,
    });

    if (optimisticChange) {
      addOptimisticDiaperChange(optimisticChange);
    }
    try {
      await createDiaperChange(selectedBaby.id, user.uid, {
        type: selectedType,
        timestamp: timestamp.toISOString(),
        notes: notes || null,
        babyMood,
      });

      prefetchHomeData({ userId: user.uid, babyId: selectedBaby.id });
      // Reset form
      setSelectedType(null);
      setNotes('');
      setBabyMood(null);
      setShowDetails(false);
      setDiaperSource('home');
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualTime(format(new Date(), 'HH:mm'));

      toast.success(`${DIAPER_TYPE_CONFIG[selectedType].label} diaper logged`);
      applyBagSourceAdjustment(user.uid, source);
    } catch (error) {
      if (optimisticChange) {
        removeDiaperChangeFromStore(optimisticChange.id);
      }
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
    setShowDetails(false);
    setDiaperSource('home');
  };

  const handleEditClick = (change: DiaperChange) => {
    setEditingChange(change);
    // Convert legacy types (dirty, both) to 'full'
    const editType = change.type === 'wet' ? 'wet' : 'full';
    setSelectedType(editType);
    setNotes(change.notes || '');
    setBabyMood(change.babyMood);
    setManualDate(change.timestamp.split('T')[0]);
    setManualTime(format(parseISO(change.timestamp), 'HH:mm'));
    // Auto-expand details if there's existing mood or notes
    setShowDetails(!!(change.babyMood || change.notes));
  };

  const handleEditSave = async () => {
    if (!editingChange || !selectedType) return;

    const timestamp = new Date(`${manualDate}T${manualTime}`);

    // Check if date is valid
    if (isNaN(timestamp.getTime())) {
      toast.error('Invalid date or time. Please check your input.');
      return;
    }

    // Check if date is not in the future
    if (timestamp > new Date()) {
      toast.error('Time cannot be in the future.');
      return;
    }

    setSaving(true);
    const previousChange = editingChange;
    updateDiaperChangeOptimistically(editingChange.id, {
      type: selectedType,
      timestamp: timestamp.toISOString(),
      date: timestamp.toISOString().split('T')[0],
      notes: notes || null,
      babyMood,
    });
    try {
      await updateDiaperChange(editingChange.id, {
        type: selectedType,
        timestamp: timestamp.toISOString(),
        notes: notes || null,
        babyMood,
      });

      if (user && selectedBaby) {
        prefetchHomeData({ userId: user.uid, babyId: selectedBaby.id });
      }
      // Reset edit state
      setEditingChange(null);
      setSelectedType(null);
      setNotes('');
      setBabyMood(null);
      setShowDetails(false);
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualTime(format(new Date(), 'HH:mm'));

      toast.success('Diaper change updated');
    } catch (error) {
      updateDiaperChangeOptimistically(previousChange.id, previousChange);
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
    setShowDetails(false);
    setDiaperSource('home');
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualTime(format(new Date(), 'HH:mm'));
  };

  const handleDelete = async () => {
    if (!editingChange) return;

    setSaving(true);
    try {
      await deleteDiaperChange(editingChange.id);
      if (user && selectedBaby) {
        prefetchHomeData({ userId: user.uid, babyId: selectedBaby.id });
      }
      setEditingChange(null);
      setSelectedType(null);
      setNotes('');
      setBabyMood(null);
      setShowDetails(false);
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
  }, [handleQuickLog]);

  const handleTouchMove = useCallback(() => {
    // Cancel long press if user moves finger
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const applyBagSourceAdjustment = (userId: string, source: DiaperSource) => {
    if (source !== 'bag') {
      return;
    }

    try {
      const { consumedItems } = consumeDiaperBagSupplies(userId, [DIAPER_BAG_ITEM_IDS.diapers]);
      const diapersItem = consumedItems.find((item) => item.id === DIAPER_BAG_ITEM_IDS.diapers);

      if (diapersItem?.quantity === 0) {
        toast.warning('Your bag is now out of diapers!');
        return;
      }

      toast.info('Diaper removed from bag. Remember to check if your wipes pack is getting low!');
    } catch (error) {
      console.error('Error updating diaper bag inventory:', error);
      toast.error('Diaper logged, but the bag inventory could not be updated.');
    }
  };

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  // Today's stats
  const todayChanges = changes.filter((c) => isToday(parseISO(c.timestamp)));
  const stats = {
    total: todayChanges.length,
    wet: todayChanges.filter((c) => c.type === 'wet').length,
    // Count 'full' and legacy types ('dirty', 'both') as full
    full: todayChanges.filter((c) => (c.type as string) !== 'wet').length,
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
              <SegmentedControl
                options={diaperSourceOptions}
                value={diaperSource}
                onChange={(value) => setDiaperSource(value as DiaperSource)}
                fullWidth
              />
            </div>

            {justSaved && (
              <div className="flex items-center justify-center gap-2 mb-4 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Saved!</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {(['wet', 'full'] as DiaperType[]).map((type) => {
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
                <div className="grid grid-cols-2 gap-3">
                  {(['wet', 'full'] as DiaperType[]).map((type) => {
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
                          {type === 'full' && <Circle className="w-6 h-6" />}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <SegmentedControl
                  options={diaperSourceOptions}
                  value={diaperSource}
                  onChange={(value) => setDiaperSource(value as DiaperSource)}
                  fullWidth
                />
              </div>

              <Button
                onClick={handleManualSave}
                className="w-full"
                disabled={!selectedType || saving}
              >
                {saving ? 'Saving...' : 'Save Diaper Change'}
              </Button>

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
                    placeholder="Any notes about this change..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <SegmentedControl
                  options={diaperSourceOptions}
                  value={diaperSource}
                  onChange={(value) => setDiaperSource(value as DiaperSource)}
                  fullWidth
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex-1" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
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
                    placeholder="Any notes about this change..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
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
                <div className="grid grid-cols-2 gap-3">
                  {(['wet', 'full'] as DiaperType[]).map((type) => {
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
                          {type === 'full' && <Circle className="w-6 h-6" />}
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
                    placeholder="Any notes about this change..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Today's Stats */}
        {!isInDetailForm && !isEditing && (
          <div className="grid grid-cols-3 gap-2">
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
                style={{ color: DIAPER_TYPE_CONFIG.full.color }}
              >
                {stats.full}
              </p>
              <p className="text-xs text-gray-500">Full</p>
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
              {changes.slice(0, 10).map((change) => {
                // Handle legacy types (dirty, both) as "full"
                const displayType = change.type === 'wet' ? 'wet' : 'full';
                const config = DIAPER_TYPE_CONFIG[displayType];
                return (
                  <button
                    key={change.id}
                    onClick={() => handleEditClick(change)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      {displayType === 'wet' && <Droplet className="w-5 h-5" />}
                      {displayType === 'full' && <Circle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {config.label}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{format(parseISO(change.timestamp), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                    <MoodIndicator babyMood={change.babyMood} size="sm" />
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
