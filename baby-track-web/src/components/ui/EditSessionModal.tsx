import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector, MomMoodSelector } from '@/components/ui/MoodSelector';
import {
  SleepSession,
  FeedingSession,
  PumpSession,
  BottleSession,
  PlaySession,
  WalkSession,
  SleepType,
  BreastSide,
  PumpSide,
  BottleContentType,
  VolumeUnit,
  BabyMood,
  MomMood,
  PlayType,
  SLEEP_TYPE_CONFIG,
  BREAST_SIDE_CONFIG,
  PUMP_SIDE_CONFIG,
  BOTTLE_CONTENT_CONFIG,
  PLAY_TYPE_CONFIG,
} from '@/types';
import {
  updateSleepSession,
  updateFeedingSession,
  updatePumpSession,
  updateBottleSession,
  updatePlaySession,
  updateWalkSession,
  deleteSleepSession,
  deleteFeedingSession,
  deletePumpSession,
  deleteBottleSession,
  deletePlaySession,
  deleteWalkSession,
} from '@/lib/firestore';
import { X, Trash2, AlertTriangle, Moon, Sun, Footprints } from 'lucide-react';

type SessionType = 'sleep' | 'breastfeeding' | 'pump' | 'bottle' | 'play' | 'walk';

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionType: SessionType;
  session: SleepSession | FeedingSession | PumpSession | BottleSession | PlaySession | WalkSession;
}

export function EditSessionModal({ isOpen, onClose, sessionType, session }: EditSessionModalProps) {
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sleep fields
  const [sleepType, setSleepType] = useState<SleepType>('nap');
  const [sleepDate, setSleepDate] = useState('');
  const [sleepStartTime, setSleepStartTime] = useState('');
  const [sleepEndTime, setSleepEndTime] = useState('');

  // Breastfeeding fields
  const [breastSide, setBreastSide] = useState<BreastSide>('left');
  const [feedingDate, setFeedingDate] = useState('');
  const [feedingStartTime, setFeedingStartTime] = useState('');
  const [feedingEndTime, setFeedingEndTime] = useState('');

  // Pump fields
  const [pumpSide, setPumpSide] = useState<PumpSide>('both');
  const [pumpDate, setPumpDate] = useState('');
  const [pumpStartTime, setPumpStartTime] = useState('');
  const [pumpEndTime, setPumpEndTime] = useState('');
  const [pumpVolume, setPumpVolume] = useState('');
  const [pumpVolumeUnit, setPumpVolumeUnit] = useState<VolumeUnit>('oz');

  // Bottle fields
  const [bottleDate, setBottleDate] = useState('');
  const [bottleTime, setBottleTime] = useState('');
  const [bottleVolume, setBottleVolume] = useState('');
  const [bottleVolumeUnit, setBottleVolumeUnit] = useState<VolumeUnit>('oz');
  const [contentType, setContentType] = useState<BottleContentType>('breastMilk');

  // Play fields
  const [playType, setPlayType] = useState<PlayType>('tummy_time');
  const [playDate, setPlayDate] = useState('');
  const [playStartTime, setPlayStartTime] = useState('');
  const [playEndTime, setPlayEndTime] = useState('');

  // Walk fields
  const [walkDate, setWalkDate] = useState('');
  const [walkStartTime, setWalkStartTime] = useState('');
  const [walkEndTime, setWalkEndTime] = useState('');

  // Common fields
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [momMood, setMomMood] = useState<MomMood | null>(null);

  // Initialize fields when session changes
  useEffect(() => {
    if (!session) return;

    setNotes(session.notes || '');

    if (sessionType === 'sleep') {
      const s = session as SleepSession;
      setSleepType(s.type);
      setBabyMood(s.babyMood);
      setSleepDate(s.startTime.split('T')[0]);
      setSleepStartTime(format(parseISO(s.startTime), 'HH:mm'));
      if (s.endTime) {
        setSleepEndTime(format(parseISO(s.endTime), 'HH:mm'));
      }
    } else if (sessionType === 'breastfeeding') {
      const s = session as FeedingSession;
      setBreastSide(s.breastSide);
      setBabyMood(s.babyMood);
      setMomMood(s.momMood);
      setFeedingDate(s.startTime.split('T')[0]);
      setFeedingStartTime(format(parseISO(s.startTime), 'HH:mm'));
      if (s.endTime) {
        setFeedingEndTime(format(parseISO(s.endTime), 'HH:mm'));
      }
    } else if (sessionType === 'pump') {
      const s = session as PumpSession;
      setPumpSide(s.side);
      setMomMood(s.momMood);
      setPumpDate(s.startTime.split('T')[0]);
      setPumpStartTime(format(parseISO(s.startTime), 'HH:mm'));
      if (s.endTime) {
        setPumpEndTime(format(parseISO(s.endTime), 'HH:mm'));
      }
      setPumpVolume(s.volume.toString());
      setPumpVolumeUnit(s.volumeUnit);
    } else if (sessionType === 'bottle') {
      const s = session as BottleSession;
      setBabyMood(s.babyMood);
      setBottleDate(s.timestamp.split('T')[0]);
      setBottleTime(format(parseISO(s.timestamp), 'HH:mm'));
      setBottleVolume(s.volume.toString());
      setBottleVolumeUnit(s.volumeUnit);
      setContentType(s.contentType);
    } else if (sessionType === 'play') {
      const s = session as PlaySession;
      setPlayType(s.type);
      setBabyMood(s.babyMood);
      setPlayDate(s.startTime.split('T')[0]);
      setPlayStartTime(format(parseISO(s.startTime), 'HH:mm'));
      if (s.endTime) {
        setPlayEndTime(format(parseISO(s.endTime), 'HH:mm'));
      }
    } else if (sessionType === 'walk') {
      const s = session as WalkSession;
      setBabyMood(s.babyMood);
      setWalkDate(s.startTime.split('T')[0]);
      setWalkStartTime(format(parseISO(s.startTime), 'HH:mm'));
      if (s.endTime) {
        setWalkEndTime(format(parseISO(s.endTime), 'HH:mm'));
      }
    }
  }, [session, sessionType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (sessionType === 'sleep') {
        const startTime = new Date(`${sleepDate}T${sleepStartTime}`).toISOString();
        const endTime = sleepEndTime ? new Date(`${sleepDate}T${sleepEndTime}`).toISOString() : null;
        await updateSleepSession(session.id, {
          startTime,
          endTime,
          type: sleepType,
          notes: notes || null,
          babyMood,
        });
      } else if (sessionType === 'breastfeeding') {
        const startTime = new Date(`${feedingDate}T${feedingStartTime}`).toISOString();
        const endTime = new Date(`${feedingDate}T${feedingEndTime}`).toISOString();
        await updateFeedingSession(session.id, {
          startTime,
          endTime,
          breastSide,
          notes: notes || null,
          babyMood,
          momMood,
        });
      } else if (sessionType === 'pump') {
        const startTime = new Date(`${pumpDate}T${pumpStartTime}`).toISOString();
        const endTime = new Date(`${pumpDate}T${pumpEndTime}`).toISOString();
        await updatePumpSession(session.id, {
          startTime,
          endTime,
          side: pumpSide,
          volume: parseFloat(pumpVolume) || 0,
          volumeUnit: pumpVolumeUnit,
          notes: notes || null,
          momMood,
        });
      } else if (sessionType === 'bottle') {
        const timestamp = new Date(`${bottleDate}T${bottleTime}`).toISOString();
        await updateBottleSession(session.id, {
          timestamp,
          volume: parseFloat(bottleVolume) || 0,
          volumeUnit: bottleVolumeUnit,
          contentType,
          notes: notes || null,
          babyMood,
        });
      } else if (sessionType === 'play') {
        const startTime = new Date(`${playDate}T${playStartTime}`).toISOString();
        const endTime = playEndTime ? new Date(`${playDate}T${playEndTime}`).toISOString() : null;
        await updatePlaySession(session.id, {
          startTime,
          endTime,
          type: playType,
          notes: notes || null,
          babyMood,
        });
      } else if (sessionType === 'walk') {
        const startTime = new Date(`${walkDate}T${walkStartTime}`).toISOString();
        const endTime = walkEndTime ? new Date(`${walkDate}T${walkEndTime}`).toISOString() : null;
        await updateWalkSession(session.id, {
          startTime,
          endTime,
          notes: notes || null,
          babyMood,
        });
      }
      onClose();
    } catch (error) {
      console.error('Error updating session:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      if (sessionType === 'sleep') {
        await deleteSleepSession(session.id);
      } else if (sessionType === 'breastfeeding') {
        await deleteFeedingSession(session.id);
      } else if (sessionType === 'pump') {
        await deletePumpSession(session.id);
      } else if (sessionType === 'bottle') {
        await deleteBottleSession(session.id);
      } else if (sessionType === 'play') {
        await deletePlaySession(session.id);
      } else if (sessionType === 'walk') {
        await deleteWalkSession(session.id);
      }
      onClose();
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (sessionType) {
      case 'sleep':
        return 'Edit Sleep Session';
      case 'breastfeeding':
        return 'Edit Breastfeeding Session';
      case 'pump':
        return 'Edit Pump Session';
      case 'bottle':
        return 'Edit Bottle Feeding';
      case 'play':
        return 'Edit Play Session';
      case 'walk':
        return 'Edit Walk';
      default:
        return 'Edit Session';
    }
  };

  const sleepTypeOptions = [
    { value: 'nap', label: 'Nap', icon: <Sun className="w-4 h-4" />, color: SLEEP_TYPE_CONFIG.nap.color },
    { value: 'night', label: 'Night', icon: <Moon className="w-4 h-4" />, color: SLEEP_TYPE_CONFIG.night.color },
  ];

  const breastSideOptions = [
    { value: 'left', label: 'Left', color: BREAST_SIDE_CONFIG.left.color },
    { value: 'right', label: 'Right', color: BREAST_SIDE_CONFIG.right.color },
  ];

  const pumpSideOptions = [
    { value: 'left', label: 'Left', color: PUMP_SIDE_CONFIG.left.color },
    { value: 'right', label: 'Right', color: PUMP_SIDE_CONFIG.right.color },
    { value: 'both', label: 'Both', color: PUMP_SIDE_CONFIG.both.color },
  ];

  const contentTypeOptions = [
    { value: 'breastMilk', label: 'Breast Milk', color: BOTTLE_CONTENT_CONFIG.breastMilk.color },
    { value: 'formula', label: 'Formula', color: BOTTLE_CONTENT_CONFIG.formula.color },
    { value: 'mixed', label: 'Mixed', color: BOTTLE_CONTENT_CONFIG.mixed.color },
  ];

  const playTypeOptions = Object.entries(PLAY_TYPE_CONFIG).map(([value, config]) => ({
    value,
    label: config.emoji,
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{getTitle()}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {showDeleteConfirm ? (
          // Delete confirmation view
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900">Delete this session?</p>
                <p className="text-sm text-red-700">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                className="flex-1"
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        ) : (
          // Edit form view
          <div className="space-y-4">
            {/* Sleep fields */}
            {sessionType === 'sleep' && (
              <>
                <div className="flex justify-center">
                  <SegmentedControl
                    options={sleepTypeOptions}
                    value={sleepType}
                    onChange={(value) => setSleepType(value as SleepType)}
                  />
                </div>
                <Input
                  type="date"
                  label="Date"
                  value={sleepDate}
                  onChange={(e) => setSleepDate(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="time"
                    label="Start Time"
                    value={sleepStartTime}
                    onChange={(e) => setSleepStartTime(e.target.value)}
                  />
                  <Input
                    type="time"
                    label="End Time"
                    value={sleepEndTime}
                    onChange={(e) => setSleepEndTime(e.target.value)}
                  />
                </div>
                <BabyMoodSelector
                  label="Baby's mood when waking"
                  value={babyMood}
                  onChange={setBabyMood}
                />
              </>
            )}

            {/* Breastfeeding fields */}
            {sessionType === 'breastfeeding' && (
              <>
                <div className="flex justify-center">
                  <SegmentedControl
                    options={breastSideOptions}
                    value={breastSide}
                    onChange={(value) => setBreastSide(value as BreastSide)}
                  />
                </div>
                <Input
                  type="date"
                  label="Date"
                  value={feedingDate}
                  onChange={(e) => setFeedingDate(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="time"
                    label="Start Time"
                    value={feedingStartTime}
                    onChange={(e) => setFeedingStartTime(e.target.value)}
                  />
                  <Input
                    type="time"
                    label="End Time"
                    value={feedingEndTime}
                    onChange={(e) => setFeedingEndTime(e.target.value)}
                  />
                </div>
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
              </>
            )}

            {/* Pump fields */}
            {sessionType === 'pump' && (
              <>
                <div className="flex justify-center">
                  <SegmentedControl
                    options={pumpSideOptions}
                    value={pumpSide}
                    onChange={(value) => setPumpSide(value as PumpSide)}
                  />
                </div>
                <Input
                  type="date"
                  label="Date"
                  value={pumpDate}
                  onChange={(e) => setPumpDate(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="time"
                    label="Start Time"
                    value={pumpStartTime}
                    onChange={(e) => setPumpStartTime(e.target.value)}
                  />
                  <Input
                    type="time"
                    label="End Time"
                    value={pumpEndTime}
                    onChange={(e) => setPumpEndTime(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    label="Volume"
                    value={pumpVolume}
                    onChange={(e) => setPumpVolume(e.target.value)}
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
                      value={pumpVolumeUnit}
                      onChange={(value) => setPumpVolumeUnit(value as VolumeUnit)}
                      size="sm"
                    />
                  </div>
                </div>
                <MomMoodSelector
                  label="Your mood"
                  value={momMood}
                  onChange={setMomMood}
                />
              </>
            )}

            {/* Bottle fields */}
            {sessionType === 'bottle' && (
              <>
                <div className="flex justify-center">
                  <SegmentedControl
                    options={contentTypeOptions}
                    value={contentType}
                    onChange={(value) => setContentType(value as BottleContentType)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    label="Date"
                    value={bottleDate}
                    onChange={(e) => setBottleDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    label="Time"
                    value={bottleTime}
                    onChange={(e) => setBottleTime(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    label="Volume"
                    value={bottleVolume}
                    onChange={(e) => setBottleVolume(e.target.value)}
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
                      value={bottleVolumeUnit}
                      onChange={(value) => setBottleVolumeUnit(value as VolumeUnit)}
                      size="sm"
                    />
                  </div>
                </div>
                <BabyMoodSelector
                  label="Baby's mood"
                  value={babyMood}
                  onChange={setBabyMood}
                />
              </>
            )}

            {/* Play fields */}
            {sessionType === 'play' && (
              <>
                <div className="flex justify-center">
                  <SegmentedControl
                    options={playTypeOptions}
                    value={playType}
                    onChange={(value) => setPlayType(value as PlayType)}
                  />
                </div>
                <Input
                  type="date"
                  label="Date"
                  value={playDate}
                  onChange={(e) => setPlayDate(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="time"
                    label="Start Time"
                    value={playStartTime}
                    onChange={(e) => setPlayStartTime(e.target.value)}
                  />
                  <Input
                    type="time"
                    label="End Time"
                    value={playEndTime}
                    onChange={(e) => setPlayEndTime(e.target.value)}
                  />
                </div>
                <BabyMoodSelector
                  label="Baby's mood"
                  value={babyMood}
                  onChange={setBabyMood}
                />
              </>
            )}

            {/* Walk fields */}
            {sessionType === 'walk' && (
              <>
                <div className="flex items-center justify-center gap-2 py-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#8bc34a20' }}
                  >
                    <Footprints className="w-5 h-5" style={{ color: '#8bc34a' }} />
                  </div>
                  <span className="font-medium text-gray-700">Walk</span>
                </div>
                <Input
                  type="date"
                  label="Date"
                  value={walkDate}
                  onChange={(e) => setWalkDate(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="time"
                    label="Start Time"
                    value={walkStartTime}
                    onChange={(e) => setWalkStartTime(e.target.value)}
                  />
                  <Input
                    type="time"
                    label="End Time"
                    value={walkEndTime}
                    onChange={(e) => setWalkEndTime(e.target.value)}
                  />
                </div>
                <BabyMoodSelector
                  label="Baby's mood"
                  value={babyMood}
                  onChange={setBabyMood}
                />
              </>
            )}

            {/* Notes field (common to all) */}
            <Textarea
              label="Notes (optional)"
              placeholder="Any notes about this session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={saving}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
