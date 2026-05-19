import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { useHomeStore } from '@/stores/homeStore';
import { prefetchHomeData } from '@/features/dashboard/homeDataSync';
import { createMedicine, createMedicineLog, subscribeToMedicineLogs, updateMedicine } from '@/lib/firestore';
import type { Medicine, MedicineLog } from '@/types';
import { MedicationFrequency, MEDICATION_FREQUENCY_CONFIG } from '@/types/enums';
import {
  AlertTriangle,
  Check,
  Clock,
  History,
  Pill,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from '@/stores/toastStore';
import {
  getMedicationTrackerStatus,
  type MedicationTrackerStatus,
} from './medicationTracker';

function formatMinutesAsDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.ceil(totalMinutes));
  if (minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function formatIntervalHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function formatDoseDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getBlockedDoseMessage(status: MedicationTrackerStatus): string {
  if (status.reason === 'dailyLimit') {
    return 'Maximum doses for today already given';
  }

  if (status.reason === 'interval') {
    return `Wait ${formatMinutesAsDuration(status.remainingMinutes)} before the next dose`;
  }

  if (status.reason === 'missingInterval') {
    return 'Add a valid hours interval before logging this medicine';
  }

  if (status.reason === 'inactive') {
    return 'Activate this medicine before logging a dose';
  }

  return 'This dose cannot be logged yet';
}

export function MedicineView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const medicines = useHomeStore((state) => state.medicines);
  const medicineLogs = useHomeStore((state) => state.medicineLogs);
  const addOptimisticMedicineLog = useHomeStore((state) => state.addOptimisticMedicineLog);
  const removeMedicineLog = useHomeStore((state) => state.removeMedicineLog);
  const updateMedicineOptimistically = useHomeStore((state) => state.updateMedicineOptimistically);
  const [showForm, setShowForm] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Reminder modal state
  const [showReminder, setShowReminder] = useState(false);
  // Track the date when reminder was last shown (fixes midnight reset bug)
  const [lastReminderDate, setLastReminderDate] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('asNeeded');
  const [hoursInterval, setHoursInterval] = useState('');
  const [instructions, setInstructions] = useState('');

  // Check if all active medicine logs have been loaded
  const allLogsLoaded = medicines
    .filter((medicine) => medicine.isActive)
    .every((medicine) => medicineLogs[medicine.id] !== undefined);

  const selectedMedicine = selectedMedicineId
    ? medicines.find((medicine) => medicine.id === selectedMedicineId) || null
    : null;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  const getTrackerStatus = useCallback((medicine: Medicine) => {
    return getMedicationTrackerStatus(medicine, medicineLogs[medicine.id] || [], now);
  }, [medicineLogs, now]);

  // Helper to get medicines that still need doses today
  const getMissedMedicines = useCallback((): Medicine[] => {
    const activeMeds = medicines.filter(m => m.isActive && m.frequency !== 'asNeeded');
    const missed: Medicine[] = [];
    const reminderCheckTime = new Date();

    activeMeds.forEach((medicine) => {
      const logs = medicineLogs[medicine.id] || [];
      const status = getMedicationTrackerStatus(medicine, logs, reminderCheckTime);
      if (status.canGive) {
        missed.push(medicine);
      }
    });

    return missed;
  }, [medicines, medicineLogs]);

  // Check for missed medicines at 9 PM
  useEffect(() => {
    // Don't check until all logs are loaded to avoid false positives
    if (!allLogsLoaded) return;

    const checkMissedMedicines = () => {
      const now = new Date();
      const hour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];

      // Only show reminder at 9 PM (21:00) or later, and only once per day
      if (hour >= 21 && lastReminderDate !== todayStr) {
        const missed = getMissedMedicines();

        if (missed.length > 0) {
          setShowReminder(true);
          setLastReminderDate(todayStr);
        }
      }
    };

    // Check immediately once logs are loaded
    checkMissedMedicines();

    // Check every minute
    const interval = setInterval(checkMissedMedicines, 60 * 1000);

    return () => clearInterval(interval);
  }, [allLogsLoaded, lastReminderDate, getMissedMedicines]);

  // Compute current missed medicines dynamically (for the modal)
  const currentMissedMedicines = showReminder ? getMissedMedicines() : [];

  // Auto-close modal when all medicines are given
  useEffect(() => {
    if (showReminder && currentMissedMedicines.length === 0) {
      setShowReminder(false);
    }
  }, [showReminder, currentMissedMedicines.length]);

  // Helper to check if a medicine can receive a dose
  const canGiveDose = useCallback((medicine: Medicine): boolean => {
    return getTrackerStatus(medicine).canGive;
  }, [getTrackerStatus]);

  const everyHoursIntervalInvalid =
    frequency === 'everyHours' &&
    (!hoursInterval || Number.isNaN(Number(hoursInterval)) || Number(hoursInterval) <= 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby || !name.trim()) return;

    // Validate hoursInterval for everyHours frequency
    if (frequency === 'everyHours') {
      const parsedInterval = Number(hoursInterval);
      if (!hoursInterval || isNaN(parsedInterval) || parsedInterval <= 0) {
        toast.error('Please enter a valid hours interval (e.g., 4, 6, 8)');
        return;
      }
    }

    setLoading(true);
    try {
      // Safely parse hoursInterval with NaN check
      const parsedHoursInterval = hoursInterval ? Number(hoursInterval) : null;
      const validHoursInterval = parsedHoursInterval !== null && !isNaN(parsedHoursInterval) && parsedHoursInterval > 0
        ? parsedHoursInterval
        : null;

      await createMedicine(selectedBaby.id, user.uid, {
        name: name.trim(),
        dosage: dosage || '',
        frequency,
        hoursInterval: validHoursInterval,
        instructions: instructions || null,
      });
      prefetchHomeData({ userId: user.uid, babyId: selectedBaby.id });

      setName('');
      setDosage('');
      setFrequency('asNeeded');
      setHoursInterval('');
      setInstructions('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding medicine:', error);
      toast.error('Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  const handleGiveMedicine = async (medicine: Medicine) => {
    if (!user || !selectedBaby) return;

    // Check if dose can be given
    const doseTime = new Date();
    const status = getMedicationTrackerStatus(medicine, medicineLogs[medicine.id] || [], doseTime);
    if (!status.canGive) {
      toast.error(getBlockedDoseMessage(status));
      return;
    }

    const timestamp = doseTime.toISOString();
    const optimisticLogId = `optimistic-medicine-log-${medicine.id}-${Date.now()}`;

    addOptimisticMedicineLog(medicine.id, {
      id: optimisticLogId,
      medicineId: medicine.id,
      babyId: selectedBaby.id,
      userId: user.uid,
      timestamp,
      givenBy: null,
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    try {
      await createMedicineLog(medicine.id, selectedBaby.id, user.uid, {
        timestamp,
      });
      prefetchHomeData({ userId: user.uid, babyId: selectedBaby.id });
      toast.success(`${medicine.name} dose logged`);
    } catch (error) {
      removeMedicineLog(medicine.id, optimisticLogId);
      console.error('Error logging medicine:', error);
      toast.error('Failed to log dose');
    }
  };

  const handleToggleActive = async (medicine: Medicine) => {
    const nextIsActive = !medicine.isActive;
    updateMedicineOptimistically(medicine.id, { isActive: nextIsActive });

    try {
      await updateMedicine(medicine.id, { isActive: nextIsActive });
      if (user && selectedBaby) {
        prefetchHomeData({ userId: user.uid, babyId: selectedBaby.id });
      }
    } catch (error) {
      updateMedicineOptimistically(medicine.id, { isActive: medicine.isActive });
      console.error('Error toggling medicine:', error);
      toast.error('Failed to update medicine');
    }
  };

  const activeMedicines = medicines.filter(m => m.isActive);
  const inactiveMedicines = medicines.filter(m => !m.isActive);

  if (!selectedBaby) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please select a baby first
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Medicine"
        showBabySwitcher={false}
        rightAction={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Add Form */}
        {showForm && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Add Medicine</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Medicine Name"
                placeholder="e.g., Tylenol, Vitamin D"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Dosage"
                placeholder="e.g., 5ml, 1 dropper"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(MEDICATION_FREQUENCY_CONFIG) as MedicationFrequency[]).map((freq) => {
                    const config = MEDICATION_FREQUENCY_CONFIG[freq];
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setFrequency(freq)}
                        className={clsx(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          frequency === freq
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {frequency === 'everyHours' && (
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  label="Hours Interval"
                  placeholder="e.g., 4, 6, 8"
                  value={hoursInterval}
                  onChange={(e) => setHoursInterval(e.target.value)}
                  error={everyHoursIntervalInvalid ? 'Enter the minimum safe gap between doses.' : undefined}
                />
              )}

              <Input
                label="Instructions (optional)"
                placeholder="Special instructions..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !name.trim() || everyHoursIntervalInvalid}
              >
                {loading ? 'Saving...' : 'Add Medicine'}
              </Button>
            </form>
          </Card>
        )}

        {/* Medicine Detail */}
        {selectedMedicine && (
          <MedicineDetail
            medicine={selectedMedicine}
            now={now}
            onClose={() => setSelectedMedicineId(null)}
            onGive={() => handleGiveMedicine(selectedMedicine)}
          />
        )}

        {/* Active Medicines */}
        {activeMedicines.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Active ({activeMedicines.length})</h3>
            <div className="space-y-2">
              {activeMedicines.map((medicine) => {
                const trackerStatus = getTrackerStatus(medicine);

                return (
                  <MedicineCard
                    key={medicine.id}
                    medicine={medicine}
                    onGive={() => handleGiveMedicine(medicine)}
                    onToggleActive={() => handleToggleActive(medicine)}
                    onSelect={() => setSelectedMedicineId(medicine.id)}
                    trackerStatus={trackerStatus}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Inactive Medicines */}
        {inactiveMedicines.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-500 mb-2">Inactive ({inactiveMedicines.length})</h3>
            <div className="space-y-2">
              {inactiveMedicines.map((medicine) => (
                <MedicineCard
                  key={medicine.id}
                  medicine={medicine}
                  onToggleActive={() => handleToggleActive(medicine)}
                  onSelect={() => setSelectedMedicineId(medicine.id)}
                  inactive
                />
              ))}
            </div>
          </div>
        )}

        {medicines.length === 0 && !showForm && (
          <Card className="text-center py-8">
            <Pill className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No medicines added</p>
            <p className="text-sm text-gray-400">Tap + to add one</p>
          </Card>
        )}

        {/* Medicine Reminder Modal */}
        {showReminder && currentMissedMedicines.length > 0 && (
          <MedicineReminderModal
            medicines={currentMissedMedicines}
            getTrackerStatus={getTrackerStatus}
            onDismiss={() => setShowReminder(false)}
            onAddMedicine={() => {
              setShowReminder(false);
              setShowForm(true);
            }}
            onGive={(medicine) => {
              // Check if can give dose before proceeding
              if (!canGiveDose(medicine)) {
                return;
              }
              handleGiveMedicine(medicine);
              // Modal will auto-update since currentMissedMedicines is computed dynamically
            }}
          />
        )}
      </div>
    </div>
  );
}

function MedicineCard({
  medicine,
  onGive,
  onToggleActive,
  onSelect,
  inactive,
  trackerStatus,
}: {
  medicine: Medicine;
  onGive?: () => void;
  onToggleActive: () => void;
  onSelect: () => void;
  inactive?: boolean;
  trackerStatus?: MedicationTrackerStatus;
}) {
  const freqConfig = MEDICATION_FREQUENCY_CONFIG[medicine.frequency];
  const canGive = trackerStatus?.canGive ?? true;
  const buttonLabel = canGive ? 'Give' : trackerStatus?.reason === 'dailyLimit' ? 'Done' : 'Wait';

  return (
    <Card className={clsx('py-3', inactive && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <button type="button" className="flex-1 text-left min-w-0" onClick={onSelect}>
          <p className="font-medium text-gray-900">{medicine.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {medicine.dosage && (
              <span className="text-sm text-gray-500">{medicine.dosage}</span>
            )}
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
              {freqConfig.label}
            </span>
            {!inactive && trackerStatus?.intervalHours !== null && trackerStatus?.intervalHours !== undefined && (
              <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                Every {formatIntervalHours(trackerStatus.intervalHours)}
              </span>
            )}
            {!inactive && trackerStatus?.maxDosesToday != null && (
              <span
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-full',
                  trackerStatus.dosesToday >= trackerStatus.maxDosesToday
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                )}
              >
                {trackerStatus.dosesToday}/{trackerStatus.maxDosesToday} today
              </span>
            )}
            {!inactive && trackerStatus?.reason === 'interval' && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                Wait {formatMinutesAsDuration(trackerStatus.remainingMinutes)}
              </span>
            )}
            {!inactive && trackerStatus?.reason === 'missingInterval' && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                Interval needed
              </span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-2">
          {!inactive && onGive && (
            <Button
              size="sm"
              onClick={onGive}
              disabled={!canGive}
              className={clsx(!canGive && 'opacity-50 cursor-not-allowed')}
            >
              <Check className="w-4 h-4 mr-1" />
              {buttonLabel}
            </Button>
          )}
          <button
            onClick={onToggleActive}
            className="p-2 text-gray-400 hover:text-gray-600 text-xs"
          >
            {inactive ? 'Activate' : 'Deactivate'}
          </button>
        </div>
      </div>
      {!inactive && trackerStatus && (
        <button
          type="button"
          onClick={onSelect}
          className="mt-3 grid w-full grid-cols-2 gap-2 text-left"
        >
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase text-gray-400">Last dose</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
              {trackerStatus.lastDoseAt ? formatDoseDateTime(trackerStatus.lastDoseAt) : 'None logged'}
            </p>
          </div>
          <div
            className={clsx(
              'rounded-xl px-3 py-2',
              trackerStatus.canGive
                ? 'bg-green-50'
                : trackerStatus.reason === 'dailyLimit'
                  ? 'bg-blue-50'
                  : 'bg-amber-50'
            )}
          >
            <p
              className={clsx(
                'text-[11px] font-semibold uppercase',
                trackerStatus.canGive
                  ? 'text-green-600'
                  : trackerStatus.reason === 'dailyLimit'
                    ? 'text-blue-600'
                    : 'text-amber-600'
              )}
            >
              {trackerStatus.canGive ? 'Safe now' : 'Next safe'}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
              {trackerStatus.canGive
                ? 'Ready to give'
                : trackerStatus.nextDoseAt
                  ? formatDoseDateTime(trackerStatus.nextDoseAt)
                  : trackerStatus.reason === 'dailyLimit'
                    ? 'Tomorrow'
                    : 'Interval needed'}
            </p>
          </div>
        </button>
      )}
    </Card>
  );
}

function MedicineReminderModal({
  medicines,
  getTrackerStatus,
  onDismiss,
  onGive,
  onAddMedicine,
}: {
  medicines: Medicine[];
  getTrackerStatus: (medicine: Medicine) => MedicationTrackerStatus;
  onDismiss: () => void;
  onGive: (medicine: Medicine) => void;
  onAddMedicine: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Medicine Reminder</h3>
            <p className="text-sm text-gray-500">Don't forget to give:</p>
          </div>
        </div>

        {/* Medicines list */}
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {medicines.map((medicine) => {
            const freqConfig = MEDICATION_FREQUENCY_CONFIG[medicine.frequency];
            const trackerStatus = getTrackerStatus(medicine);
            const canGive = trackerStatus.canGive;

            return (
              <div
                key={medicine.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{medicine.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {medicine.dosage && (
                      <span className="text-xs text-gray-500">{medicine.dosage}</span>
                    )}
                    <span className="text-xs text-gray-400">{freqConfig.label}</span>
                    {trackerStatus.maxDosesToday !== null && (
                      <span className={clsx(
                        'text-xs px-1.5 py-0.5 rounded',
                        trackerStatus.dosesToday >= trackerStatus.maxDosesToday ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {trackerStatus.dosesToday}/{trackerStatus.maxDosesToday}
                      </span>
                    )}
                    {trackerStatus.reason === 'interval' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        Wait {formatMinutesAsDuration(trackerStatus.remainingMinutes)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onGive(medicine)}
                  disabled={!canGive}
                  className={clsx(!canGive && 'opacity-50 cursor-not-allowed')}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {canGive ? 'Give' : trackerStatus.reason === 'dailyLimit' ? 'Done' : 'Wait'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={onAddMedicine}>
            <Plus className="w-4 h-4 mr-1" />
            Add New Medicine
          </Button>
          <Button variant="ghost" className="w-full text-gray-500" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MedicineDetail({
  medicine,
  now,
  onClose,
  onGive,
}: {
  medicine: Medicine;
  now: Date;
  onClose: () => void;
  onGive: () => void;
}) {
  const [logs, setLogs] = useState<MedicineLog[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToMedicineLogs(medicine.id, (data) => {
      setLogs(data);
    });

    return () => unsubscribe();
  }, [medicine.id]);

  const freqConfig = MEDICATION_FREQUENCY_CONFIG[medicine.frequency];
  const trackerStatus = getMedicationTrackerStatus(medicine, logs, now);
  const canGive = trackerStatus.canGive;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{medicine.name}</h3>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {medicine.dosage && (
          <div className="flex justify-between">
            <span className="text-gray-500">Dosage</span>
            <span className="font-medium">{medicine.dosage}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Frequency</span>
          <span className="font-medium">{freqConfig.label}</span>
        </div>
        {trackerStatus.intervalHours !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Required gap</span>
            <span className="font-medium">{formatIntervalHours(trackerStatus.intervalHours)}</span>
          </div>
        )}
        {trackerStatus.maxDosesToday !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Today</span>
            <span
              className={clsx(
                'font-medium',
                trackerStatus.dosesToday >= trackerStatus.maxDosesToday ? 'text-green-600' : 'text-blue-600'
              )}
            >
              {trackerStatus.dosesToday}/{trackerStatus.maxDosesToday} doses
            </span>
          </div>
        )}
        {medicine.instructions && (
          <div>
            <span className="text-gray-500">Instructions</span>
            <p className="text-sm mt-1">{medicine.instructions}</p>
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            Last dose
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {trackerStatus.lastDoseAt ? formatDoseDateTime(trackerStatus.lastDoseAt) : 'None logged'}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            Time elapsed
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {trackerStatus.elapsedMinutes !== null
              ? formatMinutesAsDuration(trackerStatus.elapsedMinutes)
              : 'No dose yet'}
          </p>
        </div>
        <div
          className={clsx(
            'rounded-xl p-3',
            trackerStatus.canGive ? 'bg-green-50' : 'bg-amber-50'
          )}
        >
          <div
            className={clsx(
              'flex items-center gap-1.5 text-[11px] font-semibold uppercase',
              trackerStatus.canGive ? 'text-green-600' : 'text-amber-600'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Status
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {trackerStatus.canGive
              ? 'Safe to give'
              : trackerStatus.reason === 'dailyLimit'
                ? 'Done today'
                : trackerStatus.reason === 'missingInterval'
                  ? 'Interval needed'
                  : `Wait ${formatMinutesAsDuration(trackerStatus.remainingMinutes)}`}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Next safe
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {trackerStatus.canGive
              ? 'Now'
              : trackerStatus.nextDoseAt
                ? formatDoseDateTime(trackerStatus.nextDoseAt)
                : trackerStatus.reason === 'dailyLimit'
                  ? 'Tomorrow'
                  : 'Set interval'}
          </p>
        </div>
      </div>

      {!canGive && trackerStatus.reason === 'interval' && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg text-center">
          <p className="text-sm text-amber-700">
            Next dose is safe at {trackerStatus.nextDoseAt ? formatDoseDateTime(trackerStatus.nextDoseAt) : 'the scheduled time'}.
          </p>
        </div>
      )}

      {!canGive && trackerStatus.reason === 'dailyLimit' && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg text-center">
          <p className="text-sm text-green-700">
            All doses for today have been given
          </p>
        </div>
      )}

      {!canGive && trackerStatus.reason === 'missingInterval' && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg text-center">
          <p className="text-sm text-red-700">
            This medicine needs a valid hours interval before the tracker can verify the next safe dose.
          </p>
        </div>
      )}

      <Button
        className={clsx('w-full mb-4', !canGive && 'opacity-50 cursor-not-allowed')}
        onClick={onGive}
        disabled={!canGive}
      >
        <Check className="w-4 h-4 mr-2" />
        {canGive ? 'Give Now' : trackerStatus.reason === 'dailyLimit' ? 'Complete' : 'Wait'}
      </Button>

      <div>
        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
          <History className="w-4 h-4" />
          History
        </h4>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">No doses logged yet</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex justify-between text-sm py-1 border-b border-gray-100">
                <span className="text-gray-500">
                  {formatDoseDateTime(log.timestamp)}
                </span>
                {log.givenBy && <span className="text-gray-700">{log.givenBy}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
