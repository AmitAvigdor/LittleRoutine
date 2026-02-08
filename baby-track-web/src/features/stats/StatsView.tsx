import { useState, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, parseISO, isWithinInterval } from 'date-fns';
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
  subscribeToPlaySessions,
  subscribeToWalkSessions,
} from '@/lib/firestore';
import {
  FeedingSession,
  PumpSession,
  BottleSession,
  SleepSession,
  DiaperChange,
  PlaySession,
  WalkSession,
  formatDuration,
  formatSleepDuration,
  convertVolume,
  BREAST_SIDE_CONFIG,
  BOTTLE_CONTENT_CONFIG,
  SLEEP_TYPE_CONFIG,
  DIAPER_TYPE_CONFIG,
  PLAY_TYPE_CONFIG,
} from '@/types';
import { Droplet, Moon, Sun, Leaf, Milk, Baby, Clock, BarChart3, History, Lightbulb, TrendingUp, TrendingDown, Minus, Calendar, Gamepad2, Footprints } from 'lucide-react';
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

type ViewMode = 'stats' | 'history' | 'insights';
type TimeFilter = 'today' | 'week' | 'all';
type HistoryFilter = 'all' | 'feeding' | 'sleep' | 'diaper' | 'play' | 'walks';

const viewModeOptions = [
  { value: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
  { value: 'insights', label: 'Insights', icon: <Lightbulb className="w-4 h-4" /> },
];

const filterOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'all', label: 'All Time' },
];

const historyFilterOptions = [
  { value: 'all', label: 'All' },
  { value: 'feeding', label: 'Feeding' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'diaper', label: 'Diaper' },
  { value: 'play', label: 'Play' },
  { value: 'walks', label: 'Walks' },
];

export function StatsView() {
  useAuth(); // Ensure user is authenticated
  const { selectedBaby, babies, settings } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('stats');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  // Get preferred units from settings
  const volumeUnit = settings?.preferredVolumeUnit || 'oz';

  // Data states
  const [feedingSessions, setFeedingSessions] = useState<FeedingSession[]>([]);
  const [pumpSessions, setPumpSessions] = useState<PumpSession[]>([]);
  const [bottleSessions, setBottleSessions] = useState<BottleSession[]>([]);
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>([]);
  const [diaperChanges, setDiaperChanges] = useState<DiaperChange[]>([]);
  const [playSessions, setPlaySessions] = useState<PlaySession[]>([]);
  const [walkSessions, setWalkSessions] = useState<WalkSession[]>([]);

  // Subscribe to all data
  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribes = [
      subscribeToFeedingSessions(selectedBaby.id, setFeedingSessions),
      subscribeToPumpSessions(selectedBaby.id, setPumpSessions),
      subscribeToBottleSessions(selectedBaby.id, setBottleSessions),
      subscribeToSleepSessions(selectedBaby.id, setSleepSessions),
      subscribeToDiaperChanges(selectedBaby.id, setDiaperChanges),
      subscribeToPlaySessions(selectedBaby.id, setPlaySessions),
      subscribeToWalkSessions(selectedBaby.id, setWalkSessions),
    ];

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [selectedBaby]);

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

  // Filter sleep sessions - naps by start time, night sleep by end time (wake up)
  const filterSleepByDate = (sessions: SleepSession[]): SleepSession[] => {
    return sessions.filter((s) => {
      if (s.isActive || !s.endTime) return false;
      // For naps, use start time; for night sleep, use end time (when you wake up)
      const relevantTime = s.type === 'nap' ? s.startTime : s.endTime;
      const date = parseISO(relevantTime);
      return isWithinInterval(date, dateRange);
    });
  };

  // Filtered data
  const filteredFeeding = filterByDate(feedingSessions);
  const filteredPump = filterByDate(pumpSessions);
  const filteredBottle = filterByDate(bottleSessions);
  const filteredSleep = filterSleepByDate(sleepSessions);
  const filteredDiaper = filterByDate(diaperChanges);
  const filteredPlay = filterByDate(playSessions).filter(s => !s.isActive);
  const filteredWalks = filterByDate(walkSessions).filter(s => !s.isActive);

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
    // Count 'full', 'dirty', and 'both' as full diapers (legacy support)
    const fullCount = filteredDiaper.filter((c) => c.type === 'full' || c.type === 'dirty' || c.type === 'both').length;
    const playTime = filteredPlay.reduce((sum, s) => sum + s.duration, 0);
    const playCount = filteredPlay.length;
    const walkTime = filteredWalks.reduce((sum, s) => sum + s.duration, 0);
    const walkCount = filteredWalks.length;

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
      fullCount,
      playTime,
      playCount,
      walkTime,
      walkCount,
    };
  }, [filteredFeeding, filteredPump, filteredBottle, filteredSleep, filteredDiaper, filteredPlay, filteredWalks, volumeUnit]);

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
    { name: 'Full', value: stats.fullCount, color: '#795548' },
  ].filter((d) => d.value > 0);

  // History data - combine all sessions into a unified timeline
  const historyData = useMemo(() => {
    type HistoryItem = {
      id: string;
      type: 'breastfeeding' | 'bottle' | 'pump' | 'sleep' | 'diaper' | 'play' | 'walk';
      timestamp: string;
      duration?: number;
      details: string;
      subDetails?: string;
      color: string;
      icon: 'baby' | 'milk' | 'droplet' | 'moon' | 'sun' | 'leaf' | 'gamepad' | 'footprints';
    };

    const items: HistoryItem[] = [];

    // Add breastfeeding sessions
    if (historyFilter === 'all' || historyFilter === 'feeding') {
      feedingSessions.filter(s => !s.isActive).forEach((s) => {
        items.push({
          id: `feeding-${s.id}`,
          type: 'breastfeeding',
          timestamp: s.startTime,
          duration: s.duration,
          details: `Breastfeeding - ${BREAST_SIDE_CONFIG[s.breastSide].label}`,
          subDetails: formatDuration(s.duration),
          color: BREAST_SIDE_CONFIG[s.breastSide].color,
          icon: 'baby',
        });
      });

      // Add bottle sessions
      bottleSessions.forEach((s) => {
        items.push({
          id: `bottle-${s.id}`,
          type: 'bottle',
          timestamp: s.timestamp,
          details: `Bottle - ${BOTTLE_CONTENT_CONFIG[s.contentType].label}`,
          subDetails: `${s.volume} ${s.volumeUnit}`,
          color: BOTTLE_CONTENT_CONFIG[s.contentType].color,
          icon: 'milk',
        });
      });

      // Add pump sessions
      pumpSessions.filter(s => !s.isActive).forEach((s) => {
        items.push({
          id: `pump-${s.id}`,
          type: 'pump',
          timestamp: s.startTime,
          duration: s.duration,
          details: `Pumping - ${s.side === 'both' ? 'Both sides' : s.side.charAt(0).toUpperCase() + s.side.slice(1)}`,
          subDetails: `${s.volume} ${s.volumeUnit} • ${formatDuration(s.duration)}`,
          color: '#2196f3',
          icon: 'droplet',
        });
      });
    }

    // Add sleep sessions
    if (historyFilter === 'all' || historyFilter === 'sleep') {
      sleepSessions.filter(s => !s.isActive).forEach((s) => {
        items.push({
          id: `sleep-${s.id}`,
          type: 'sleep',
          timestamp: s.startTime,
          duration: s.duration,
          details: SLEEP_TYPE_CONFIG[s.type].label,
          subDetails: formatSleepDuration(s.duration),
          color: SLEEP_TYPE_CONFIG[s.type].color,
          icon: s.type === 'nap' ? 'sun' : 'moon',
        });
      });
    }

    // Add diaper changes
    if (historyFilter === 'all' || historyFilter === 'diaper') {
      diaperChanges.forEach((c) => {
        // Handle legacy types (dirty, both) as "full"
        const displayType = c.type === 'wet' ? 'wet' : 'full';
        const config = DIAPER_TYPE_CONFIG[displayType];
        items.push({
          id: `diaper-${c.id}`,
          type: 'diaper',
          timestamp: c.timestamp,
          details: `Diaper - ${config.label}`,
          subDetails: c.notes || undefined,
          color: config.color,
          icon: 'leaf',
        });
      });
    }

    // Add play sessions
    if (historyFilter === 'all' || historyFilter === 'play') {
      playSessions.filter(s => !s.isActive).forEach((s) => {
        items.push({
          id: `play-${s.id}`,
          type: 'play',
          timestamp: s.startTime,
          duration: s.duration,
          details: `Play - ${PLAY_TYPE_CONFIG[s.type].label}`,
          subDetails: formatDuration(s.duration),
          color: PLAY_TYPE_CONFIG[s.type].color,
          icon: 'gamepad',
        });
      });
    }

    // Add walk sessions
    if (historyFilter === 'all' || historyFilter === 'walks') {
      walkSessions.filter(s => !s.isActive).forEach((s) => {
        items.push({
          id: `walk-${s.id}`,
          type: 'walk',
          timestamp: s.startTime,
          duration: s.duration,
          details: 'Walk',
          subDetails: formatDuration(s.duration),
          color: '#8bc34a',
          icon: 'footprints',
        });
      });
    }

    // Sort by timestamp descending (most recent first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [feedingSessions, bottleSessions, pumpSessions, sleepSessions, diaperChanges, playSessions, walkSessions, historyFilter]);

  // Group history items by date
  const groupedHistory = useMemo(() => {
    const groups: Record<string, typeof historyData> = {};

    historyData.forEach((item) => {
      const dateKey = format(parseISO(item.timestamp), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      dateLabel: format(parseISO(date), 'EEEE, MMM d'),
      items,
    }));
  }, [historyData]);

  // Insights calculations
  const insights = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));

    // Helper to filter by date range
    const filterByRange = <T extends { startTime?: string; timestamp?: string }>(
      items: T[],
      start: Date,
      end: Date
    ): T[] => {
      return items.filter((item) => {
        const date = parseISO(item.startTime || item.timestamp || '');
        return isWithinInterval(date, { start, end });
      });
    };

    // This week data
    const thisWeekFeeding = filterByRange(feedingSessions, thisWeekStart, thisWeekEnd).filter(s => !s.isActive);
    const thisWeekBottle = filterByRange(bottleSessions, thisWeekStart, thisWeekEnd);
    const thisWeekSleep = filterByRange(sleepSessions, thisWeekStart, thisWeekEnd).filter(s => !s.isActive);
    const thisWeekDiaper = filterByRange(diaperChanges, thisWeekStart, thisWeekEnd);
    const thisWeekPlay = filterByRange(playSessions, thisWeekStart, thisWeekEnd).filter(s => !s.isActive);
    const thisWeekWalks = filterByRange(walkSessions, thisWeekStart, thisWeekEnd).filter(s => !s.isActive);

    // Last week data
    const lastWeekFeeding = filterByRange(feedingSessions, lastWeekStart, lastWeekEnd).filter(s => !s.isActive);
    const lastWeekBottle = filterByRange(bottleSessions, lastWeekStart, lastWeekEnd);
    const lastWeekSleep = filterByRange(sleepSessions, lastWeekStart, lastWeekEnd).filter(s => !s.isActive);
    const lastWeekDiaper = filterByRange(diaperChanges, lastWeekStart, lastWeekEnd);
    const lastWeekPlay = filterByRange(playSessions, lastWeekStart, lastWeekEnd).filter(s => !s.isActive);
    const lastWeekWalks = filterByRange(walkSessions, lastWeekStart, lastWeekEnd).filter(s => !s.isActive);

    // Calculate totals
    const thisWeekSleepTotal = thisWeekSleep.reduce((sum, s) => sum + s.duration, 0);
    const lastWeekSleepTotal = lastWeekSleep.reduce((sum, s) => sum + s.duration, 0);
    const thisWeekFeedingCount = thisWeekFeeding.length + thisWeekBottle.length;
    const lastWeekFeedingCount = lastWeekFeeding.length + lastWeekBottle.length;
    const thisWeekDiaperCount = thisWeekDiaper.length;
    const lastWeekDiaperCount = lastWeekDiaper.length;
    const thisWeekPlayTotal = thisWeekPlay.reduce((sum, s) => sum + s.duration, 0);
    const lastWeekPlayTotal = lastWeekPlay.reduce((sum, s) => sum + s.duration, 0);
    const thisWeekWalkTotal = thisWeekWalks.reduce((sum, s) => sum + s.duration, 0);
    const lastWeekWalkTotal = lastWeekWalks.reduce((sum, s) => sum + s.duration, 0);

    // Calculate percentage changes
    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const sleepChange = calcChange(thisWeekSleepTotal, lastWeekSleepTotal);
    const feedingChange = calcChange(thisWeekFeedingCount, lastWeekFeedingCount);
    const diaperChange = calcChange(thisWeekDiaperCount, lastWeekDiaperCount);
    const playChange = calcChange(thisWeekPlayTotal, lastWeekPlayTotal);
    const walkChange = calcChange(thisWeekWalkTotal, lastWeekWalkTotal);

    // Calculate daily averages for this week
    const daysInWeek = Math.min(7, Math.ceil((now.getTime() - thisWeekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const avgDailySleep = thisWeekSleepTotal / daysInWeek;
    const avgDailyFeedings = thisWeekFeedingCount / daysInWeek;
    const avgDailyDiapers = thisWeekDiaperCount / daysInWeek;
    const avgDailyPlay = thisWeekPlayTotal / daysInWeek;
    const avgDailyWalk = thisWeekWalkTotal / daysInWeek;

    // Pattern detection - find most common hours for activities
    const getHourDistribution = (items: { startTime?: string; timestamp?: string }[]): Record<number, number> => {
      const hours: Record<number, number> = {};
      items.forEach((item) => {
        const hour = parseISO(item.startTime || item.timestamp || '').getHours();
        hours[hour] = (hours[hour] || 0) + 1;
      });
      return hours;
    };

    const findPeakHours = (distribution: Record<number, number>, topN: number = 3): number[] => {
      return Object.entries(distribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([hour]) => parseInt(hour));
    };

    const formatHour = (hour: number): string => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h = hour % 12 || 12;
      return `${h}${ampm}`;
    };

    // Get patterns from all-time data for better accuracy
    const allSleepNaps = sleepSessions.filter(s => !s.isActive && s.type === 'nap');

    // Normalize feeding sessions to have a common timestamp field
    const allFeedingTimestamps = [
      ...feedingSessions.filter(s => !s.isActive).map(s => ({ timestamp: s.startTime })),
      ...bottleSessions.map(s => ({ timestamp: s.timestamp })),
    ];

    const napHours = getHourDistribution(allSleepNaps);
    const feedingHours = getHourDistribution(allFeedingTimestamps);

    const peakNapHours = findPeakHours(napHours, 2);
    const peakFeedingHours = findPeakHours(feedingHours, 3);

    // Generate pattern insights
    const patterns: string[] = [];

    if (peakNapHours.length > 0 && allSleepNaps.length >= 5) {
      patterns.push(`Usually naps around ${peakNapHours.map(formatHour).join(' and ')}`);
    }

    if (peakFeedingHours.length > 0 && allFeedingTimestamps.length >= 5) {
      patterns.push(`Most feedings happen around ${peakFeedingHours.map(formatHour).join(', ')}`);
    }

    // Calculate average nap duration
    if (allSleepNaps.length >= 3) {
      const avgNapDuration = allSleepNaps.reduce((sum, s) => sum + s.duration, 0) / allSleepNaps.length;
      const avgNapMins = Math.round(avgNapDuration / 60);
      if (avgNapMins >= 30) {
        patterns.push(`Average nap lasts about ${avgNapMins} minutes`);
      }
    }

    // Calculate average time between feedings
    if (allFeedingTimestamps.length >= 5) {
      const sortedFeedings = [...allFeedingTimestamps]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let totalGap = 0;
      let gapCount = 0;
      for (let i = 1; i < sortedFeedings.length; i++) {
        const prev = new Date(sortedFeedings[i-1].timestamp).getTime();
        const curr = new Date(sortedFeedings[i].timestamp).getTime();
        const gap = (curr - prev) / (1000 * 60 * 60); // hours
        if (gap > 0.5 && gap < 12) { // Only count reasonable gaps
          totalGap += gap;
          gapCount++;
        }
      }
      if (gapCount > 0) {
        const avgGap = totalGap / gapCount;
        patterns.push(`Feeds about every ${avgGap.toFixed(1)} hours on average`);
      }
    }

    return {
      // Weekly comparisons
      sleepChange,
      feedingChange,
      diaperChange,
      playChange,
      walkChange,
      thisWeekSleepTotal,
      lastWeekSleepTotal,
      thisWeekFeedingCount,
      lastWeekFeedingCount,
      thisWeekDiaperCount,
      lastWeekDiaperCount,
      thisWeekPlayTotal,
      lastWeekPlayTotal,
      thisWeekWalkTotal,
      lastWeekWalkTotal,
      // Daily averages
      avgDailySleep,
      avgDailyFeedings,
      avgDailyDiapers,
      avgDailyPlay,
      avgDailyWalk,
      // Patterns
      patterns,
      // Data availability
      hasEnoughData: feedingSessions.length >= 5 || sleepSessions.length >= 5,
    };
  }, [feedingSessions, bottleSessions, sleepSessions, diaperChanges, playSessions, walkSessions]);

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  const renderHistoryIcon = (icon: string, color: string) => {
    const iconClass = "w-5 h-5";
    switch (icon) {
      case 'baby':
        return <Baby className={iconClass} style={{ color }} />;
      case 'milk':
        return <Milk className={iconClass} style={{ color }} />;
      case 'droplet':
        return <Droplet className={iconClass} style={{ color }} />;
      case 'moon':
        return <Moon className={iconClass} style={{ color }} />;
      case 'sun':
        return <Sun className={iconClass} style={{ color }} />;
      case 'leaf':
        return <Leaf className={iconClass} style={{ color }} />;
      case 'gamepad':
        return <Gamepad2 className={iconClass} style={{ color }} />;
      case 'footprints':
        return <Footprints className={iconClass} style={{ color }} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <Header title="Stats" />

      <div className="px-4 py-4 space-y-4">
        {/* View Mode Toggle */}
        <div className="flex justify-center">
          <SegmentedControl
            options={viewModeOptions}
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
          />
        </div>

        {viewMode === 'stats' && (
          <>
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

          {/* Play */}
          <Card className="border-l-4 border-l-orange-500">
            <div className="flex items-center gap-2 mb-2">
              <Gamepad2 className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">Play Time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.playTime)}</p>
            <p className="text-xs text-gray-500">{stats.playCount} sessions</p>
          </Card>

          {/* Walks */}
          <Card className="border-l-4 border-l-lime-500">
            <div className="flex items-center gap-2 mb-2">
              <Footprints className="w-4 h-4 text-lime-500" />
              <span className="text-sm font-medium text-gray-600">Walks</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.walkTime)}</p>
            <p className="text-xs text-gray-500">{stats.walkCount} walks</p>
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
          </>
        )}

        {viewMode === 'history' && (
          <>
            {/* History Filter */}
            <div className="flex justify-center">
              <SegmentedControl
                options={historyFilterOptions}
                value={historyFilter}
                onChange={(value) => setHistoryFilter(value as HistoryFilter)}
              />
            </div>

            {/* History List */}
            {groupedHistory.length > 0 ? (
              <div className="space-y-4">
                {groupedHistory.map((group) => (
                  <div key={group.date}>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2 px-1">
                      {group.dateLabel}
                    </h3>
                    <Card padding="none">
                      <div className="divide-y divide-gray-50">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className="px-4 py-3 flex items-center gap-3"
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${item.color}20` }}
                            >
                              {renderHistoryIcon(item.icon, item.color)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {item.details}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span>{format(parseISO(item.timestamp), 'h:mm a')}</span>
                                {item.subDetails && (
                                  <>
                                    <span>•</span>
                                    <span>{item.subDetails}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No history to show</p>
                <p className="text-sm text-gray-400 mt-1">
                  Start tracking to see your history here
                </p>
              </Card>
            )}
          </>
        )}

        {viewMode === 'insights' && (
          <>
            {insights.hasEnoughData ? (
              <div className="space-y-4">
                {/* Weekly Summary */}
                <Card>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-500" />
                    This Week vs Last Week
                  </h3>

                  <div className="space-y-4">
                    {/* Sleep comparison */}
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Moon className="w-5 h-5 text-indigo-600" />
                        <div>
                          <p className="font-medium text-gray-900">Sleep</p>
                          <p className="text-sm text-gray-500">
                            {formatSleepDuration(insights.thisWeekSleepTotal)} this week
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        insights.sleepChange > 0
                          ? 'bg-green-100 text-green-700'
                          : insights.sleepChange < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {insights.sleepChange > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : insights.sleepChange < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                        {insights.sleepChange > 0 ? '+' : ''}{insights.sleepChange}%
                      </div>
                    </div>

                    {/* Feeding comparison */}
                    <div className="flex items-center justify-between p-3 bg-pink-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Baby className="w-5 h-5 text-pink-600" />
                        <div>
                          <p className="font-medium text-gray-900">Feedings</p>
                          <p className="text-sm text-gray-500">
                            {insights.thisWeekFeedingCount} feedings this week
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        insights.feedingChange > 0
                          ? 'bg-green-100 text-green-700'
                          : insights.feedingChange < 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {insights.feedingChange > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : insights.feedingChange < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                        {insights.feedingChange > 0 ? '+' : ''}{insights.feedingChange}%
                      </div>
                    </div>

                    {/* Diaper comparison */}
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Leaf className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">Diapers</p>
                          <p className="text-sm text-gray-500">
                            {insights.thisWeekDiaperCount} changes this week
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        insights.diaperChange >= 0
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {insights.diaperChange > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : insights.diaperChange < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                        {insights.diaperChange > 0 ? '+' : ''}{insights.diaperChange}%
                      </div>
                    </div>

                    {/* Play comparison */}
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Gamepad2 className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-medium text-gray-900">Play Time</p>
                          <p className="text-sm text-gray-500">
                            {formatDuration(insights.thisWeekPlayTotal)} this week
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        insights.playChange > 0
                          ? 'bg-green-100 text-green-700'
                          : insights.playChange < 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {insights.playChange > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : insights.playChange < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                        {insights.playChange > 0 ? '+' : ''}{insights.playChange}%
                      </div>
                    </div>

                    {/* Walks comparison */}
                    <div className="flex items-center justify-between p-3 bg-lime-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Footprints className="w-5 h-5 text-lime-600" />
                        <div>
                          <p className="font-medium text-gray-900">Walks</p>
                          <p className="text-sm text-gray-500">
                            {formatDuration(insights.thisWeekWalkTotal)} this week
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        insights.walkChange > 0
                          ? 'bg-green-100 text-green-700'
                          : insights.walkChange < 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {insights.walkChange > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : insights.walkChange < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                        {insights.walkChange > 0 ? '+' : ''}{insights.walkChange}%
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Daily Averages */}
                <Card>
                  <h3 className="font-semibold text-gray-900 mb-4">Daily Averages</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-indigo-600">
                        {formatSleepDuration(insights.avgDailySleep)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Sleep/day</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-pink-600">
                        {insights.avgDailyFeedings.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Feedings/day</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-green-600">
                        {insights.avgDailyDiapers.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Diapers/day</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-orange-600">
                        {formatDuration(insights.avgDailyPlay)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Play/day</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-lime-600">
                        {formatDuration(insights.avgDailyWalk)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Walk/day</p>
                    </div>
                  </div>
                </Card>

                {/* Detected Patterns */}
                {insights.patterns.length > 0 && (
                  <Card>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-500" />
                      Detected Patterns
                    </h3>
                    <div className="space-y-3">
                      {insights.patterns.map((pattern, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl"
                        >
                          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-amber-600">{index + 1}</span>
                          </div>
                          <p className="text-gray-700">{pattern}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Insight tip */}
                <p className="text-xs text-center text-gray-400 px-4">
                  Insights become more accurate as you track more data over time
                </p>
              </div>
            ) : (
              <Card className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Not enough data yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Keep tracking for a few more days to see insights
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
