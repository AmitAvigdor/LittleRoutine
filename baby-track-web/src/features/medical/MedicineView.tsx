import { useState, useEffect, useCallback } from 'react';
import { isToday, parseISO } from 'date-fns';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createMedicine, subscribeToMedicines, createMedicineLog, subscribeToMedicineLogs, updateMedicine } from '@/lib/firestore';
import type { Medicine, MedicineLog } from '@/types';
import { MedicationFrequency, MEDICATION_FREQUENCY_CONFIG } from '@/types/enums';
import { Pill, Plus, X, Clock, Check, History, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

// Get max doses per day based on frequency
function getMaxDosesPerDay(frequency: MedicationFrequency): number | null {
  switch (frequency) {
    case 'onceDaily':
      return 1;
    case 'twiceDaily':
      return 2;
    case 'threeTimesDaily':
      return 3;
    case 'fourTimesDaily':
      return 4;
    case 'asNeeded':
    case 'everyHours':
      return null; // No daily limit
    default:
      return null;
  }
}

// Check if enough time has passed for everyHours frequency
function canGiveEveryHoursMedicine(logs: MedicineLog[], hoursInterval: number | null | undefined): boolean {
  // Guard against invalid hoursInterval
  if (!hoursInterval || isNaN(hoursInterval) || hoursInterval <= 0) return true;
  if (logs.length === 0) return true;

  const lastLog = logs[0]; // Logs are sorted newest first
  const lastDoseTime = new Date(lastLog.timestamp);
  const now = new Date();
  const hoursSinceLastDose = (now.getTime() - lastDoseTime.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastDose >= hoursInterval;
}

// Get hours until next dose for everyHours frequency
function getHoursUntilNextDose(logs: MedicineLog[], hoursInterval: number | null | undefined): number {
  // Guard against invalid hoursInterval
  if (!hoursInterval || isNaN(hoursInterval) || hoursInterval <= 0) return 0;
  if (logs.length === 0) return 0;

  const lastLog = logs[0];
  const lastDoseTime = new Date(lastLog.timestamp);
  const now = new Date();
  const hoursSinceLastDose = (now.getTime() - lastDoseTime.getTime()) / (1000 * 60 * 60);

  return Math.max(0, hoursInterval - hoursSinceLastDose);
}

export function MedicineView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(false);

  // Track logs for each medicine
  const [medicineLogs, setMedicineLogs] = useState<Record<string, MedicineLog[]>>({});
  // Track which medicines have had their logs loaded
  const [logsLoadedFor, setLogsLoadedFor] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribe = subscribeToMedicines(selectedBaby.id, (data) => {
      setMedicines(data);
    });

    return () => unsubscribe();
  }, [selectedBaby]);

  // Subscribe to logs for all active medicines
  useEffect(() => {
    const activeMeds = medicines.filter(m => m.isActive);
    const unsubscribes: (() => void)[] = [];

    // Reset loaded tracking when medicines change
    setLogsLoadedFor(new Set());

    activeMeds.forEach((medicine) => {
      const unsubscribe = subscribeToMedicineLogs(medicine.id, (logs) => {
        setMedicineLogs((prev) => ({
          ...prev,
          [medicine.id]: logs,
        }));
        setLogsLoadedFor((prev) => new Set([...prev, medicine.id]));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [medicines]);

  // Check if all active medicine logs have been loaded
  const allLogsLoaded = medicines
    .filter(m => m.isActive)
    .every(m => logsLoadedFor.has(m.id));

  // Helper to get medicines that still need doses today
  const getMissedMedicines = useCallback((): Medicine[] => {
    const activeMeds = medicines.filter(m => m.isActive && m.frequency !== 'asNeeded');
    const missed: Medicine[] = [];
    const now = new Date();

    activeMeds.forEach((medicine) => {
      const logs = medicineLogs[medicine.id] || [];
      const todayLogs = logs.filter((log) => isToday(parseISO(log.timestamp)));
      const maxDoses = getMaxDosesPerDay(medicine.frequency);

      if (maxDoses !== null && todayLogs.length < maxDoses) {
        missed.push(medicine);
      } else if (medicine.frequency === 'everyHours' && medicine.hoursInterval) {
        // For everyHours, check if next dose is overdue
        if (todayLogs.length === 0) {
          missed.push(medicine);
        } else {
          const lastDose = todayLogs[0];
          const lastDoseTime = new Date(lastDose.timestamp);
          const hoursSinceLastDose = (now.getTime() - lastDoseTime.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastDose >= medicine.hoursInterval) {
            missed.push(medicine);
          }
        }
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
    const logs = medicineLogs[medicine.id] || [];

    if (medicine.frequency === 'asNeeded') {
      return true;
    }

    if (medicine.frequency === 'everyHours' && medicine.hoursInterval) {
      return canGiveEveryHoursMedicine(logs, medicine.hoursInterval);
    }

    const maxDoses = getMaxDosesPerDay(medicine.frequency);
    if (maxDoses === null) return true;

    const todayLogs = logs.filter((log) => isToday(parseISO(log.timestamp)));
    return todayLogs.length < maxDoses;
  }, [medicineLogs]);

  // Get doses given today for a medicine
  const getDosesToday = useCallback((medicine: Medicine): number => {
    const logs = medicineLogs[medicine.id] || [];
    return logs.filter((log) => isToday(parseISO(log.timestamp))).length;
  }, [medicineLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby || !name.trim()) return;

    // Validate hoursInterval for everyHours frequency
    if (frequency === 'everyHours') {
      const parsedInterval = parseInt(hoursInterval);
      if (!hoursInterval || isNaN(parsedInterval) || parsedInterval <= 0) {
        return;
      }
    }

    setLoading(true);
    try {
      // Safely parse hoursInterval with NaN check
      const parsedHoursInterval = hoursInterval ? parseInt(hoursInterval) : null;
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

      setName('');
      setDosage('');
      setFrequency('asNeeded');
      setHoursInterval('');
      setInstructions('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding medicine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGiveMedicine = async (medicine: Medicine) => {
    if (!user || !selectedBaby) return;

    // Check if dose can be given
    if (!canGiveDose(medicine)) {
      if (medicine.frequency === 'everyHours' && medicine.hoursInterval) {
        const logs = medicineLogs[medicine.id] || [];
        const hoursLeft = getHoursUntilNextDose(logs, medicine.hoursInterval);
        const hours = Math.floor(hoursLeft);
        const minutes = Math.round((hoursLeft - hours) * 60);
      } else {
      }
      return;
    }

    try {
      await createMedicineLog(medicine.id, selectedBaby.id, user.uid, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging medicine:', error);
    }
  };

  const handleToggleActive = async (medicine: Medicine) => {
    try {
      await updateMedicine(medicine.id, { isActive: !medicine.isActive });
    } catch (error) {
      console.error('Error toggling medicine:', error);
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
                  label="Hours Interval"
                  placeholder="e.g., 4, 6, 8"
                  value={hoursInterval}
                  onChange={(e) => setHoursInterval(e.target.value)}
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
                disabled={loading || !name.trim() || (frequency === 'everyHours' && !hoursInterval)}
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
            onClose={() => setSelectedMedicine(null)}
            onGive={() => handleGiveMedicine(selectedMedicine)}
          />
        )}

        {/* Active Medicines */}
        {activeMedicines.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Active ({activeMedicines.length})</h3>
            <div className="space-y-2">
              {activeMedicines.map((medicine) => {
                const canGive = canGiveDose(medicine);
                const dosesToday = getDosesToday(medicine);
                const maxDoses = getMaxDosesPerDay(medicine.frequency);
                const logs = medicineLogs[medicine.id] || [];

                return (
                  <MedicineCard
                    key={medicine.id}
                    medicine={medicine}
                    onGive={() => handleGiveMedicine(medicine)}
                    onToggleActive={() => handleToggleActive(medicine)}
                    onSelect={() => setSelectedMedicine(medicine)}
                    canGive={canGive}
                    dosesToday={dosesToday}
                    maxDoses={maxDoses}
                    hoursUntilNext={
                      medicine.frequency === 'everyHours' && medicine.hoursInterval
                        ? getHoursUntilNextDose(logs, medicine.hoursInterval)
                        : undefined
                    }
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
                  onSelect={() => setSelectedMedicine(medicine)}
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
            canGiveDose={canGiveDose}
            getDosesToday={getDosesToday}
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
  canGive = true,
  dosesToday = 0,
  maxDoses,
  hoursUntilNext,
}: {
  medicine: Medicine;
  onGive?: () => void;
  onToggleActive: () => void;
  onSelect: () => void;
  inactive?: boolean;
  canGive?: boolean;
  dosesToday?: number;
  maxDoses?: number | null;
  hoursUntilNext?: number;
}) {
  const freqConfig = MEDICATION_FREQUENCY_CONFIG[medicine.frequency];

  // Format wait time for everyHours
  const formatWaitTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <Card className={clsx('py-3', inactive && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <div className="flex-1" onClick={onSelect}>
          <p className="font-medium text-gray-900">{medicine.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {medicine.dosage && (
              <span className="text-sm text-gray-500">{medicine.dosage}</span>
            )}
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
              {freqConfig.label}
            </span>
            {/* Show dose progress for scheduled medicines */}
            {!inactive && maxDoses != null && (
              <span
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-full',
                  dosesToday >= maxDoses
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                )}
              >
                {dosesToday}/{maxDoses} today
              </span>
            )}
            {/* Show wait time for everyHours */}
            {!inactive && medicine.frequency === 'everyHours' && hoursUntilNext !== undefined && hoursUntilNext > 0 && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                Wait {formatWaitTime(hoursUntilNext)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!inactive && onGive && (
            <Button
              size="sm"
              onClick={onGive}
              disabled={!canGive}
              className={clsx(!canGive && 'opacity-50 cursor-not-allowed')}
            >
              <Check className="w-4 h-4 mr-1" />
              {canGive ? 'Give' : 'Done'}
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
    </Card>
  );
}

function MedicineReminderModal({
  medicines,
  canGiveDose,
  getDosesToday,
  onDismiss,
  onGive,
  onAddMedicine,
}: {
  medicines: Medicine[];
  canGiveDose: (medicine: Medicine) => boolean;
  getDosesToday: (medicine: Medicine) => number;
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
            const canGive = canGiveDose(medicine);
            const dosesToday = getDosesToday(medicine);
            const maxDoses = getMaxDosesPerDay(medicine.frequency);

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
                    {maxDoses !== null && (
                      <span className={clsx(
                        'text-xs px-1.5 py-0.5 rounded',
                        dosesToday >= maxDoses ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {dosesToday}/{maxDoses}
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
                  {canGive ? 'Give' : 'Done'}
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
  onClose,
  onGive,
}: {
  medicine: Medicine;
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

  // Calculate dose status
  const todayLogs = logs.filter((log) => isToday(parseISO(log.timestamp)));
  const maxDoses = getMaxDosesPerDay(medicine.frequency);

  const canGive = (() => {
    if (medicine.frequency === 'asNeeded') return true;
    if (medicine.frequency === 'everyHours' && medicine.hoursInterval) {
      return canGiveEveryHoursMedicine(logs, medicine.hoursInterval);
    }
    if (maxDoses !== null) {
      return todayLogs.length < maxDoses;
    }
    return true;
  })();

  const hoursUntilNext = medicine.frequency === 'everyHours' && medicine.hoursInterval
    ? getHoursUntilNextDose(logs, medicine.hoursInterval)
    : 0;

  const formatWaitTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

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
        {maxDoses !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Today</span>
            <span
              className={clsx(
                'font-medium',
                todayLogs.length >= maxDoses ? 'text-green-600' : 'text-blue-600'
              )}
            >
              {todayLogs.length}/{maxDoses} doses
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

      {!canGive && medicine.frequency === 'everyHours' && hoursUntilNext > 0 && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg text-center">
          <p className="text-sm text-amber-700">
            Wait {formatWaitTime(hoursUntilNext)} before next dose
          </p>
        </div>
      )}

      {!canGive && maxDoses !== null && todayLogs.length >= maxDoses && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg text-center">
          <p className="text-sm text-green-700">
            All doses for today have been given
          </p>
        </div>
      )}

      <Button
        className={clsx('w-full mb-4', !canGive && 'opacity-50 cursor-not-allowed')}
        onClick={onGive}
        disabled={!canGive}
      >
        <Check className="w-4 h-4 mr-2" />
        {canGive ? 'Give Now' : 'Complete'}
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
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                {log.givenBy && <span>{log.givenBy}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
