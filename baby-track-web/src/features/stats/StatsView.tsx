import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/Select';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import { formatDuration, formatSleepDuration } from '@/types';
import {
  Baby,
  BarChart3,
  Calendar,
  Clock,
  Droplet,
  Footprints,
  Gamepad2,
  History,
  Leaf,
  Lightbulb,
  Milk,
  Moon,
  Sun,
  Info,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildFeedingChartData,
  buildHistoryItems,
  buildInsights,
  buildStatsSummary,
  formatHoursAsFriendlyDuration,
  getDateRange,
  getFilteredStatsData,
  groupHistoryItems,
  type HistoryFilter,
  type HistoryIcon,
  type InsightPatternCard,
  type InsightsSummary,
  type TimeFilter,
  type TimelineLane,
  type WeeklyInsightMetric,
} from './statsProcessing';
import { useStatsData } from './useStatsData';

type ViewMode = 'stats' | 'history' | 'insights';

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

type WeeklyCardTone = 'sleep' | 'feeding' | 'bottle' | 'diaper' | 'play' | 'walk';

interface WeeklyCardPresentation {
  id: WeeklyInsightMetric['id'];
  title: string;
  primary: string;
  secondary: string;
  description: string;
  trendSummary: string;
  tone: WeeklyCardTone;
  icon: ReactNode;
  badgeLabel: string;
  badgeClassName: string;
}

interface AverageCardPresentation {
  id: string;
  title: string;
  value: string;
  rawValue: number;
  icon: ReactNode;
  toneClassName: string;
  surfaceClassName: string;
}

function renderHistoryIcon(icon: HistoryIcon, color: string) {
  const iconClass = 'w-5 h-5';

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
}

function getWeeklyMetricIcon(id: WeeklyInsightMetric['id']) {
  switch (id) {
    case 'sleep':
      return <Moon className="w-5 h-5" />;
    case 'nursing':
      return <Baby className="w-5 h-5" />;
    case 'bottle':
      return <Milk className="w-5 h-5" />;
    case 'diaper':
      return <Leaf className="w-5 h-5" />;
    case 'play':
      return <Gamepad2 className="w-5 h-5" />;
    case 'walk':
      return <Footprints className="w-5 h-5" />;
    default:
      return <BarChart3 className="w-5 h-5" />;
  }
}

function getWeeklyCardClasses(tone: WeeklyCardTone) {
  switch (tone) {
    case 'sleep':
      return {
        card: 'from-indigo-50 to-white border-indigo-100',
        icon: 'bg-indigo-100 text-indigo-600',
      };
    case 'feeding':
      return {
        card: 'from-blue-50 to-white border-blue-100',
        icon: 'bg-blue-100 text-blue-600',
      };
    case 'bottle':
      return {
        card: 'from-cyan-50 to-white border-cyan-100',
        icon: 'bg-cyan-100 text-cyan-600',
      };
    case 'diaper':
      return {
        card: 'from-green-50 to-white border-green-100',
        icon: 'bg-green-100 text-green-600',
      };
    case 'play':
      return {
        card: 'from-orange-50 to-white border-orange-100',
        icon: 'bg-orange-100 text-orange-600',
      };
    case 'walk':
      return {
        card: 'from-lime-50 to-white border-lime-100',
        icon: 'bg-lime-100 text-lime-700',
      };
    default:
      return {
        card: 'from-gray-50 to-white border-gray-100',
        icon: 'bg-gray-100 text-gray-600',
      };
  }
}

function formatWeeklyMetricValue(metric: WeeklyInsightMetric): string {
  switch (metric.id) {
    case 'sleep':
      return formatSleepDuration(metric.currentValue);
    case 'play':
    case 'walk':
      return formatDuration(metric.currentValue);
    default:
      return `${metric.currentValue}`;
  }
}

function formatWeeklyMetricPrevious(metric: WeeklyInsightMetric): string {
  switch (metric.id) {
    case 'sleep':
      return `${formatSleepDuration(metric.previousValue)} last week`;
    case 'play':
    case 'walk':
      return `${formatDuration(metric.previousValue)} last week`;
    default:
      return `${metric.previousValue} last week`;
  }
}

function getWeeklyMetricTitle(metric: WeeklyInsightMetric): string {
  switch (metric.id) {
    case 'sleep':
      return 'Sleep Trend';
    case 'nursing':
      return 'Nursing Trend';
    case 'bottle':
      return 'Bottle Trend';
    case 'diaper':
      return 'Diaper Trend';
    case 'play':
      return 'Play Trend';
    case 'walk':
      return 'Walk Trend';
    default:
      return 'Trend';
  }
}

function getWeeklyMetricDescription(metric: WeeklyInsightMetric): string {
  switch (metric.id) {
    case 'sleep':
      return 'Total sleep this week';
    case 'nursing':
      return 'Completed nursing sessions';
    case 'bottle':
      return 'Bottle feeds logged';
    case 'diaper':
      return 'Diaper changes logged';
    case 'play':
      return 'Tracked play time';
    case 'walk':
      return 'Tracked walk time';
    default:
      return 'This week';
  }
}

function getWeeklyMetricTone(metric: WeeklyInsightMetric): WeeklyCardTone {
  switch (metric.id) {
    case 'sleep':
      return 'sleep';
    case 'nursing':
      return 'feeding';
    case 'bottle':
      return 'bottle';
    case 'diaper':
      return 'diaper';
    case 'play':
      return 'play';
    case 'walk':
      return 'walk';
    default:
      return 'feeding';
  }
}

function getTrendBadge(metric: WeeklyInsightMetric) {
  const absoluteChange = Math.abs(metric.change);

  if (absoluteChange === 0) {
    return { label: 'Steady routine', className: 'bg-gray-100 text-gray-600' };
  }

  if ((metric.id === 'nursing' || metric.id === 'bottle') && absoluteChange <= 10) {
    return {
      label: metric.change > 0 ? 'Slightly more often' : 'Slightly less often',
      className: 'bg-blue-100 text-blue-700',
    };
  }

  if (metric.id === 'sleep') {
    if (metric.change > 0) {
      return {
        label: absoluteChange >= 20 ? 'Sleeping more' : 'A little more sleep',
        className: 'bg-green-100 text-green-700',
      };
    }
    if (metric.change < 0) {
      return {
        label: absoluteChange >= 20 ? 'Sleeping less' : 'A little less sleep',
        className: 'bg-red-100 text-red-700',
      };
    }
  }

  if (metric.change > 0) {
    return {
      label: absoluteChange >= 20 ? 'Trending up' : 'A little higher',
      className: 'bg-green-100 text-green-700',
    };
  }

  if (metric.change < 0) {
    return {
      label: absoluteChange >= 20 ? 'Trending down' : 'A little lower',
      className: 'bg-amber-100 text-amber-700',
    };
  }

  return { label: 'Steady routine', className: 'bg-gray-100 text-gray-600' };
}

function getTrendSummary(change: number): string {
  const absoluteChange = Math.abs(change);

  if (absoluteChange === 0) {
    return 'Very close to last week';
  }

  if (absoluteChange >= 50) {
    return `Significantly ${change > 0 ? 'higher' : 'lower'} than last week`;
  }

  if (absoluteChange >= 20) {
    return `Noticeably ${change > 0 ? 'higher' : 'lower'} than last week`;
  }

  if (absoluteChange >= 10) {
    return `A little ${change > 0 ? 'higher' : 'lower'} than last week`;
  }

  return 'Almost the same as last week';
}

function buildWeeklyCardPresentation(metric: WeeklyInsightMetric): WeeklyCardPresentation {
  const badge = getTrendBadge(metric);

  return {
    id: metric.id,
    title: getWeeklyMetricTitle(metric),
    primary: formatWeeklyMetricValue(metric),
    secondary: formatWeeklyMetricPrevious(metric),
    description: getWeeklyMetricDescription(metric),
    trendSummary: getTrendSummary(metric.change),
    tone: getWeeklyMetricTone(metric),
    icon: getWeeklyMetricIcon(metric.id),
    badgeLabel: badge.label,
    badgeClassName: badge.className,
  };
}

function buildAverageCards(insights: InsightsSummary): AverageCardPresentation[] {
  const cards: AverageCardPresentation[] = [
    {
      id: 'sleep',
      title: 'Sleep/day',
      value: formatSleepDuration(insights.averages.sleepPerDay),
      rawValue: insights.averages.sleepPerDay,
      icon: <Moon className="w-4 h-4 text-indigo-600" />,
      toneClassName: 'text-indigo-600',
      surfaceClassName: 'bg-indigo-50 border-indigo-100',
    },
    {
      id: 'diapers',
      title: 'Diapers/day',
      value: insights.averages.diapersPerDay.toFixed(1),
      rawValue: insights.averages.diapersPerDay,
      icon: <Leaf className="w-4 h-4 text-green-600" />,
      toneClassName: 'text-green-600',
      surfaceClassName: 'bg-green-50 border-green-100',
    },
    {
      id: 'play',
      title: 'Play/day',
      value: formatDuration(insights.averages.playPerDay),
      rawValue: insights.averages.playPerDay,
      icon: <Gamepad2 className="w-4 h-4 text-orange-600" />,
      toneClassName: 'text-orange-600',
      surfaceClassName: 'bg-orange-50 border-orange-100',
    },
    {
      id: 'walk',
      title: 'Walk/day',
      value: formatDuration(insights.averages.walkPerDay),
      rawValue: insights.averages.walkPerDay,
      icon: <Footprints className="w-4 h-4 text-lime-700" />,
      toneClassName: 'text-lime-600',
      surfaceClassName: 'bg-lime-50 border-lime-100',
    },
  ];

  if (insights.weekly.nursing.currentValue > 0 || insights.weekly.nursing.previousValue > 0) {
    cards.splice(1, 0, {
      id: 'nursing',
      title: 'Nursing/day',
      value: insights.averages.nursingPerDay.toFixed(1),
      rawValue: insights.averages.nursingPerDay,
      icon: <Baby className="w-4 h-4 text-pink-600" />,
      toneClassName: 'text-pink-600',
      surfaceClassName: 'bg-pink-50 border-pink-100',
    });
  }

  if (insights.weekly.bottle.currentValue > 0 || insights.weekly.bottle.previousValue > 0) {
    cards.splice(2, 0, {
      id: 'bottle',
      title: 'Bottles/day',
      value: insights.averages.bottlePerDay.toFixed(1),
      rawValue: insights.averages.bottlePerDay,
      icon: <Milk className="w-4 h-4 text-cyan-600" />,
      toneClassName: 'text-cyan-600',
      surfaceClassName: 'bg-cyan-50 border-cyan-100',
    });
  }

  return cards.filter((card) => card.rawValue > 0);
}

function buildTimelineLanes(insights: InsightsSummary): TimelineLane[] {
  return [insights.timeline.sleep, insights.timeline.feeding].filter((lane) =>
    lane.hourlyIntensity.some((intensity) => intensity > 0)
  );
}

function formatMinutesUntil(targetIso: string | null, nowMs: number): string {
  if (!targetIso) {
    return 'Learning next nap window';
  }

  const targetMs = parseISO(targetIso).getTime();
  const diffMinutes = Math.round((targetMs - nowMs) / (1000 * 60));

  if (diffMinutes <= 0) {
    return 'Nap window is open now';
  }

  if (diffMinutes < 60) {
    return `Next nap in ${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return minutes === 0 ? `Next nap in ${hours} hr` : `Next nap in ${hours} hr ${minutes} min`;
}

function getPatternCardStyles(card: InsightPatternCard) {
  switch (card.tone) {
    case 'indigo':
      return 'border-indigo-100 bg-indigo-50';
    case 'blue':
      return 'border-blue-100 bg-blue-50';
    case 'green':
      return 'border-green-100 bg-green-50';
    case 'amber':
    default:
      return 'border-amber-100 bg-amber-50';
  }
}

function getPatternCardIcon(card: InsightPatternCard) {
  switch (card.id) {
    case 'nap-window':
    case 'wake-window':
      return <Moon className="w-5 h-5 text-indigo-600" />;
    case 'feeding-window':
      return <Baby className="w-5 h-5 text-blue-600" />;
    case 'nap-length':
      return <Clock className="w-5 h-5 text-amber-600" />;
    case 'feeding-gap':
      return <Milk className="w-5 h-5 text-green-600" />;
    default:
      return <Lightbulb className="w-5 h-5 text-amber-600" />;
  }
}

function InsightTrendCard({ card }: { card: WeeklyCardPresentation }) {
  const classes = getWeeklyCardClasses(card.tone);

  return (
    <Card className={clsx('border bg-gradient-to-br', classes.card)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={clsx('w-11 h-11 rounded-2xl flex items-center justify-center', classes.icon)}>
            {card.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{card.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
          </div>
        </div>
        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap', card.badgeClassName)}>
          {card.badgeLabel}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-3xl font-bold text-gray-900">{card.primary}</p>
        <p className="text-sm text-gray-500 mt-1">{card.secondary}</p>
        <p className="text-sm font-medium text-gray-700 mt-3">{card.trendSummary}</p>
      </div>
    </Card>
  );
}

function InsightTimelineLane({ lane }: { lane: TimelineLane }) {
  const isSleep = lane.id === 'sleep';
  const activeColor = isSleep ? '#8ea8ff' : '#f4b37d';
  const baseColor = isSleep ? 'rgba(142, 168, 255, 0.10)' : 'rgba(244, 179, 125, 0.10)';

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-gray-900">{lane.title}</p>
        <p className="text-xs text-gray-500">{lane.subtitle}</p>
      </div>

      <div className="flex gap-1.5">
        {lane.hourlyIntensity.map((intensity, index) => (
          <div
            key={`${lane.id}-${index}`}
            className={clsx(
              'flex-1 rounded-xl border transition-all',
              lane.peakHours.includes(index) ? 'border-gray-300' : 'border-transparent'
            )}
            style={{
              height: '38px',
              backgroundColor: intensity > 0 ? activeColor : baseColor,
              opacity: intensity > 0 ? 0.22 + intensity * 0.78 : 1,
              boxShadow: intensity > 0 ? `inset 0 -${6 + intensity * 18}px 0 rgba(255,255,255,0.22)` : 'none',
            }}
            title={`${index % 12 || 12}${index >= 12 ? 'PM' : 'AM'}${lane.peakHours.includes(index) ? ' • peak window' : ''}`}
          />
        ))}
      </div>

      <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-gray-400">
        <span>12A</span>
        <span>6A</span>
        <span>12P</span>
        <span>6P</span>
        <span>11P</span>
      </div>
    </div>
  );
}

function ConsistencyRing({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r="44" stroke="#d1fae5" strokeWidth="10" fill="none" />
          <circle
            cx="56"
            cy="56"
            r="44"
            stroke="url(#consistencyGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
          <defs>
            <linearGradient id="consistencyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#84cc16" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{score}%</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Consistency</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <span
            className="inline-flex items-center text-gray-400"
            title="Consistency compares how closely daily sleep and feeding schedules overlap across the last 7 days."
          >
            <Info className="w-4 h-4" />
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">How closely daily feeding and sleep timing overlap across the last week.</p>
      </div>
    </div>
  );
}

export function StatsView() {
  useAuth();
  const { selectedBaby, babies, settings } = useAppStore();
  const [, startViewTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>('stats');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());

  const volumeUnit = settings?.preferredVolumeUnit || 'oz';
  const statsData = useStatsData(selectedBaby?.id ?? null);

  const dateRange = useMemo(() => getDateRange(timeFilter), [timeFilter]);

  const filteredStatsData = useMemo(
    () => (viewMode === 'stats' ? getFilteredStatsData(statsData, dateRange) : null),
    [dateRange, statsData, viewMode]
  );

  const stats = useMemo(
    () => (filteredStatsData ? buildStatsSummary(filteredStatsData, volumeUnit) : null),
    [filteredStatsData, volumeUnit]
  );

  const feedingChartData = useMemo(
    () => (filteredStatsData ? buildFeedingChartData(filteredStatsData, timeFilter, volumeUnit) : []),
    [filteredStatsData, timeFilter, volumeUnit]
  );

  const diaperPieData = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [
      { name: 'Wet', value: stats.wetCount, color: '#2196f3' },
      { name: 'Full', value: stats.fullCount, color: '#795548' },
    ].filter((entry) => entry.value > 0);
  }, [stats]);

  const groupedHistory = useMemo(() => {
    if (viewMode !== 'history') {
      return [];
    }

    return groupHistoryItems(buildHistoryItems(statsData, historyFilter));
  }, [historyFilter, statsData, viewMode]);

  const insights = useMemo(
    () => (viewMode === 'insights' ? buildInsights(statsData) : null),
    [statsData, viewMode]
  );

  const weeklyCards = useMemo(() => {
    if (!insights) {
      return [];
    }

    return [
      insights.weekly.sleep,
      insights.weekly.nursing,
      insights.weekly.bottle,
      insights.weekly.diaper,
      insights.weekly.play,
      insights.weekly.walk,
    ]
      .filter((metric) => metric.currentValue > 0 || metric.previousValue > 0)
      .map(buildWeeklyCardPresentation);
  }, [insights]);

  const averageCards = useMemo(
    () => (insights ? buildAverageCards(insights) : []),
    [insights]
  );

  const timelineLanes = useMemo(
    () => (insights ? buildTimelineLanes(insights) : []),
    [insights]
  );

  const sweetSpotCountdown = useMemo(
    () => (insights ? formatMinutesUntil(insights.sweetSpot.recommendedTime, countdownNowMs) : 'Learning next nap window'),
    [countdownNowMs, insights]
  );

  useEffect(() => {
    if (viewMode !== 'insights') {
      return;
    }

    const interval = window.setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [viewMode]);

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  return (
    <div>
      <Header title="Stats" />

      <div className="px-4 py-4 space-y-4">
        <div className="flex justify-center">
          <SegmentedControl
            options={viewModeOptions}
            value={viewMode}
            onChange={(value) => startViewTransition(() => setViewMode(value as ViewMode))}
          />
        </div>

        {viewMode === 'stats' && stats && (
          <>
            <div className="flex justify-center">
              <SegmentedControl
                options={filterOptions}
                value={timeFilter}
                onChange={(value) => startViewTransition(() => setTimeFilter(value as TimeFilter))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-l-4 border-l-pink-500">
                <div className="flex items-center gap-2 mb-2">
                  <Baby className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-medium text-gray-600">Nursing</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.nursingCount}</p>
                <p className="text-xs text-gray-500">{formatDuration(stats.feedingTime)} total</p>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Droplet className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-600">Pumped</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.pumpVolume.toFixed(1)} {volumeUnit}</p>
                <p className="text-xs text-gray-500">{stats.pumpCount} sessions</p>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <div className="flex items-center gap-2 mb-2">
                  <Milk className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-600">Bottles</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.bottleVolume.toFixed(1)} {volumeUnit}</p>
                <p className="text-xs text-gray-500">{stats.bottleCount} feedings</p>
              </Card>

              <Card className="border-l-4 border-l-indigo-500">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-600">Sleep</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatSleepDuration(stats.sleepTime)}</p>
                <p className="text-xs text-gray-500">{stats.napCount} naps, {stats.nightCount} night</p>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <div className="flex items-center gap-2 mb-2">
                  <Gamepad2 className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-600">Play Time</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.playTime)}</p>
                <p className="text-xs text-gray-500">{stats.playCount} sessions</p>
              </Card>

              <Card className="border-l-4 border-l-lime-500">
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="w-4 h-4 text-lime-500" />
                  <span className="text-sm font-medium text-gray-600">Walks</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.walkTime)}</p>
                <p className="text-xs text-gray-500">{stats.walkCount} walks</p>
              </Card>
            </div>

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
                            <Cell key={`diaper-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {diaperPieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
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
            <div className="flex justify-center">
              <SegmentedControl
                options={historyFilterOptions}
                value={historyFilter}
                onChange={(value) => startViewTransition(() => setHistoryFilter(value as HistoryFilter))}
              />
            </div>

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
                          <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${item.color}20` }}
                            >
                              {renderHistoryIcon(item.icon, item.color)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{item.details}</p>
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

        {viewMode === 'insights' && insights && (
          <>
            {insights.hasEnoughData ? (
              <div className="space-y-5">
                <Card className="overflow-hidden border border-indigo-100 shadow-sm bg-gradient-to-br from-indigo-50 via-white to-sky-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 border border-indigo-100 shadow-sm">
                        <Moon className="w-3.5 h-3.5" />
                        Predictive Insight
                      </div>
                      <h3 className="text-2xl font-bold mt-3 text-gray-900">Sweet Spot</h3>
                      <p className="text-sm text-gray-600 mt-2 max-w-md">{insights.headline}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-indigo-100">
                      <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-3xl bg-white/90 border border-white shadow-sm p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Next nap forecast</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{sweetSpotCountdown}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {insights.sweetSpot.recommendedTime
                          ? `Suggested around ${format(parseISO(insights.sweetSpot.recommendedTime), 'h:mm a')}`
                          : 'Needs a few more completed sleep sessions'}
                      </p>
                      <p className="text-sm text-gray-500 mt-4">
                        {insights.sweetSpot.averageWakeWindowHours !== null
                          ? `Average wake window: ${formatHoursAsFriendlyDuration(insights.sweetSpot.averageWakeWindowHours)}`
                          : 'We are still learning wake windows'}
                      </p>
                      {insights.sweetSpot.lastWakeTime && (
                        <p className="text-xs text-gray-500 mt-3">
                          Last wake-up: {format(parseISO(insights.sweetSpot.lastWakeTime), 'h:mm a')}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      {insights.routineSummary.length > 0 ? (
                        insights.routineSummary.slice(0, 3).map((item) => (
                          <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 border border-white shadow-sm">
                            {item}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 border border-white shadow-sm">
                          Keep logging a few more sessions to unlock a personalized routine summary.
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Feeding Sweet Spot</p>
                        <p className="text-xs text-gray-500 mt-0.5">Suggested next feeding time from average awake gap</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-cyan-100">
                        <Milk className="w-5 h-5 text-cyan-600" />
                      </div>
                    </div>
                    <div className="mt-5">
                      <p className="text-3xl font-bold text-gray-900">
                        {insights.feedingSweetSpot.recommendedTime
                          ? format(parseISO(insights.feedingSweetSpot.recommendedTime), 'h:mm a')
                          : 'Tracking...'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {insights.feedingSweetSpot.averageGapHours !== null
                          ? `Average awake feeding gap: ${formatHoursAsFriendlyDuration(insights.feedingSweetSpot.averageGapHours)}`
                          : 'Needs a few more daytime feeding patterns'}
                      </p>
                      {insights.feedingSweetSpot.lastFeedingTime && (
                        <p className="text-xs text-gray-500 mt-3">
                          Last feeding: {format(parseISO(insights.feedingSweetSpot.lastFeedingTime), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </Card>

                  <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Consistency Score</p>
                        <p className="text-xs text-gray-500 mt-0.5">How steady the last 7 days have felt</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ConsistencyRing score={insights.consistencyScore} label={insights.consistencyLabel} />
                    </div>
                  </Card>
                </div>

                {timelineLanes.length > 0 && (
                  <Card className="border border-slate-100 bg-gradient-to-br from-white to-slate-50 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-base">⏰</span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Day Heatmap</h3>
                      <p className="text-xs text-gray-500 mt-0.5">A softer view of when routines cluster across the day</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {timelineLanes.map((lane) => (
                      <InsightTimelineLane key={lane.id} lane={lane} />
                    ))}
                  </div>
                  </Card>
                )}

                {weeklyCards.length > 0 && (
                  <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="text-base">📈</span>
                    <h3 className="text-sm font-bold text-gray-700">What Changed This Week</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {weeklyCards.map((card) => (
                      <InsightTrendCard key={card.id} card={card} />
                    ))}
                  </div>
                  </div>
                )}

                {averageCards.length > 0 && (
                  <Card>
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900">What a Typical Day Looks Like</h3>
                    <p className="text-xs text-gray-500 mt-1">Based on the days you tracked activity this week</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {averageCards.map((card) => (
                      <div key={card.id} className={clsx('p-3 rounded-2xl border flex items-center gap-3', card.surfaceClassName)}>
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-white/70">
                          {card.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-500">{card.title}</p>
                          <p className={clsx('text-xl font-bold mt-0.5', card.toneClassName)}>{card.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  </Card>
                )}

                {insights.patternCards.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="text-base">🧠</span>
                      <h3 className="text-sm font-bold text-gray-700">Patterns We Noticed</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {insights.patternCards.map((card) => (
                        <Card key={card.id} className={clsx('border', getPatternCardStyles(card))}>
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white/70 flex items-center justify-center flex-shrink-0">
                              {getPatternCardIcon(card)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                              <p className="text-sm text-gray-600 mt-1">{card.description}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-center text-gray-400 px-4">
                  Insights are recalculated from your live tracking data and improve over time.
                </p>
              </div>
            ) : (
              <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm">
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Insights are warming up</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                    Track a few more feeding or sleep events and we will start surfacing trends, routines, and comparisons.
                  </p>

                  <div className="mt-6 max-w-sm mx-auto text-left">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>Progress to unlock</span>
                      <span>{Math.min(insights.readinessCount, insights.readinessTarget)}/{insights.readinessTarget}</span>
                    </div>
                    <div className="h-3 bg-white rounded-full overflow-hidden border border-blue-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                        style={{ width: `${insights.readinessPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      {insights.readinessCount >= insights.readinessTarget
                        ? 'Enough data is available. Keep tracking and insights will appear shortly.'
                        : `${insights.readinessTarget - insights.readinessCount} more feed or sleep logs to go.`}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
