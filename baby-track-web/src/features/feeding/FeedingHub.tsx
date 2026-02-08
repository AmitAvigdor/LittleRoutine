import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Milk, Baby, Clock } from 'lucide-react';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { SegmentedControl } from '@/components/ui/Select';
import { BreastfeedingView } from './BreastfeedingView';
import { BottleView } from './BottleView';
import { EditSessionModal } from '@/components/ui/EditSessionModal';
import { MoodIndicator } from '@/components/ui/MoodSelector';
import { useAppStore } from '@/stores/appStore';
import { subscribeToFeedingSessions, subscribeToBottleSessions } from '@/lib/firestore';
import { FeedingSession, BottleSession, BREAST_SIDE_CONFIG, BOTTLE_CONTENT_CONFIG, formatDuration } from '@/types';

type FeedingTab = 'breast' | 'bottle';

const tabOptions = [
  { value: 'breast', label: 'Breast', icon: <Baby className="w-4 h-4" /> },
  { value: 'bottle', label: 'Bottle', icon: <Milk className="w-4 h-4" /> },
];

export function FeedingHub() {
  const { selectedBaby, babies, settings } = useAppStore();
  const [feedingSessions, setFeedingSessions] = useState<FeedingSession[]>([]);
  const [bottleSessions, setBottleSessions] = useState<BottleSession[]>([]);
  const [selectedFeedingSession, setSelectedFeedingSession] = useState<FeedingSession | null>(null);
  const [selectedBottleSession, setSelectedBottleSession] = useState<BottleSession | null>(null);

  // Set initial tab based on feeding type preference
  const getInitialTab = (): FeedingTab => {
    if (settings?.feedingTypePreference === 'formula') {
      return 'bottle';
    }
    return 'breast';
  };

  const [activeTab, setActiveTab] = useState<FeedingTab>(getInitialTab);

  // Update tab when settings change (e.g., when settings load)
  useEffect(() => {
    if (settings?.feedingTypePreference === 'formula') {
      setActiveTab('bottle');
    } else if (settings?.feedingTypePreference === 'breastfeeding') {
      setActiveTab('breast');
    }
  }, [settings?.feedingTypePreference]);
  const navigate = useNavigate();

  // Subscribe to both feeding types
  useEffect(() => {
    if (!selectedBaby) return;

    const unsubFeeding = subscribeToFeedingSessions(selectedBaby.id, setFeedingSessions);
    const unsubBottle = subscribeToBottleSessions(selectedBaby.id, setBottleSessions);

    return () => {
      unsubFeeding();
      unsubBottle();
    };
  }, [selectedBaby]);

  // Combine and sort all feeding sessions
  const recentFeedings = useMemo(() => {
    const combined: Array<{
      id: string;
      type: 'breast' | 'bottle';
      timestamp: string;
      session: FeedingSession | BottleSession;
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

    // Sort by timestamp descending (most recent first)
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return combined.slice(0, 10);
  }, [feedingSessions, bottleSessions]);

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  return (
    <div>
      <Header
        title="Feed"
        rightAction={
          <button
            onClick={() => navigate('/more/milk-stash')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Milk Stash"
          >
            <Milk className="w-5 h-5 text-gray-600" />
          </button>
        }
      />

      <div className="px-4 py-4">
        {/* Tab Selector */}
        <div className="flex justify-center mb-6">
          <SegmentedControl
            options={tabOptions}
            value={activeTab}
            onChange={(value) => setActiveTab(value as FeedingTab)}
          />
        </div>

        {/* Tab Content */}
        {selectedBaby && (
          <>
            {activeTab === 'breast' && <BreastfeedingView baby={selectedBaby} />}
            {activeTab === 'bottle' && <BottleView baby={selectedBaby} />}
          </>
        )}

        {/* Combined Recent Feedings */}
        {recentFeedings.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">Recent Feedings</h3>
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
                        {session.breastSide === 'left' ? 'L' : 'R'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          Breast • {BREAST_SIDE_CONFIG[session.breastSide].label}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium">{formatDuration(session.duration)}</span>
                          <span>•</span>
                          <span className="truncate">{format(parseISO(session.startTime), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                      <MoodIndicator babyMood={session.babyMood} momMood={session.momMood} size="sm" />
                    </button>
                  );
                } else {
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
                          Bottle • {session.volume} {session.volumeUnit}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium">{BOTTLE_CONTENT_CONFIG[session.contentType].label}</span>
                          <span>•</span>
                          <span className="truncate">{format(parseISO(session.timestamp), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                      <MoodIndicator babyMood={session.babyMood} size="sm" />
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
