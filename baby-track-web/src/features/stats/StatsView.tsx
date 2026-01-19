import { useState, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO, isWithinInterval, subDays } from 'date-fns';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/Select';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import {
  subscribeToFeedingSessions,
  subscribeToPumpSessions,
  subscribeToBottleSessions,
  subscribeToSleepSessions,
  subscribeToDiaperChanges,
} from '@/lib/firestore';
import { FeedingSession, PumpSession, BottleSession, SleepSession, DiaperChange, formatDuration, formatSleepDuration, convertVolume } from '@/types';
import { clsx } from 'clsx';
import { Droplet, Moon, Leaf, Milk, Baby, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type TimeFilter = 'today' | 'week' | 'all';

const filterOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'all', label: 'All Time' },
];

export function StatsView() {
  const { user } = useAuth();
  const { selectedBaby, babies, settings } = useAppStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');

  // Get preferred units from settings
  const volumeUnit = settings?.preferredVolumeUnit || 'oz';

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
  }, [selectedBaby?.id]);

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'today') {
      return { start: startOfDay(now), end: endOfDay(now) };
    } else if (timeFilter === 'week') {
      return { start: startOfWeek(now), end: endOfWeek(now) };
    }
    return { start: new Date(0), end: now };
  }, [timeFilter]);

  // Filter data by date range
  const filterByDate = <T extends { startTime?: string; timestamp?: string }>(
    items: T[]
  ): T[] => {
    return items.filter((item) => {
      const date = parseISO(item.startTime || item.timestamp || '');
      return isWithinInterval(date, dateRange);
    });
  };

  // Filtered data
  const filteredFeeding = filterByDate(feedingSessions);
  const filteredPump = filterByDate(pumpSessions);
  const filteredBottle = filterByDate(bottleSessions);
  const filteredSleep = filterByDate(sleepSessions).filter((s) => !s.isActive);
  const filteredDiaper = filterByDate(diaperChanges);

  // Calculate stats
  const stats = useMemo(() => {
    const feedingTime = filteredFeeding.reduce((sum, s) => sum + s.duration, 0);
    const feedingCount = filteredFeeding.length;
    // Convert pump volumes to preferred unit
    const pumpVolume = filteredPump.reduce((sum, s) => {
      return sum + convertVolume(s.volume, s.volumeUnit, volumeUnit);
    }, 0);
    const pumpCount = filteredPump.length;
    // Convert bottle volumes to preferred unit
    const bottleVolume = filteredBottle.reduce((sum, s) => {
      return sum + convertVolume(s.volume, s.volumeUnit, volumeUnit);
    }, 0);
    const bottleCount = filteredBottle.length;
    const sleepTime = filteredSleep.reduce((sum, s) => sum + s.duration, 0);
    const napCount = filteredSleep.filter((s) => s.type === 'nap').length;
    const nightCount = filteredSleep.filter((s) => s.type === 'night').length;
    const diaperCount = filteredDiaper.length;
    const wetCount = filteredDiaper.filter((c) => c.type === 'wet').length;
    const dirtyCount = filteredDiaper.filter((c) => c.type === 'dirty').length;

    return {
      feedingTime,
      feedingCount,
      pumpVolume,
      pumpCount,
      bottleVolume,
      bottleCount,
      sleepTime,
      napCount,
      nightCount,
      diaperCount,
      wetCount,
      dirtyCount,
    };
  }, [filteredFeeding, filteredPump, filteredBottle, filteredSleep, filteredDiaper, volumeUnit]);

  // Chart data for feeding
  const feedingChartData = useMemo(() => {
    if (timeFilter === 'today') {
      // Hourly breakdown
      const hours = Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        feeding: 0,
        pump: 0,
        bottle: 0,
      }));

      filteredFeeding.forEach((s) => {
        const hour = parseISO(s.startTime).getHours();
        hours[hour].feeding += Math.round(s.duration / 60);
      });
      filteredPump.forEach((s) => {
        const hour = parseISO(s.startTime).getHours();
        hours[hour].pump += convertVolume(s.volume, s.volumeUnit, volumeUnit);
      });
      filteredBottle.forEach((s) => {
        const hour = parseISO(s.timestamp).getHours();
        hours[hour].bottle += convertVolume(s.volume, s.volumeUnit, volumeUnit);
      });

      return hours.filter((h) => h.feeding > 0 || h.pump > 0 || h.bottle > 0);
    } else {
      // Daily breakdown
      const days: Record<string, { name: string; feeding: number; pump: number; bottle: number }> = {};

      const getDayKey = (dateStr: string) => format(parseISO(dateStr), 'MMM d');

      filteredFeeding.forEach((s) => {
        const key = getDayKey(s.startTime);
        if (!days[key]) days[key] = { name: key, feeding: 0, pump: 0, bottle: 0 };
        days[key].feeding += Math.round(s.duration / 60);
      });
      filteredPump.forEach((s) => {
        const key = getDayKey(s.startTime);
        if (!days[key]) days[key] = { name: key, feeding: 0, pump: 0, bottle: 0 };
        days[key].pump += convertVolume(s.volume, s.volumeUnit, volumeUnit);
      });
      filteredBottle.forEach((s) => {
        const key = getDayKey(s.timestamp);
        if (!days[key]) days[key] = { name: key, feeding: 0, pump: 0, bottle: 0 };
        days[key].bottle += convertVolume(s.volume, s.volumeUnit, volumeUnit);
      });

      return Object.values(days);
    }
  }, [filteredFeeding, filteredPump, filteredBottle, timeFilter, volumeUnit]);

  // Diaper pie chart data
  const diaperPieData = [
    { name: 'Wet', value: stats.wetCount, color: '#2196f3' },
    { name: 'Dirty', value: stats.dirtyCount, color: '#795548' },
    { name: 'Both', value: stats.diaperCount - stats.wetCount - stats.dirtyCount, color: '#ff9800' },
  ].filter((d) => d.value > 0);

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  return (
    <div>
      <Header title="Stats" />

      <div className="px-4 py-4 space-y-4">
        {/* Time Filter */}
        <div className="flex justify-center">
          <SegmentedControl
            options={filterOptions}
            value={timeFilter}
            onChange={(value) => setTimeFilter(value as TimeFilter)}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Feeding */}
          <Card className="border-l-4 border-l-pink-500">
            <div className="flex items-center gap-2 mb-2">
              <Baby className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-medium text-gray-600">Nursing</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.feedingCount}</p>
            <p className="text-xs text-gray-500">{formatDuration(stats.feedingTime)} total</p>
          </Card>

          {/* Pump */}
          <Card className="border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Pumped</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pumpVolume.toFixed(1)} {volumeUnit}</p>
            <p className="text-xs text-gray-500">{stats.pumpCount} sessions</p>
          </Card>

          {/* Bottle */}
          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center gap-2 mb-2">
              <Milk className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">Bottles</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.bottleVolume.toFixed(1)} {volumeUnit}</p>
            <p className="text-xs text-gray-500">{stats.bottleCount} feedings</p>
          </Card>

          {/* Sleep */}
          <Card className="border-l-4 border-l-indigo-500">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-gray-600">Sleep</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatSleepDuration(stats.sleepTime)}</p>
            <p className="text-xs text-gray-500">{stats.napCount} naps, {stats.nightCount} night</p>
          </Card>
        </div>

        {/* Diaper Summary */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-900">Diapers</h3>
            <span className="text-gray-500">({stats.diaperCount} total)</span>
          </div>

          {diaperPieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diaperPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      dataKey="value"
                    >
                      {diaperPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {diaperPieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No diaper changes recorded</p>
          )}
        </Card>

        {/* Feeding Chart */}
        {feedingChartData.length > 0 && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Feeding Activity</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feedingChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="feeding" fill="#e91e63" name="Nursing (min)" stackId="a" />
                  <Bar dataKey="pump" fill="#2196f3" name={`Pump (${volumeUnit})`} stackId="b" />
                  <Bar dataKey="bottle" fill="#9c27b0" name={`Bottle (${volumeUnit})`} stackId="b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                Nursing
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Pump
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Bottle
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
