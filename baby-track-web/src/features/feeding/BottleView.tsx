import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isToday, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Select';
import { BabyMoodSelector } from '@/components/ui/MoodSelector';
import { Baby, BottleSession, BottleContentType, BabyMood, MilkStash, VolumeUnit, BOTTLE_CONTENT_CONFIG, convertVolume, getBabyAccessUserIds, getRoomTempExpirationMinutes } from '@/types';
import { createBottleSession, createBottleSessionFromMilkStash, subscribeToBottleSessions, subscribeToMilkStash, migrateMilkStashToBaby } from '@/lib/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/stores/toastStore';
import { clsx } from 'clsx';
import { Milk, Plus, Zap, Edit3 } from 'lucide-react';

type EntryMode = 'quick' | 'manual';

interface BottleViewProps {
  baby: Baby;
}

export function BottleView({ baby }: BottleViewProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings } = useAppStore();
  const [sessions, setSessions] = useState<BottleSession[]>([]);
  const [milkStash, setMilkStash] = useState<MilkStash[]>([]);

  // Default to formula if feeding preference is formula
  const getInitialContentType = (): BottleContentType => {
    if (settings?.feedingTypePreference === 'formula') {
      return 'formula';
    }
    return 'breastMilk';
  };
  const [contentType, setContentType] = useState<BottleContentType>(getInitialContentType);
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(settings?.preferredVolumeUnit || 'oz');
  const [notes, setNotes] = useState('');
  const [babyMood, setBabyMood] = useState<BabyMood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('quick');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));
  const [selectedMilkStashId, setSelectedMilkStashId] = useState<string | null>(null);

  const entryModeOptions = useMemo(
    () => [
      { value: 'quick', label: t('diaperScreen.quick'), icon: <Zap className="w-4 h-4" /> },
      { value: 'manual', label: t('common.manual'), icon: <Edit3 className="w-4 h-4" /> },
    ],
    [t]
  );

  const contentOptions = useMemo(
    () => [
      { value: 'breastMilk', label: t('activity.breastMilk'), color: BOTTLE_CONTENT_CONFIG.breastMilk.color },
      { value: 'formula', label: t('activity.formula'), color: BOTTLE_CONTENT_CONFIG.formula.color },
      { value: 'mixed', label: t('activity.mixed'), color: BOTTLE_CONTENT_CONFIG.mixed.color },
    ],
    [t]
  );

  const getContentTypeLabel = (type: BottleContentType) => {
    if (type === 'breastMilk') return t('activity.breastMilk');
    if (type === 'formula') return t('activity.formula');
    return t('activity.mixed');
  };

  // Subscribe to sessions
  useEffect(() => {
    const unsubscribe = subscribeToBottleSessions(baby.id, setSessions);
    return () => unsubscribe();
  }, [baby.id]);

  useEffect(() => {
    if (!user) {
      setMilkStash([]);
      return;
    }

    migrateMilkStashToBaby(user.uid, baby.id).catch((error) => {
      console.error('Error migrating milk stash:', error);
    });

    const unsubscribe = subscribeToMilkStash(baby.id, setMilkStash, getBabyAccessUserIds(baby));
    return () => unsubscribe();
  }, [user, baby]);

  useEffect(() => {
    if (settings?.preferredVolumeUnit) {
      setVolumeUnit(settings.preferredVolumeUnit);
    }
  }, [settings?.preferredVolumeUnit]);

  // Update content type when feeding preference changes
  useEffect(() => {
    if (settings?.feedingTypePreference === 'formula') {
      setContentType('formula');
    }
  }, [settings?.feedingTypePreference]);

  useEffect(() => {
    if (contentType !== 'breastMilk' && selectedMilkStashId) {
      setSelectedMilkStashId(null);
    }
  }, [contentType, selectedMilkStashId]);

  const availableBreastMilk = useMemo(
    () => milkStash.filter((item) => {
      if (item.location !== 'fridge' || item.isUsed) {
        return false;
      }

      if (!item.isInUse) {
        return true;
      }

      return !item.inUseStartDate || getRoomTempExpirationMinutes(item.inUseStartDate) > 0;
    }),
    [milkStash]
  );

  useEffect(() => {
    if (selectedMilkStashId && !availableBreastMilk.some((item) => item.id === selectedMilkStashId)) {
      setSelectedMilkStashId(null);
    }
  }, [availableBreastMilk, selectedMilkStashId]);

  const handleQuickAdd = (quickVolume: number) => {
    setVolume(quickVolume.toString());
    setShowForm(true);
  };

  const handleUseAllMilk = (item: MilkStash) => {
    const fullVolume = convertVolume(item.volume, item.volumeUnit, volumeUnit);
    setSelectedMilkStashId(item.id);
    setVolume(Number(fullVolume.toFixed(4)).toString());
    if (entryMode === 'quick') {
      setShowForm(true);
    }
  };

  const handleSave = async () => {
    if (!user || !volume) return;

    const volumeValue = parseFloat(volume);
    const maxVolume = volumeUnit === 'ml' ? 500 : 50;
    if (isNaN(volumeValue) || volumeValue <= 0 || volumeValue > maxVolume) {
      toast.error(t('validation.validVolumeRange', { min: '0.1', max: maxVolume, unit: volumeUnit }));
      return;
    }

    const savedVolume = parseFloat(volume);
    const savedUnit = volumeUnit;
    const selectedMilkStash = selectedMilkStashId
      ? availableBreastMilk.find((item) => item.id === selectedMilkStashId) ?? null
      : null;

    if (selectedMilkStash && contentType === 'breastMilk') {
      const availableVolume = convertVolume(selectedMilkStash.volume, selectedMilkStash.volumeUnit, volumeUnit);
      if (savedVolume > availableVolume + 0.0001) {
        toast.error(t('bottleScreen.selectedBottleAvailable', {
          volume: availableVolume.toFixed(1),
          unit: volumeUnit,
        }));
        return;
      }
    }

    // Determine timestamp based on entry mode
    const timestamp = entryMode === 'manual'
      ? new Date(`${manualDate}T${manualTime}`).toISOString()
      : new Date().toISOString();

    setSaving(true);
    try {
      const bottleInput = {
        timestamp,
        volume: savedVolume,
        volumeUnit,
        contentType,
        milkStashId: contentType === 'breastMilk' ? selectedMilkStashId : null,
        notes: notes || null,
        babyMood,
      };

      if (selectedMilkStash && contentType === 'breastMilk') {
        await createBottleSessionFromMilkStash(baby.id, user.uid, {
          ...bottleInput,
          milkStashId: selectedMilkStash.id,
        });
      } else {
        await createBottleSession(baby.id, user.uid, bottleInput);
      }

      // Reset form only on success
      setVolume('');
      setNotes('');
      setBabyMood(null);
      setShowForm(false);
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualTime(format(new Date(), 'HH:mm'));
      setSelectedMilkStashId(null);

      toast.success(t('bottleScreen.logged', { volume: savedVolume, unit: savedUnit }));
    } catch (error) {
      console.error('Error saving bottle session:', error);
      toast.error(t('bottleScreen.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setVolume('');
    setNotes('');
    setBabyMood(null);
    setShowForm(false);
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualTime(format(new Date(), 'HH:mm'));
    setSelectedMilkStashId(null);
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
      {/* Entry Mode Toggle */}
      {!showForm && (
        <div className="flex justify-center">
          <SegmentedControl
            options={entryModeOptions}
            value={entryMode}
            onChange={(value) => setEntryMode(value as EntryMode)}
          />
        </div>
      )}

      {/* Content Type Selector */}
      <div className="flex justify-center">
        <SegmentedControl
          options={contentOptions}
          value={contentType}
          onChange={(value) => setContentType(value as BottleContentType)}
        />
      </div>

      {/* Quick Add Buttons */}
      {!showForm && entryMode === 'quick' && (
        <>
          <Card>
            <CardHeader title={t('bottleScreen.quickAdd')} subtitle={t('bottleScreen.tapToLog')} />
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
                <p className="text-xs text-gray-500 mt-1">{t('bottleScreen.custom')}</p>
              </button>
            </div>
          </Card>

          {contentType === 'breastMilk' && (
            <FridgeMilkPicker
              stash={availableBreastMilk}
              volumeUnit={volumeUnit}
              selectedMilkStashId={selectedMilkStashId}
              onSelect={setSelectedMilkStashId}
              onUseAll={handleUseAllMilk}
            />
          )}
        </>
      )}

      {/* Manual Entry Mode */}
      {!showForm && entryMode === 'manual' && (
        <Card>
          <CardHeader
            title={t('bottleScreen.logPastFeeding')}
            subtitle={getContentTypeLabel(contentType)}
          />

          <div className="space-y-4">
            <Input
              type="date"
              label={t('common.date')}
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
            <Input
              type="time"
              label={t('common.time')}
              value={manualTime}
              onChange={(e) => setManualTime(e.target.value)}
            />

            <div className="flex gap-3">
              <Input
                type="number"
                label={t('form.volume')}
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

            {contentType === 'breastMilk' && (
              <FridgeMilkPicker
                stash={availableBreastMilk}
                volumeUnit={volumeUnit}
                selectedMilkStashId={selectedMilkStashId}
                onSelect={setSelectedMilkStashId}
                onUseAll={handleUseAllMilk}
              />
            )}

            <BabyMoodSelector
              label={t('form.babyMood')}
              value={babyMood}
              onChange={setBabyMood}
            />

            <Textarea
              label={t('form.notesOptional')}
              placeholder={t('feedingScreen.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <Button onClick={handleSave} className="w-full" disabled={!volume || saving}>
              {saving ? t('common.saving') : t('bottleScreen.saveFeeding')}
            </Button>
          </div>
        </Card>
      )}

      {/* Entry Form (Quick mode) */}
      {showForm && entryMode === 'quick' && (
        <Card>
          <CardHeader
            title={t('bottleScreen.logBottleFeeding')}
            subtitle={getContentTypeLabel(contentType)}
          />

          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                type="number"
                label={t('form.volume')}
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

            {contentType === 'breastMilk' && (
              <FridgeMilkPicker
                stash={availableBreastMilk}
                volumeUnit={volumeUnit}
                selectedMilkStashId={selectedMilkStashId}
                onSelect={setSelectedMilkStashId}
                onUseAll={handleUseAllMilk}
              />
            )}

            <BabyMoodSelector
              label={t('form.babyMood')}
              value={babyMood}
              onChange={setBabyMood}
            />

            <Textarea
              label={t('form.notesOptional')}
              placeholder={t('feedingScreen.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={!volume || saving}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary-600">{todaySessions.length}</p>
          <p className="text-sm text-gray-500">{t('bottleScreen.feedingsToday')}</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary-600">
            {todayTotalVolume.toFixed(1)} {volumeUnit}
          </p>
          <p className="text-sm text-gray-500">{t('bottleScreen.totalVolume')}</p>
        </Card>
      </div>

    </div>
  );
}

function FridgeMilkPicker({
  stash,
  volumeUnit,
  selectedMilkStashId,
  onSelect,
  onUseAll,
}: {
  stash: MilkStash[];
  volumeUnit: VolumeUnit;
  selectedMilkStashId: string | null;
  onSelect: (id: string | null) => void;
  onUseAll: (item: MilkStash) => void;
}) {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.resolvedLanguage === 'he' || i18n.language === 'he';
  const dateLocale = isHebrew ? he : undefined;
  const compactDateTimeFormat = isHebrew ? 'd MMM, HH:mm' : 'MMM d, h:mm a';
  const compactDateFormat = isHebrew ? 'd MMM' : 'MMM d';
  const totalVolume = stash.reduce((sum, item) => sum + convertVolume(item.volume, item.volumeUnit, volumeUnit), 0);
  const selectedMilkStash = stash.find((item) => item.id === selectedMilkStashId) ?? null;

  return (
    <Card className="border border-blue-100 bg-blue-50/50">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-medium text-blue-900">{t('bottleScreen.availableBreastMilk')}</p>
          <p className="text-xs text-blue-700 mt-1">
            {t('bottleScreen.bottlesAvailable', {
              count: stash.length,
              plural: isHebrew
                ? stash.length === 1 ? '' : 'ים'
                : stash.length === 1 ? '' : 's',
              volume: totalVolume.toFixed(1),
              unit: volumeUnit,
            })}
          </p>
        </div>
        <Milk className="w-5 h-5 text-blue-500 shrink-0" />
      </div>

      {stash.length === 0 ? (
        <p className="text-sm text-blue-700">
          {t('bottleScreen.noAvailableMilk')}
        </p>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={clsx(
              'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
              selectedMilkStashId === null
                ? 'border-blue-500 bg-white text-blue-900'
                : 'border-blue-100 bg-white/70 text-blue-800 hover:border-blue-300'
            )}
          >
            {t('bottleScreen.doNotLink')}
          </button>

          {stash.map((item) => {
            const displayVolume = convertVolume(item.volume, item.volumeUnit, volumeUnit);
            const isSelected = selectedMilkStashId === item.id;
            const pumpedDateLabel = format(
              parseISO(item.pumpedDate),
              item.pumpedDate.includes('T') ? compactDateTimeFormat : compactDateFormat,
              { locale: dateLocale }
            );
            const roomTempMinutesLeft = item.isInUse && item.inUseStartDate
              ? Math.floor(getRoomTempExpirationMinutes(item.inUseStartDate))
              : null;
            const roomTempLabel = roomTempMinutesLeft === null
              ? null
              : t('bottleScreen.timeLeft', {
                  hours: Math.floor(roomTempMinutesLeft / 60),
                  minutes: roomTempMinutesLeft % 60,
                });

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={clsx(
                  'w-full rounded-xl border px-3 py-3 text-left transition-all',
                  isSelected
                    ? 'border-blue-500 bg-white shadow-sm'
                    : 'border-blue-100 bg-white/70 hover:border-blue-300'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {displayVolume.toFixed(1)} {volumeUnit}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('bottleScreen.pumped', { date: pumpedDateLabel })}
                    </p>
                    {item.isInUse && (
                      <p className="mt-1 text-xs font-medium text-amber-600">
                        {t('bottleScreen.onTheGo')}{roomTempLabel ? ` • ${roomTempLabel}` : ''}
                      </p>
                    )}
                  </div>
                  <div
                    className={clsx(
                      'w-4 h-4 rounded-full border-2',
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-blue-200 bg-white'
                    )}
                  />
                </div>
              </button>
            );
          })}

          {selectedMilkStash && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-blue-200 text-blue-800 hover:border-blue-300 hover:bg-blue-50"
              onClick={() => onUseAll(selectedMilkStash)}
            >
              <Milk className="w-4 h-4 mr-2" />
              {t('bottleScreen.useAll', {
                volume: convertVolume(
                  selectedMilkStash.volume,
                  selectedMilkStash.volumeUnit,
                  volumeUnit
                ).toFixed(1),
                unit: volumeUnit,
              })}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
