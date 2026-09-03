import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Milk, Baby, Clock, Apple } from 'lucide-react';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { SegmentedControl } from '@/components/ui/Select';
import { getSolidFoodTimelineTimestamp } from '@/features/nutrition/solidFoodUtils';
import { EditSessionModal } from '@/components/ui/EditSessionModal';
import { MoodIndicator } from '@/components/ui/MoodSelector';
import { useAppStore } from '@/stores/appStore';
import { subscribeToFeedingSessions, subscribeToBottleSessions, subscribeToSolidFoods } from '@/lib/firestore';
import { FeedingSession, BottleSession, SolidFood, BREAST_SIDE_CONFIG, BOTTLE_CONTENT_CONFIG, FOOD_CATEGORY_CONFIG, formatDuration } from '@/types';

const BreastfeedingView = lazy(() => import('./BreastfeedingView').then((module) => ({ default: module.BreastfeedingView })));
const BottleView = lazy(() => import('./BottleView').then((module) => ({ default: module.BottleView })));
const SolidFoodsView = lazy(() => import('@/features/nutrition/SolidFoodsView').then((module) => ({ default: module.SolidFoodsView })));

type FeedingTab = 'breast' | 'bottle' | 'solids';

function FeedingModeLoading() {
  const { t } = useTranslation();

  return (
    <div className="h-64 flex items-center justify-center" role="status" aria-live="polite">
      <div className="w-9 h-9 border-4 border-gray-100 border-t-primary-500 rounded-full animate-spin" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}

export function FeedingHub() {
  const { t, i18n } = useTranslation();
  const { selectedBaby, babies, settings } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as FeedingTab | null;
  const [feedingSessions, setFeedingSessions] = useState<FeedingSession[]>([]);
  const [bottleSessions, setBottleSessions] = useState<BottleSession[]>([]);
  const [solidFoods, setSolidFoods] = useState<SolidFood[]>([]);
  const [selectedFeedingSession, setSelectedFeedingSession] = useState<FeedingSession | null>(null);
  const [selectedBottleSession, setSelectedBottleSession] = useState<BottleSession | null>(null);
  const [selectedSolidFoodId, setSelectedSolidFoodId] = useState<string | null>(null);
  const shouldAutoOpenSolidsAdd = searchParams.get('action') === 'add';
  const isHebrew = i18n.resolvedLanguage === 'he' || i18n.language === 'he';
  const dateLocale = isHebrew ? he : undefined;
  const compactDateTimeFormat = isHebrew ? 'd MMM, HH:mm' : 'MMM d, h:mm a';
  const compactDateFormat = isHebrew ? 'd MMM' : 'MMM d';
  const tabOptions = useMemo(
    () => [
      { value: 'breast', label: t('feedingScreen.breast'), icon: <Baby className="w-4 h-4" /> },
      { value: 'bottle', label: t('feedingScreen.bottle'), icon: <Milk className="w-4 h-4" /> },
      { value: 'solids', label: t('feedingScreen.solids'), icon: <Apple className="w-4 h-4" /> },
    ],
    [t]
  );
  const getSideLabel = useCallback(
    (side: FeedingSession['breastSide']) => (side === 'left' ? t('activity.left') : t('activity.right')),
    [t]
  );
  const getSideInitial = useCallback(
    (side: FeedingSession['breastSide']) => {
      if (!isHebrew) return side === 'left' ? 'L' : 'R';
      return side === 'left' ? 'ש' : 'י';
    },
    [isHebrew]
  );
  const getContentTypeLabel = useCallback(
    (contentType: BottleSession['contentType']) => {
      if (contentType === 'breastMilk') return t('activity.breastMilk');
      if (contentType === 'formula') return t('activity.formula');
      return t('activity.mixed');
    },
    [t]
  );
  const getFoodCategoryLabel = useCallback(
    (category: SolidFood['category']) => t(`foodCategory.${category}`),
    [t]
  );
  const formatLocalizedDuration = useCallback(
    (seconds: number) => {
      if (!isHebrew) return formatDuration(seconds);

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;

      if (hours > 0) {
        return minutes > 0 ? `${hours} שע׳ ${minutes} דק׳` : `${hours} שע׳`;
      }
      if (minutes > 0) {
        return remainingSeconds > 0 ? `${minutes} דק׳ ${remainingSeconds} שנ׳` : `${minutes} דק׳`;
      }
      return `${remainingSeconds} שנ׳`;
    },
    [isHebrew]
  );

  const activeTab: FeedingTab =
    requestedTab === 'breast' || requestedTab === 'bottle' || requestedTab === 'solids'
      ? requestedTab
      : settings?.feedingTypePreference === 'formula'
        ? 'bottle'
        : 'breast';
  const navigate = useNavigate();

  const handleTabChange = (value: string) => {
    const tab = value as FeedingTab;
    setSearchParams(tab === 'solids' ? { tab, action: 'add' } : { tab }, { replace: true });
  };

  const openSolidFoodForEdit = (foodId: string) => {
    setSelectedSolidFoodId(foodId);
    setSearchParams({ tab: 'solids' }, { replace: true });
  };

  const clearSelectedSolidFoodId = useCallback(() => {
    setSelectedSolidFoodId(null);
  }, []);

  // Subscribe to both feeding types
  useEffect(() => {
    if (!selectedBaby) return;

    const unsubFeeding = subscribeToFeedingSessions(selectedBaby.id, setFeedingSessions);
    const unsubBottle = subscribeToBottleSessions(selectedBaby.id, setBottleSessions);
    const unsubSolids = subscribeToSolidFoods(selectedBaby.id, setSolidFoods);

    return () => {
      unsubFeeding();
      unsubBottle();
      unsubSolids();
    };
  }, [selectedBaby]);

  // Combine and sort all feeding sessions
  const recentFeedings = useMemo(() => {
    const combined: Array<{
      id: string;
      type: 'breast' | 'bottle' | 'solid';
      timestamp: string;
      session: FeedingSession | BottleSession | SolidFood;
    }> = [];

    // Add completed breastfeeding sessions
    feedingSessions
      .filter(s => !s.isActive)
      .forEach(s => {
        combined.push({
          id: s.id,
          type: 'breast',
          timestamp: s.startTime,
          session: s,
        });
      });

    // Add bottle sessions
    bottleSessions.forEach(s => {
      combined.push({
        id: s.id,
        type: 'bottle',
        timestamp: s.timestamp,
        session: s,
      });
    });

    solidFoods.forEach((food) => {
      combined.push({
        id: food.id,
        type: 'solid',
        timestamp: getSolidFoodTimelineTimestamp(food),
        session: food,
      });
    });

    // Sort by timestamp descending (most recent first)
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return combined.slice(0, 10);
  }, [feedingSessions, bottleSessions, solidFoods]);

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  return (
    <div>
      <Header
        title={t('nav.feed')}
        rightAction={activeTab !== 'solids' ? (
          <button
            onClick={() => navigate('/more/milk-stash')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={t('features.milkStash')}
          >
            <Milk className="w-5 h-5 text-gray-600" />
          </button>
        ) : undefined}
      />

      <div className="px-4 py-4">
        {/* Tab Selector */}
        <div className="flex justify-center mb-6">
          <SegmentedControl
            options={tabOptions}
            value={activeTab}
            onChange={handleTabChange}
            fullWidth
          />
        </div>

        {/* Tab Content */}
        {selectedBaby && (
          <Suspense fallback={<FeedingModeLoading />}>
            {activeTab === 'breast' && <BreastfeedingView baby={selectedBaby} />}
            {activeTab === 'bottle' && <BottleView baby={selectedBaby} />}
            {activeTab === 'solids' && (
              <SolidFoodsView
                embedded
                foods={solidFoods}
                autoOpenAdd={shouldAutoOpenSolidsAdd}
                editFoodId={selectedSolidFoodId}
                onEditFoodOpened={clearSelectedSolidFoodId}
              />
            )}
          </Suspense>
        )}

        {/* Combined Recent Feedings */}
        {activeTab !== 'solids' && recentFeedings.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">{t('feedingScreen.recentFeedings')}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {recentFeedings.map((item) => {
                if (item.type === 'breast') {
                  const session = item.session as FeedingSession;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedFeedingSession(session)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${BREAST_SIDE_CONFIG[session.breastSide].color} 0%, ${BREAST_SIDE_CONFIG[session.breastSide].color}cc 100%)`
                        }}
                      >
                        {getSideInitial(session.breastSide)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {t('feedingScreen.breast')} • {getSideLabel(session.breastSide)}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium">{formatLocalizedDuration(session.duration)}</span>
                          <span>•</span>
                          <span className="truncate">
                            {format(parseISO(session.startTime), compactDateTimeFormat, { locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                      <MoodIndicator babyMood={session.babyMood} momMood={session.momMood} size="sm" />
                    </button>
                  );
                } else if (item.type === 'bottle') {
                  const session = item.session as BottleSession;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedBottleSession(session)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: BOTTLE_CONTENT_CONFIG[session.contentType].color }}
                      >
                        <Milk className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {t('feedingScreen.bottle')} • {session.volume} {session.volumeUnit}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium">{getContentTypeLabel(session.contentType)}</span>
                          <span>•</span>
                          <span className="truncate">
                            {format(parseISO(session.timestamp), compactDateTimeFormat, { locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                      <MoodIndicator babyMood={session.babyMood} size="sm" />
                    </button>
                  );
                } else {
                  const food = item.session as SolidFood;
                  const category = FOOD_CATEGORY_CONFIG[food.category];
                  return (
                    <button
                      key={item.id}
                      onClick={() => openSolidFoodForEdit(food.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: category.color }}
                      >
                        <Apple className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{t('feedingScreen.solids')} • {food.foodName}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium">{getFoodCategoryLabel(food.category)}</span>
                          <span>•</span>
                          <span className="truncate">
                            {format(parseISO(item.timestamp), food.timestamp ? compactDateTimeFormat : compactDateFormat, {
                              locale: dateLocale,
                            })}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
              })}
            </div>
          </div>
        )}

        {/* Edit Session Modals */}
        {selectedFeedingSession && (
          <EditSessionModal
            isOpen={!!selectedFeedingSession}
            onClose={() => setSelectedFeedingSession(null)}
            sessionType="breastfeeding"
            session={selectedFeedingSession}
          />
        )}
        {selectedBottleSession && (
          <EditSessionModal
            isOpen={!!selectedBottleSession}
            onClose={() => setSelectedBottleSession(null)}
            sessionType="bottle"
            session={selectedBottleSession}
          />
        )}
      </div>
    </div>
  );
}
