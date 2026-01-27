import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO, differenceInMinutes, isToday as isTodayFns } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import {
  subscribeToFeedingSessions,
  subscribeToPumpSessions,
  subscribeToBottleSessions,
  subscribeToSleepSessions,
  subscribeToDiaperChanges,
  subscribeToMedicines,
  subscribeToMedicineLogs,
  createMedicineLog,
} from '@/lib/firestore';
import {
  FeedingSession,
  PumpSession,
  BottleSession,
  SleepSession,
  DiaperChange,
  BREAST_SIDE_CONFIG,
  DIAPER_TYPE_CONFIG,
  SLEEP_TYPE_CONFIG,
  BABY_COLOR_CONFIG,
  calculateBabyAge,
} from '@/types';
import type { Medicine, MedicineLog } from '@/types';
import { MedicationFrequency, MEDICATION_FREQUENCY_CONFIG } from '@/types/enums';
import {
  Baby,
  Moon,
  Leaf,
  Milk,
  Sun,
  ChevronRight,
  Gamepad2,
  Footprints,
  Calendar,
  AlertTriangle,
  Check,
  Pill,
  Circle,
  CheckCircle2,
  Droplets,
} from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from '@/stores/toastStore';

// Format duration for display (e.g., "2h 15m ago")
function formatTimeSince(timestamp: string): string {
  const date = parseISO(timestamp);
  const minutes = differenceInMinutes(new Date(), date);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m ago` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h ago` : `${days}d ago`;
}

// Get urgency color based on time elapsed
function getUrgencyColor(timestamp: string, normalMinutes: number, warningMinutes: number): string {
  const minutes = differenceInMinutes(new Date(), parseISO(timestamp));
  if (minutes <= normalMinutes) return 'text-green-600';
  if (minutes <= warningMinutes) return 'text-yellow-600';
  return 'text-red-600';
}

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
      return null;
    default:
      return null;
  }
}

interface StatusCardProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  timeSince: string | null;
  subtitle?: string;
  urgencyColor?: string;
  onClick?: () => void;
}

function StatusCard({ title, icon, iconBg, timeSince, subtitle, urgencyColor, onClick }: StatusCardProps) {
  return (
    <button
      className="w-full flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
      onClick={onClick}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs text-gray-400">{title}</p>
        {timeSince ? (
          <p className={clsx('text-base font-semibold', urgencyColor || 'text-gray-900')}>
            {timeSince}
          </p>
        ) : (
          <p className="text-sm text-gray-400">No data yet</p>
        )}
        {subtitle && timeSince && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </button>
  );
}

interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function QuickAction({ label, icon, color, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-105 active:scale-95"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-[10px] font-medium text-gray-600">{label}</span>
    </button>
  );
}

interface TodoItemProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  done: boolean;
  onClick: () => void;
}

function TodoItem({ icon, iconBg, title, subtitle, done, onClick }: TodoItemProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 w-full p-3 rounded-xl transition-all',
        done ? 'bg-gray-50 opacity-60' : 'bg-white shadow-sm hover:shadow-md'
      )}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={clsx('font-medium text-sm', done ? 'text-gray-400 line-through' : 'text-gray-900')}>
          {title}
        </p>
        <p className="text-xs text-gray-400 truncate">{subtitle}</p>
      </div>
      {done ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
      )}
    </button>
  );
}

export function DashboardView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedBaby, babies, settings } = useAppStore();
  const [, setTick] = useState(0);

  // Data states
  const [feedingSessions, setFeedingSessions] = useState<FeedingSession[]>([]);
  const [pumpSessions, setPumpSessions] = useState<PumpSession[]>([]);
  const [bottleSessions, setBottleSessions] = useState<BottleSession[]>([]);
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>([]);
  const [diaperChanges, setDiaperChanges] = useState<DiaperChange[]>([]);

  // Medicine reminder states
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineLogs, setMedicineLogs] = useState<Record<string, MedicineLog[]>>({});
  const [showMedicineReminder, setShowMedicineReminder] = useState(false);
  const [missedMedicines, setMissedMedicines] = useState<Medicine[]>([]);
  // Track the date when reminder was last shown (fixes midnight reset bug)
  const [lastReminderDate, setLastReminderDate] = useState<string | null>(null);

  // Subscribe to all data
  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribes = [
      subscribeToFeedingSessions(selectedBaby.id, setFeedingSessions),
      subscribeToPumpSessions(selectedBaby.id, setPumpSessions),
      subscribeToBottleSessions(selectedBaby.id, setBottleSessions),
      subscribeToSleepSessions(selectedBaby.id, setSleepSessions),
      subscribeToDiaperChanges(selectedBaby.id, setDiaperChanges),
      subscribeToMedicines(selectedBaby.id, setMedicines),
    ];

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [selectedBaby]);

  // Subscribe to logs for all active medicines
  useEffect(() => {
    const activeMeds = medicines.filter(m => m.isActive);
    const unsubscribes: (() => void)[] = [];

    activeMeds.forEach((medicine) => {
      const unsubscribe = subscribeToMedicineLogs(medicine.id, (logs) => {
        setMedicineLogs((prev) => ({
          ...prev,
          [medicine.id]: logs,
        }));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [medicines]);

  // Check for missed medicines at 9 PM
  useEffect(() => {
    const checkMissedMedicines = () => {
      const now = new Date();
      const hour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];

      // Only show reminder at 9 PM (21:00) or later, and only once per day
      // Use date comparison instead of session flag (fixes midnight reset bug)
      if (hour >= 21 && lastReminderDate !== todayStr) {
        const activeMeds = medicines.filter(m => m.isActive && m.frequency !== 'asNeeded');
        const missed: Medicine[] = [];

        activeMeds.forEach((medicine) => {
          const logs = medicineLogs[medicine.id] || [];
          const todayLogs = logs.filter((log) => isTodayFns(parseISO(log.timestamp)));
          const maxDoses = getMaxDosesPerDay(medicine.frequency);

          if (maxDoses !== null && todayLogs.length < maxDoses) {
            missed.push(medicine);
          } else if (medicine.frequency === 'everyHours' && medicine.hoursInterval) {
            // For everyHours, check if next dose is overdue
            // A dose is considered missed if: we have no doses today, OR
            // the time since last dose exceeds the interval
            if (todayLogs.length === 0) {
              missed.push(medicine);
            } else {
              // Check if current time exceeds last dose + interval
              const lastDose = todayLogs[0]; // Sorted newest first
              const lastDoseTime = new Date(lastDose.timestamp);
              const hoursSinceLastDose = (now.getTime() - lastDoseTime.getTime()) / (1000 * 60 * 60);
              if (hoursSinceLastDose >= medicine.hoursInterval) {
                missed.push(medicine);
              }
            }
          }
        });

        if (missed.length > 0) {
          setMissedMedicines(missed);
          setShowMedicineReminder(true);
          setLastReminderDate(todayStr);
        }
      }
    };

    // Check immediately on load
    checkMissedMedicines();

    // Check every minute
    const interval = setInterval(checkMissedMedicines, 60 * 1000);

    return () => clearInterval(interval);
  }, [medicines, medicineLogs, lastReminderDate]);

  // Update counters every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Get last feeding info (breastfeeding, bottle, or pump)
  const lastFeeding = useMemo(() => {
    const allFeedings: { timestamp: string; type: string; details: string }[] = [];

    // Add breastfeeding sessions (not active)
    feedingSessions
      .filter((s) => !s.isActive)
      .forEach((s) => {
        allFeedings.push({
          timestamp: s.startTime,
          type: 'breast',
          details: `Breastfeeding - ${BREAST_SIDE_CONFIG[s.breastSide].label}`,
        });
      });

    // Add bottle sessions
    bottleSessions.forEach((s) => {
      allFeedings.push({
        timestamp: s.timestamp,
        type: 'bottle',
        details: `Bottle - ${s.volume} ${s.volumeUnit}`,
      });
    });

    // Add pump sessions (not active)
    pumpSessions
      .filter((s) => !s.isActive)
      .forEach((s) => {
        allFeedings.push({
          timestamp: s.startTime,
          type: 'pump',
          details: `Pumped - ${s.volume} ${s.volumeUnit}`,
        });
      });

    // Sort by timestamp descending and get the most recent
    allFeedings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return allFeedings[0] || null;
  }, [feedingSessions, bottleSessions, pumpSessions]);

  // Get last diaper change
  const lastDiaper = useMemo(() => {
    if (diaperChanges.length === 0) return null;
    const latest = diaperChanges[0]; // Already sorted by timestamp desc
    return {
      timestamp: latest.timestamp,
      type: latest.type,
      details: DIAPER_TYPE_CONFIG[latest.type].label,
    };
  }, [diaperChanges]);

  // Get current sleep status
  const sleepStatus = useMemo(() => {
    // Check if there's an active sleep session
    const activeSleep = sleepSessions.find((s) => s.isActive);
    if (activeSleep) {
      return {
        isAsleep: true,
        timestamp: activeSleep.startTime,
        type: activeSleep.type,
        details: `${SLEEP_TYPE_CONFIG[activeSleep.type].label} in progress`,
      };
    }

    // Get the most recent completed sleep
    const completedSleep = sleepSessions.filter((s) => !s.isActive);
    if (completedSleep.length === 0) return null;

    const latest = completedSleep[0];
    return {
      isAsleep: false,
      timestamp: latest.endTime || latest.startTime,
      type: latest.type,
      details: `Woke from ${SLEEP_TYPE_CONFIG[latest.type].label.toLowerCase()}`,
    };
  }, [sleepSessions]);

  // Get medicine todo items
  const medicineTodos = useMemo(() => {
    const activeMeds = medicines.filter(m => m.isActive && m.frequency !== 'asNeeded');
    return activeMeds.map((medicine) => {
      const logs = medicineLogs[medicine.id] || [];
      const todayLogs = logs.filter((log) => isTodayFns(parseISO(log.timestamp)));
      const maxDoses = getMaxDosesPerDay(medicine.frequency);
      const dosesGiven = todayLogs.length;
      const isComplete = maxDoses !== null ? dosesGiven >= maxDoses : false;

      return {
        id: medicine.id,
        medicine,
        dosesGiven,
        maxDoses,
        isComplete,
      };
    });
  }, [medicines, medicineLogs]);

  // Handle giving medicine from reminder
  const handleGiveMedicine = async (medicine: Medicine) => {
    if (!user || !selectedBaby) return;

    try {
      await createMedicineLog(medicine.id, selectedBaby.id, user.uid, {
        timestamp: new Date().toISOString(),
      });
      toast.success(`${medicine.name} dose logged`);

      // Remove from missed list based on frequency type
      const logs = medicineLogs[medicine.id] || [];
      const todayLogs = logs.filter((log) => isTodayFns(parseISO(log.timestamp)));
      const maxDoses = getMaxDosesPerDay(medicine.frequency);

      if (medicine.frequency === 'everyHours') {
        // For everyHours, remove from missed list after giving any dose
        // (the interval will be checked again at next reminder)
        setMissedMedicines((prev) => prev.filter((m) => m.id !== medicine.id));
      } else if (maxDoses !== null && todayLogs.length + 1 >= maxDoses) {
        // For fixed-dose medicines, remove if all doses given
        setMissedMedicines((prev) => prev.filter((m) => m.id !== medicine.id));
      }
    } catch (error) {
      console.error('Error logging medicine:', error);
      toast.error('Failed to log dose');
    }
  };

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  // Calculate baby's age
  const babyAge = selectedBaby?.birthDate ? calculateBabyAge(selectedBaby.birthDate) : null;
  const babyColor = selectedBaby?.color ? BABY_COLOR_CONFIG[selectedBaby.color]?.hex : '#9c27b0';

  // Count incomplete medicine todos
  const incompleteMedicineTodos = medicineTodos.filter(t => !t.isComplete);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header title="Home" />

      <div className="px-4 py-4 space-y-5">
        {/* Baby Profile Card */}
        {selectedBaby && (
          <div
            className="rounded-2xl p-4 text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${babyColor} 0%, ${babyColor}dd 100%)`,
            }}
          >
            <div className="flex items-center gap-4">
              {/* Baby Avatar */}
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold shadow-inner">
                {selectedBaby.photoUrl ? (
                  <img
                    src={selectedBaby.photoUrl}
                    alt={selectedBaby.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  selectedBaby.name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Baby Info */}
              <div className="flex-1">
                <h2 className="text-xl font-bold">{selectedBaby.name}</h2>
                {babyAge && (
                  <p className="text-white/90 text-sm font-medium">{babyAge.text}</p>
                )}
                <div className="flex items-center gap-1 text-white/70 text-xs mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Quick Actions</h3>
          <div className="grid grid-cols-6 gap-2">
            <QuickAction
              label={settings?.feedingTypePreference === 'formula' ? 'Bottle' : 'Feed'}
              icon={
                settings?.feedingTypePreference === 'formula' ? (
                  <Milk className="w-5 h-5" />
                ) : (
                  <Baby className="w-5 h-5" />
                )
              }
              color="#e91e63"
              onClick={() => navigate('/feed')}
            />
            <QuickAction
              label="Pump"
              icon={<Droplets className="w-5 h-5" />}
              color="#9c27b0"
              onClick={() => navigate('/feed?tab=pump')}
            />
            <QuickAction
              label="Sleep"
              icon={<Moon className="w-5 h-5" />}
              color="#3f51b5"
              onClick={() => navigate('/sleep')}
            />
            <QuickAction
              label="Diaper"
              icon={<Leaf className="w-5 h-5" />}
              color="#4caf50"
              onClick={() => navigate('/diaper')}
            />
            <QuickAction
              label="Play"
              icon={<Gamepad2 className="w-5 h-5" />}
              color="#ff9800"
              onClick={() => navigate('/more/play')}
            />
            <QuickAction
              label="Walk"
              icon={<Footprints className="w-5 h-5" />}
              color="#8bc34a"
              onClick={() => navigate('/more/walks')}
            />
          </div>
        </div>

        {/* Today's To Do */}
        {medicineTodos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Today's To Do
              </h3>
              {incompleteMedicineTodos.length > 0 && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {incompleteMedicineTodos.length} pending
                </span>
              )}
            </div>
            <div className="space-y-2">
              {medicineTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  icon={<Pill className="w-5 h-5 text-white" />}
                  iconBg="#9c27b0"
                  title={todo.medicine.name}
                  subtitle={
                    todo.maxDoses
                      ? `${todo.dosesGiven}/${todo.maxDoses} doses given`
                      : `${todo.dosesGiven} doses given`
                  }
                  done={todo.isComplete}
                  onClick={() => navigate('/more/medicine')}
                />
              ))}
            </div>
          </div>
        )}

        {/* Status Cards */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Status</h3>
          <div className="space-y-2">
            {/* Last Feeding */}
            <StatusCard
              title="Last Feeding"
              icon={
                lastFeeding?.type === 'bottle' ? (
                  <Milk className="w-5 h-5 text-white" />
                ) : (
                  <Baby className="w-5 h-5 text-white" />
                )
              }
              iconBg="#e91e63"
              timeSince={lastFeeding ? formatTimeSince(lastFeeding.timestamp) : null}
              subtitle={lastFeeding?.details}
              urgencyColor={lastFeeding ? getUrgencyColor(lastFeeding.timestamp, 120, 180) : undefined}
              onClick={() => navigate('/feed')}
            />

            {/* Sleep Status */}
            <StatusCard
              title={sleepStatus?.isAsleep ? 'Sleeping' : 'Last Woke Up'}
              icon={
                sleepStatus?.isAsleep ? (
                  <Moon className="w-5 h-5 text-white" />
                ) : (
                  <Sun className="w-5 h-5 text-white" />
                )
              }
              iconBg={sleepStatus?.isAsleep ? '#3f51b5' : '#ff9800'}
              timeSince={sleepStatus ? formatTimeSince(sleepStatus.timestamp) : null}
              subtitle={sleepStatus?.details}
              urgencyColor={
                sleepStatus && !sleepStatus.isAsleep
                  ? getUrgencyColor(sleepStatus.timestamp, 120, 180)
                  : undefined
              }
              onClick={() => navigate('/sleep')}
            />

            {/* Last Diaper */}
            <StatusCard
              title="Last Diaper"
              icon={<Leaf className="w-5 h-5 text-white" />}
              iconBg="#4caf50"
              timeSince={lastDiaper ? formatTimeSince(lastDiaper.timestamp) : null}
              subtitle={lastDiaper?.details}
              urgencyColor={lastDiaper ? getUrgencyColor(lastDiaper.timestamp, 120, 180) : undefined}
              onClick={() => navigate('/diaper')}
            />
          </div>
        </div>

        {/* Today's Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Today's Summary</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-pink-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-pink-600">
                {feedingSessions.filter((s) => !s.isActive && isToday(s.startTime)).length +
                  bottleSessions.filter((s) => isToday(s.timestamp)).length}
              </p>
              <p className="text-xs text-pink-600/70 font-medium">Feedings</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {sleepSessions.filter((s) => {
                  if (s.isActive || !s.endTime) return false;
                  return s.type === 'nap'
                    ? isToday(s.startTime)
                    : isToday(s.endTime);
                }).length}
              </p>
              <p className="text-xs text-indigo-600/70 font-medium">Sleeps</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {diaperChanges.filter((c) => isToday(c.timestamp)).length}
              </p>
              <p className="text-xs text-green-600/70 font-medium">Diapers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Medicine Reminder Modal */}
      {showMedicineReminder && missedMedicines.length > 0 && (
        <MedicineReminderModal
          medicines={missedMedicines}
          onDismiss={() => setShowMedicineReminder(false)}
          onGive={handleGiveMedicine}
        />
      )}
    </div>
  );
}

// Helper function to check if timestamp is today
function isToday(timestamp: string): boolean {
  const date = parseISO(timestamp);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function MedicineReminderModal({
  medicines,
  onDismiss,
  onGive,
}: {
  medicines: Medicine[];
  onDismiss: () => void;
  onGive: (medicine: Medicine) => void;
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
                  </div>
                </div>
                <Button size="sm" onClick={() => onGive(medicine)}>
                  <Check className="w-4 h-4 mr-1" />
                  Give
                </Button>
              </div>
            );
          })}
        </div>

        {/* Dismiss button */}
        <Button variant="outline" className="w-full" onClick={onDismiss}>
          Dismiss
        </Button>
      </Card>
    </div>
  );
}
