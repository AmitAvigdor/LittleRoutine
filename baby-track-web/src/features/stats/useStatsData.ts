import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  getActivityPage,
  subscribeToBottleSessions,
  subscribeToDiaperChanges,
  subscribeToFeedingSessions,
  subscribeToPlaySessions,
  subscribeToPumpSessions,
  subscribeToSleepSessions,
  subscribeToWalkSessions,
  type ActivityCollectionKey,
  type CollectionPageCursor,
} from '@/lib/firestore';
import { EMPTY_STATS_DATA, type StatsDataSnapshot } from './statsProcessing';

const STATS_PAGE_SIZE = 100;
const activityKeys: ActivityCollectionKey[] = [
  'feedingSessions',
  'pumpSessions',
  'bottleSessions',
  'sleepSessions',
  'diaperChanges',
  'playSessions',
  'walkSessions',
];
const activitySortFields: Record<ActivityCollectionKey, string> = {
  feedingSessions: 'startTime',
  pumpSessions: 'startTime',
  bottleSessions: 'timestamp',
  sleepSessions: 'startTime',
  diaperChanges: 'timestamp',
  playSessions: 'startTime',
  walkSessions: 'startTime',
};

type ActivityItem = StatsDataSnapshot[ActivityCollectionKey][number];
type ActivityBuckets = Record<ActivityCollectionKey, ActivityItem[]>;

export interface StatsDataResult {
  data: StatsDataSnapshot;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: boolean;
  loadMore: () => Promise<void>;
}

function createEmptyActivityBuckets(): ActivityBuckets {
  return {
    feedingSessions: [],
    pumpSessions: [],
    bottleSessions: [],
    sleepSessions: [],
    diaperChanges: [],
    playSessions: [],
    walkSessions: [],
  };
}

function toStatsData(buckets: ActivityBuckets): StatsDataSnapshot {
  return buckets as unknown as StatsDataSnapshot;
}

function mergeActivityItems(
  key: ActivityCollectionKey,
  ...groups: ActivityItem[][]
): ActivityItem[] {
  const uniqueItems = new Map<string, ActivityItem>();

  groups.forEach((items) => {
    items.forEach((item) => uniqueItems.set(item.id, item));
  });

  const sortField = activitySortFields[key];
  return Array.from(uniqueItems.values()).sort((a, b) => {
    const aValue = (a as unknown as Record<string, string>)[sortField];
    const bValue = (b as unknown as Record<string, string>)[sortField];
    const timeDifference = new Date(bValue).getTime() - new Date(aValue).getTime();

    return timeDifference || b.id.localeCompare(a.id);
  });
}

function getLastItemCursor(
  key: ActivityCollectionKey,
  items: ActivityItem[]
): CollectionPageCursor | null {
  const lastItem = items.at(-1);
  if (!lastItem) return null;

  const sortValue = (lastItem as unknown as Record<string, unknown>)[activitySortFields[key]];
  if (sortValue === undefined) return null;

  return {
    sortValue,
    documentId: lastItem.id,
  };
}

export function useStatsData(babyId: string | null): StatsDataResult {
  const [state, setState] = useState<{
    babyId: string | null;
    data: StatsDataSnapshot;
  }>({
    babyId: null,
    data: EMPTY_STATS_DATA,
  });
  const [paginationState, setPaginationState] = useState<{
    babyId: string | null;
    hasMore: boolean;
    isLoadingMore: boolean;
    loadMoreError: boolean;
  }>({
    babyId: null,
    hasMore: false,
    isLoadingMore: false,
    loadMoreError: false,
  });
  const activeBabyIdRef = useRef<string | null>(null);
  const liveItemsRef = useRef<ActivityBuckets>(createEmptyActivityBuckets());
  const olderItemsRef = useRef<ActivityBuckets>(createEmptyActivityBuckets());
  const combinedItemsRef = useRef<ActivityBuckets>(createEmptyActivityBuckets());
  const cursorsRef = useRef<Record<ActivityCollectionKey, CollectionPageCursor | null>>({
    feedingSessions: null,
    pumpSessions: null,
    bottleSessions: null,
    sleepSessions: null,
    diaperChanges: null,
    playSessions: null,
    walkSessions: null,
  });
  const hasMoreByKeyRef = useRef<Record<ActivityCollectionKey, boolean>>({
    feedingSessions: false,
    pumpSessions: false,
    bottleSessions: false,
    sleepSessions: false,
    diaperChanges: false,
    playSessions: false,
    walkSessions: false,
  });
  const loadedOlderPageRef = useRef<Record<ActivityCollectionKey, boolean>>({
    feedingSessions: false,
    pumpSessions: false,
    bottleSessions: false,
    sleepSessions: false,
    diaperChanges: false,
    playSessions: false,
    walkSessions: false,
  });
  const loadingMoreRef = useRef(false);

  const refreshHasMore = useCallback(() => {
    const activeBabyId = activeBabyIdRef.current;
    setPaginationState((current) => ({
      babyId: activeBabyId,
      hasMore: activityKeys.some((key) => hasMoreByKeyRef.current[key]),
      isLoadingMore: current.babyId === activeBabyId ? current.isLoadingMore : false,
      loadMoreError: current.babyId === activeBabyId ? current.loadMoreError : false,
    }));
  }, []);

  const loadMore = useCallback(async () => {
    if (!babyId || loadingMoreRef.current) return;

    const keysToLoad = activityKeys.filter(
      (key) => hasMoreByKeyRef.current[key] && cursorsRef.current[key]
    );
    if (keysToLoad.length === 0) return;

    loadingMoreRef.current = true;
    setPaginationState((current) => ({
      babyId,
      hasMore: current.babyId === babyId ? current.hasMore : true,
      isLoadingMore: true,
      loadMoreError: false,
    }));

    const results = await Promise.allSettled(
      keysToLoad.map(async (key) => ({
        key,
        page: await getActivityPage(
          key,
          babyId,
          cursorsRef.current[key],
          STATS_PAGE_SIZE
        ),
      }))
    );

    if (activeBabyIdRef.current !== babyId) {
      loadingMoreRef.current = false;
      return;
    }

    let failed = false;
    results.forEach((result) => {
      if (result.status === 'rejected') {
        failed = true;
        console.error('Error loading older stats data:', result.reason);
        return;
      }

      const { key, page } = result.value;
      loadedOlderPageRef.current[key] = true;
      olderItemsRef.current[key] = mergeActivityItems(
        key,
        olderItemsRef.current[key],
        page.items as ActivityItem[]
      );
      combinedItemsRef.current[key] = mergeActivityItems(
        key,
        liveItemsRef.current[key],
        olderItemsRef.current[key]
      );
      hasMoreByKeyRef.current[key] = page.hasMore;
      cursorsRef.current[key] = page.nextCursor;
    });

    startTransition(() => {
      setState({
        babyId,
        data: toStatsData({ ...combinedItemsRef.current }),
      });
      setPaginationState({
        babyId,
        hasMore: activityKeys.some((key) => hasMoreByKeyRef.current[key]),
        isLoadingMore: false,
        loadMoreError: failed,
      });
    });
    loadingMoreRef.current = false;
  }, [babyId]);

  useEffect(() => {
    activeBabyIdRef.current = babyId;
    liveItemsRef.current = createEmptyActivityBuckets();
    olderItemsRef.current = createEmptyActivityBuckets();
    combinedItemsRef.current = createEmptyActivityBuckets();
    activityKeys.forEach((key) => {
      cursorsRef.current[key] = null;
      hasMoreByKeyRef.current[key] = false;
      loadedOlderPageRef.current[key] = false;
    });
    if (!babyId) {
      return;
    }

    let frameId: number | null = null;
    let pendingState: Partial<StatsDataSnapshot> = {};

    const flushPendingState = () => {
      frameId = null;
      const nextState = pendingState;
      pendingState = {};

      startTransition(() => {
        setState((current) => ({
          babyId,
          data: {
            ...(current.babyId === babyId ? current.data : EMPTY_STATS_DATA),
            ...nextState,
          },
        }));
      });
    };

    const scheduleUpdate = <K extends ActivityCollectionKey>(key: K) => {
      return (value: StatsDataSnapshot[K]) => {
        if (activeBabyIdRef.current !== babyId) return;

        const previousLiveItems = liveItemsRef.current[key];
        if (loadedOlderPageRef.current[key]) {
          olderItemsRef.current[key] = mergeActivityItems(
            key,
            olderItemsRef.current[key],
            previousLiveItems
          );
        }

        liveItemsRef.current[key] = value as ActivityItem[];
        combinedItemsRef.current[key] = mergeActivityItems(
          key,
          liveItemsRef.current[key],
          olderItemsRef.current[key]
        );

        if (!loadedOlderPageRef.current[key]) {
          const cursor = getLastItemCursor(key, liveItemsRef.current[key]);
          cursorsRef.current[key] = cursor;
          hasMoreByKeyRef.current[key] = value.length === STATS_PAGE_SIZE && cursor !== null;
          refreshHasMore();
        }

        pendingState = {
          ...pendingState,
          [key]: combinedItemsRef.current[key],
        };

        if (frameId === null) {
          frameId = window.requestAnimationFrame(flushPendingState);
        }
      };
    };

    const unsubscribes = [
      subscribeToFeedingSessions(babyId, scheduleUpdate('feedingSessions'), STATS_PAGE_SIZE),
      subscribeToPumpSessions(babyId, scheduleUpdate('pumpSessions'), STATS_PAGE_SIZE),
      subscribeToBottleSessions(babyId, scheduleUpdate('bottleSessions'), STATS_PAGE_SIZE),
      subscribeToSleepSessions(babyId, scheduleUpdate('sleepSessions'), STATS_PAGE_SIZE),
      subscribeToDiaperChanges(babyId, scheduleUpdate('diaperChanges'), STATS_PAGE_SIZE),
      subscribeToPlaySessions(babyId, scheduleUpdate('playSessions'), STATS_PAGE_SIZE),
      subscribeToWalkSessions(babyId, scheduleUpdate('walkSessions'), STATS_PAGE_SIZE),
    ];

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [babyId, refreshHasMore]);

  const deferredData = useDeferredValue(
    babyId && state.babyId === babyId
      ? state.data
      : EMPTY_STATS_DATA
  );

  return {
    data: deferredData,
    hasMore: paginationState.babyId === babyId ? paginationState.hasMore : false,
    isLoadingMore: paginationState.babyId === babyId ? paginationState.isLoadingMore : false,
    loadMoreError: paginationState.babyId === babyId ? paginationState.loadMoreError : false,
    loadMore,
  };
}
