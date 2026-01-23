import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO, differenceInMinutes } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/stores/appStore';
import {
  subscribeToFeedingSessions,
  subscribeToPumpSessions,
  subscribeToBottleSessions,
  subscribeToSleepSessions,
  subscribeToDiaperChanges,
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
} from '@/types';
import {
  Baby,
  Moon,
  Leaf,
  Droplet,
  Clock,
  Milk,
  Sun,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

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
    <Card
      className={clsx('cursor-pointer hover:shadow-md transition-shadow', onClick && 'active:scale-98')}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500">{title}</p>
          {timeSince ? (
            <>
              <p className={clsx('text-lg font-semibold', urgencyColor || 'text-gray-900')}>
                {timeSince}
              </p>
              {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
            </>
          ) : (
            <p className="text-sm text-gray-400">No data yet</p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300" />
      </div>
    </Card>
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
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all hover:scale-105 active:scale-95"
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}

export function DashboardView() {
  const navigate = useNavigate();
  const { selectedBaby, babies, settings } = useAppStore();
  const [, setTick] = useState(0);

  // Data states
  const [feedingSessions, setFeedingSessions] = useState<FeedingSession[]>([]);
  const [pumpSessions, setPumpSessions] = useState<PumpSession[]>([]);
  const [bottleSessions, setBottleSessions] = useState<BottleSession[]>([]);
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>([]);
  const [diaperChanges, setDiaperChanges] = useState<DiaperChange[]>([]);

  // Subscribe to all data
  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribes = [
      subscribeToFeedingSessions(selectedBaby.id, setFeedingSessions),
      subscribeToPumpSessions(selectedBaby.id, setPumpSessions),
      subscribeToBottleSessions(selectedBaby.id, setBottleSessions),
      subscribeToSleepSessions(selectedBaby.id, setSleepSessions),
      subscribeToDiaperChanges(selectedBaby.id, setDiaperChanges),
    ];

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [selectedBaby]);

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
          timestamp: s.endTime || s.startTime,
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
          timestamp: s.endTime || s.startTime,
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

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  return (
    <div>
      <Header title="Home" />

      <div className="px-4 py-4 space-y-6">
        {/* Welcome message */}
        {selectedBaby && (
          <div className="text-center py-2">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedBaby.name}'s Day
            </h2>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        )}

        {/* Status Cards */}
        <div className="space-y-3">
          {/* Last Feeding */}
          <StatusCard
            title="Last Feeding"
            icon={
              lastFeeding?.type === 'bottle' ? (
                <Milk className="w-6 h-6 text-white" />
              ) : (
                <Baby className="w-6 h-6 text-white" />
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
                <Moon className="w-6 h-6 text-white" />
              ) : (
                <Sun className="w-6 h-6 text-white" />
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
            icon={<Leaf className="w-6 h-6 text-white" />}
            iconBg="#4caf50"
            timeSince={lastDiaper ? formatTimeSince(lastDiaper.timestamp) : null}
            subtitle={lastDiaper?.details}
            urgencyColor={lastDiaper ? getUrgencyColor(lastDiaper.timestamp, 120, 180) : undefined}
            onClick={() => navigate('/diaper')}
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3 px-1">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction
              label={settings?.feedingTypePreference === 'formula' ? 'Bottle' : 'Feed'}
              icon={
                settings?.feedingTypePreference === 'formula' ? (
                  <Milk className="w-7 h-7" />
                ) : (
                  <Baby className="w-7 h-7" />
                )
              }
              color="#e91e63"
              onClick={() => navigate('/feed')}
            />
            <QuickAction
              label="Sleep"
              icon={<Moon className="w-7 h-7" />}
              color="#3f51b5"
              onClick={() => navigate('/sleep')}
            />
            <QuickAction
              label="Diaper"
              icon={<Leaf className="w-7 h-7" />}
              color="#4caf50"
              onClick={() => navigate('/diaper')}
            />
            <QuickAction
              label="Stats"
              icon={<Clock className="w-7 h-7" />}
              color="#9c27b0"
              onClick={() => navigate('/stats')}
            />
          </div>
        </div>

        {/* Today's Summary (brief) */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Today's Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-pink-600">
                {feedingSessions.filter((s) => !s.isActive && isToday(s.startTime)).length +
                  bottleSessions.filter((s) => isToday(s.timestamp)).length}
              </p>
              <p className="text-xs text-gray-500">Feedings</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">
                {sleepSessions.filter((s) => {
                  if (s.isActive || !s.endTime) return false;
                  // Naps: count by start time, Night: count by end time (wake up time)
                  return s.type === 'nap'
                    ? isToday(s.startTime)
                    : isToday(s.endTime);
                }).length}
              </p>
              <p className="text-xs text-gray-500">Sleeps</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {diaperChanges.filter((c) => isToday(c.timestamp)).length}
              </p>
              <p className="text-xs text-gray-500">Diapers</p>
            </div>
          </div>
        </Card>
      </div>
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
