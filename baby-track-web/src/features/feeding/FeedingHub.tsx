import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Milk, Baby } from 'lucide-react';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { SegmentedControl } from '@/components/ui/Select';
import { BreastfeedingView } from './BreastfeedingView';
import { BottleView } from './BottleView';
import { useAppStore } from '@/stores/appStore';

type FeedingTab = 'breast' | 'bottle';

const tabOptions = [
  { value: 'breast', label: 'Breast', icon: <Baby className="w-4 h-4" /> },
  { value: 'bottle', label: 'Bottle', icon: <Milk className="w-4 h-4" /> },
];

export function FeedingHub() {
  const { selectedBaby, babies, settings } = useAppStore();

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
      </div>
    </div>
  );
}
