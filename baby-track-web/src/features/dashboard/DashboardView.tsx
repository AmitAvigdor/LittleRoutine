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
  Pill,
  Circle,
  CheckCircle2,
  Droplets,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

// Get greeting based on time of day
function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Good night', emoji: '🌙' };
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
  if (hour < 21) return { text: 'Good evening', emoji: '🌅' };
  return { text: 'Good night', emoji: '🌙' };
}

// Format elapsed time for active timers (e.g., "12:34" or "1:23:45")
function formatElapsedTime(startTime: string, isPaused?: boolean, pausedAt?: string | null, totalPausedDuration?: number): string {
  const start = new Date(startTime);
  const pausedDuration = totalPausedDuration || 0;

  let elapsedMs: number;
  if (isPaused && pausedAt) {
    // If paused, calculate time up to when it was paused
    const pauseTime = new Date(pausedAt);
    elapsedMs = pauseTime.getTime() - start.getTime() - (pausedDuration * 1000);
  } else {
    // If running, calculate from now
    elapsedMs = Date.now() - start.getTime() - (pausedDuration * 1000);
  }

  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

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
      className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] border border-gray-100"
      onClick={onClick}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        {timeSince ? (
          <p className={clsx('text-lg font-bold', urgencyColor || 'text-gray-900')}>
            {timeSince}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">No data yet</p>
        )}
        {subtitle && timeSince && <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>}
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
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
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:scale-105 active:scale-95"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        }}
      >
        <span className="text-white">{icon}</span>
      </div>
      <span className="text-[11px] font-semibold text-gray-700">{label}</span>
    </button>
  );
}

interface ActiveTimerCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  elapsedTime: string;
  isPaused?: boolean;
  onClick: () => void;
}

function ActiveTimerCard({ icon, iconBg, title, subtitle, elapsedTime, isPaused, onClick }: ActiveTimerCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-4 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] w-full border',
        isPaused ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-green-200'
      )}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 relative shadow-sm"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
        {/* Pulsing indicator for running timer */}
        {!isPaused && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse ring-2 ring-white" />
        )}
        {isPaused && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full ring-2 ring-white" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-base font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-2xl font-bold text-gray-900 font-mono">{elapsedTime}</p>
        {isPaused && <p className="text-xs text-yellow-600 font-semibold">Paused</p>}
      </div>
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
        'flex items-center gap-4 w-full p-4 rounded-2xl transition-all border',
        done
          ? 'bg-green-50/50 border-green-100'
          : 'bg-white shadow-sm hover:shadow-md border-gray-100'
      )}
    >
      <div
        className={clsx(
          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm',
          done && 'opacity-60'
        )}
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={clsx('font-semibold text-sm', done ? 'text-gray-400 line-through' : 'text-gray-900')}>
          {title}
        </p>
        <p className={clsx('text-xs truncate mt-0.5', done ? 'text-gray-400' : 'text-gray-500')}>{subtitle}</p>
      </div>
      {done ? (
        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
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
  const [logsLoadedFor, setLogsLoadedFor] = useState<Set<string>>(new Set());
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

  // Update counters - every second when there are active timers, otherwise every minute
  useEffect(() => {
    const hasActiveTimers =
      feedingSessions.some(s => s.isActive) ||
      pumpSessions.some(s => s.isActive) ||
      sleepSessions.some(s => s.isActive);

    const intervalMs = hasActiveTimers ? 1000 : 60000; // 1 second or 1 minute

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [feedingSessions, pumpSessions, sleepSessions]);

  // Get all active timers
  const activeTimers = useMemo(() => {
    const timers: {
      id: string;
      type: 'feeding' | 'pump' | 'sleep';
      title: string;
      subtitle: string;
      startTime: string;
      isPaused?: boolean;
      pausedAt?: string | null;
      totalPausedDuration?: number;
      icon: React.ReactNode;
      iconBg: string;
      route: string;
    }[] = [];

    // Active breastfeeding
    feedingSessions.filter(s => s.isActive).forEach(s => {
      timers.push({
        id: s.id,
        type: 'feeding',
        title: 'Breastfeeding',
        subtitle: `${BREAST_SIDE_CONFIG[s.breastSide].label} side`,
        startTime: s.startTime,
        isPaused: s.isPaused,
        pausedAt: s.pausedAt,
        totalPausedDuration: s.totalPausedDuration,
        icon: <Baby className="w-6 h-6 text-white" />,
        iconBg: '#e91e63',
        route: '/feed',
      });
    });

    // Active pump
    pumpSessions.filter(s => s.isActive).forEach(s => {
      timers.push({
        id: s.id,
        type: 'pump',
        title: 'Pumping',
        subtitle: `${s.side === 'both' ? 'Both sides' : `${s.side.charAt(0).toUpperCase() + s.side.slice(1)} side`}`,
        startTime: s.startTime,
        isPaused: s.isPaused,
        pausedAt: s.pausedAt,
        totalPausedDuration: s.totalPausedDuration,
        icon: <Droplets className="w-6 h-6 text-white" />,
        iconBg: '#9c27b0',
        route: '/more/pump',
      });
    });

    // Active sleep
    sleepSessions.filter(s => s.isActive).forEach(s => {
      timers.push({
        id: s.id,
        type: 'sleep',
        title: 'Sleeping',
        subtitle: SLEEP_TYPE_CONFIG[s.type].label,
        startTime: s.startTime,
        icon: <Moon className="w-6 h-6 text-white" />,
        iconBg: '#3f51b5',
        route: '/sleep',
      });
    });

    // Sort by start time (oldest first - they've been running longest)
    timers.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return timers;
  }, [feedingSessions, pumpSessions, sleepSessions]);

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

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  // Calculate baby's age
  const babyAge = selectedBaby?.birthDate ? calculateBabyAge(selectedBaby.birthDate) : null;
  const babyColor = selectedBaby?.color ? BABY_COLOR_CONFIG[selectedBaby.color]?.hex : '#9c27b0';

  // Count incomplete medicine todos
  const incompleteMedicineTodos = medicineTodos.filter(t => !t.isComplete);

  // Get greeting
  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header title="Home" />

      <div className="px-4 py-4 space-y-5">
        {/* Baby Profile Card */}
        {selectedBaby && (
          <div
            className="rounded-3xl p-5 text-white shadow-xl relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${babyColor} 0%, ${babyColor}bb 100%)`,
            }}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <Sparkles className="absolute top-4 right-4 w-5 h-5 text-white/40" />

            {/* Greeting */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{greeting.emoji}</span>
              <span className="text-white/80 font-medium">{greeting.text}!</span>
            </div>

            <div className="flex items-center gap-4 relative">
              {/* Baby Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-white/25 flex items-center justify-center shadow-lg ring-4 ring-white/40">
                  {selectedBaby.photoUrl ? (
                    <img
                      src={selectedBaby.photoUrl}
                      alt={selectedBaby.name}
                      className="w-[72px] h-[72px] rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">👶</span>
                  )}
                </div>
              </div>

              {/* Baby Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold tracking-tight">{selectedBaby.name}</h2>
                {babyAge && (
                  <p className="text-white/90 text-sm font-medium mt-1">{babyAge.text}</p>
                )}
                <div className="flex items-center gap-1.5 text-white/70 text-xs mt-2 bg-white/10 rounded-full px-3 py-1 w-fit">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Timers */}
        {activeTimers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-base">⏱️</span>
              <h3 className="text-sm font-bold text-gray-700">Active Timers</h3>
            </div>
            <div className="space-y-2">
              {activeTimers.map((timer) => (
                <ActiveTimerCard
                  key={timer.id}
                  icon={timer.icon}
                  iconBg={timer.iconBg}
                  title={timer.title}
                  subtitle={timer.subtitle}
                  elapsedTime={formatElapsedTime(
                    timer.startTime,
                    timer.isPaused,
                    timer.pausedAt,
                    timer.totalPausedDuration
                  )}
                  isPaused={timer.isPaused}
                  onClick={() => navigate(timer.route)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-base">⚡</span>
            <h3 className="text-sm font-bold text-gray-700">Quick Actions</h3>
          </div>
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
              onClick={() => navigate('/more/pump')}
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
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-base">✅</span>
                <h3 className="text-sm font-bold text-gray-700">Today's To Do</h3>
              </div>
              {incompleteMedicineTodos.length > 0 && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
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
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-base">📊</span>
            <h3 className="text-sm font-bold text-gray-700">Status</h3>
          </div>
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
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">📈</span>
            <h3 className="text-sm font-bold text-gray-700">Today's Summary</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4 text-center shadow-sm">
              <span className="text-2xl mb-1 block">🍼</span>
              <p className="text-3xl font-bold text-pink-600">
                {feedingSessions.filter((s) => !s.isActive && isToday(s.startTime)).length +
                  bottleSessions.filter((s) => isToday(s.timestamp)).length}
              </p>
              <p className="text-xs text-pink-600/80 font-semibold mt-1">Feedings</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 text-center shadow-sm">
              <span className="text-2xl mb-1 block">😴</span>
              <p className="text-3xl font-bold text-indigo-600">
                {sleepSessions.filter((s) => {
                  if (s.isActive || !s.endTime) return false;
                  return s.type === 'nap'
                    ? isToday(s.startTime)
                    : isToday(s.endTime);
                }).length}
              </p>
              <p className="text-xs text-indigo-600/80 font-semibold mt-1">Sleeps</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 text-center shadow-sm">
              <span className="text-2xl mb-1 block">🧷</span>
              <p className="text-3xl font-bold text-green-600">
                {diaperChanges.filter((c) => isToday(c.timestamp)).length}
              </p>
              <p className="text-xs text-green-600/80 font-semibold mt-1">Diapers</p>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>

      {/* Medicine Reminder Modal */}
      {showMedicineReminder && missedMedicines.length > 0 && (
        <MedicineReminderModal
          medicines={missedMedicines}
          onDismiss={() => setShowMedicineReminder(false)}
          onGoToMedicines={() => {
            setShowMedicineReminder(false);
            navigate('/more/medicine');
          }}
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
  onGoToMedicines,
}: {
  medicines: Medicine[];
  onDismiss: () => void;
  onGoToMedicines: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <span className="text-3xl">💊</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Medicine Reminder</h3>
          <p className="text-sm text-gray-500 mt-1">Don't forget to give:</p>
        </div>

        {/* Medicines list */}
        <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
          {medicines.map((medicine) => {
            const freqConfig = MEDICATION_FREQUENCY_CONFIG[medicine.frequency];
            return (
              <div
                key={medicine.id}
                className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100"
              >
                <p className="font-semibold text-gray-900">{medicine.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {medicine.dosage && (
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{medicine.dosage}</span>
                  )}
                  <span className="text-xs text-gray-500">{freqConfig.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onDismiss}>
            Dismiss
          </Button>
          <Button className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" onClick={onGoToMedicines}>
            Go to Medicines
          </Button>
        </div>
      </Card>
    </div>
  );
}
