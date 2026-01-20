import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { PumpView } from './PumpView';
import { useAppStore } from '@/stores/appStore';

export function PumpPage() {
  const { selectedBaby, babies } = useAppStore();

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  return (
    <div>
      <Header title="Pumping" />
      <div className="px-4 py-4">
        {selectedBaby && <PumpView baby={selectedBaby} />}
      </div>
    </div>
  );
}
