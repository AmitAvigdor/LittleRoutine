import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createMilkStash, subscribeToMilkStash, markMilkStashInUse, markMilkStashUsed, createBottleSession } from '@/lib/firestore';
import type { MilkStash, Baby } from '@/types';
import { MilkStorageLocation, MILK_STORAGE_CONFIG } from '@/types/enums';
import { Milk, Plus, X, Clock, Check, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export function MilkStashView() {
  const { user } = useAuth();
  const { settings, babies, selectedBaby } = useAppStore();
  const [stash, setStash] = useState<MilkStash[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedMilkItem, setSelectedMilkItem] = useState<MilkStash | null>(null);
  const [selectedBabyForFeeding, setSelectedBabyForFeeding] = useState<Baby | null>(null);

  // Form state
  const [pumpedDate, setPumpedDate] = useState(new Date().toISOString().split('T')[0]);
  const [volume, setVolume] = useState('');
  const [location, setLocation] = useState<MilkStorageLocation>('fridge');
  const [notes, setNotes] = useState('');

  const volumeUnit = settings?.preferredVolumeUnit || 'oz';

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToMilkStash(user.uid, (data) => {
      setStash(data);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !volume) return;

    setLoading(true);
    try {
      await createMilkStash(user.uid, {
        pumpedDate,
        volume: parseFloat(volume),
        volumeUnit,
        location,
        notes: notes || null,
      });

      setVolume('');
      setNotes('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding milk stash:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInUse = async (item: MilkStash) => {
    try {
      await markMilkStashInUse(item.id, !item.isInUse);
    } catch (error) {
      console.error('Error marking in use:', error);
    }
  };

  const handleMarkUsed = (item: MilkStash) => {
    // Show confirmation dialog to record feeding
    setSelectedMilkItem(item);
    setSelectedBabyForFeeding(selectedBaby || babies[0] || null);
    setShowConfirmDialog(true);
  };

  const handleConfirmUsed = async () => {
    if (!selectedMilkItem || !user) return;

    setLoading(true);
    try {
      // If a baby is selected, create a bottle session to record the feeding
      if (selectedBabyForFeeding) {
        await createBottleSession(selectedBabyForFeeding.id, user.uid, {
          timestamp: new Date().toISOString(),
          volume: selectedMilkItem.volume,
          volumeUnit: selectedMilkItem.volumeUnit,
          contentType: 'breastMilk',
          notes: `From milk stash (pumped: ${new Date(selectedMilkItem.pumpedDate).toLocaleDateString()})`,
          babyMood: null,
        });
      }

      // Mark the milk stash item as used
      await markMilkStashUsed(selectedMilkItem.id);

      // Close dialog
      setShowConfirmDialog(false);
      setSelectedMilkItem(null);
    } catch (error) {
      console.error('Error marking used:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setSelectedMilkItem(null);
  };

  const isExpiringSoon = (item: MilkStash) => {
    const expiration = new Date(item.expirationDate);
    const now = new Date();
    const hoursUntilExpiration = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiration <= 24 && hoursUntilExpiration > 0;
  };

  const isExpired = (item: MilkStash) => {
    return new Date(item.expirationDate) < new Date();
  };

  const fridgeMilk = stash.filter(s => s.location === 'fridge');
  const freezerMilk = stash.filter(s => s.location === 'freezer');
  const inUseMilk = stash.filter(s => s.isInUse);

  const totalFridgeVolume = fridgeMilk.reduce((sum, s) => sum + s.volume, 0);
  const totalFreezerVolume = freezerMilk.reduce((sum, s) => sum + s.volume, 0);

  return (
    <div>
      <Header
        title="Milk Stash"
        showBabySwitcher={false}
        rightAction={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="text-center bg-blue-50">
            <p className="text-2xl font-bold text-blue-600">
              {totalFridgeVolume.toFixed(1)} {volumeUnit}
            </p>
            <p className="text-sm text-blue-500">Fridge ({fridgeMilk.length})</p>
          </Card>
          <Card className="text-center bg-indigo-50">
            <p className="text-2xl font-bold text-indigo-600">
              {totalFreezerVolume.toFixed(1)} {volumeUnit}
            </p>
            <p className="text-sm text-indigo-500">Freezer ({freezerMilk.length})</p>
          </Card>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && selectedMilkItem && (
          <Card className="border-2 border-green-300 bg-green-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Record Feeding?</h3>
              <button onClick={handleCancelConfirm}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Record this milk ({selectedMilkItem.volume} {volumeUnit}) as a bottle feeding?
            </p>

            {babies.length > 1 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Baby
                </label>
                <div className="flex flex-wrap gap-2">
                  {babies.map((baby) => (
                    <button
                      key={baby.id}
                      type="button"
                      onClick={() => setSelectedBabyForFeeding(baby)}
                      className={clsx(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        selectedBabyForFeeding?.id === baby.id
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {baby.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {babies.length === 1 && (
              <p className="text-sm text-gray-500 mb-4">
                Will be recorded for: <span className="font-medium">{babies[0].name}</span>
              </p>
            )}

            {babies.length === 0 && (
              <p className="text-sm text-amber-600 mb-4">
                No baby profile found. The milk will be marked as used but no feeding will be recorded.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleConfirmUsed}
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Yes, Record Feeding'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelConfirm}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Add Form */}
        {showForm && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Add Milk</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="date"
                label="Pumped Date"
                value={pumpedDate}
                onChange={(e) => setPumpedDate(e.target.value)}
                required
              />

              <Input
                type="number"
                step="0.5"
                label={`Volume (${volumeUnit})`}
                placeholder="Enter volume"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Location
                </label>
                <div className="flex gap-2">
                  {(Object.keys(MILK_STORAGE_CONFIG) as MilkStorageLocation[]).map((loc) => {
                    const config = MILK_STORAGE_CONFIG[loc];
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocation(loc)}
                        className={clsx(
                          'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          location === loc
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                        style={location === loc ? { backgroundColor: config.color } : undefined}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Notes (optional)"
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button type="submit" className="w-full" disabled={loading || !volume}>
                {loading ? 'Saving...' : 'Add to Stash'}
              </Button>
            </form>
          </Card>
        )}

        {/* In Use */}
        {inUseMilk.length > 0 && (
          <div>
            <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              In Use
            </h3>
            <div className="space-y-2">
              {inUseMilk.map((item) => (
                <MilkCard
                  key={item.id}
                  item={item}
                  volumeUnit={volumeUnit}
                  onMarkInUse={() => handleMarkInUse(item)}
                  onMarkUsed={() => handleMarkUsed(item)}
                  isExpiringSoon={isExpiringSoon(item)}
                  isExpired={isExpired(item)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Fridge */}
        {fridgeMilk.filter(m => !m.isInUse).length > 0 && (
          <div>
            <h3 className="font-semibold text-blue-600 mb-2">Fridge</h3>
            <div className="space-y-2">
              {fridgeMilk.filter(m => !m.isInUse).map((item) => (
                <MilkCard
                  key={item.id}
                  item={item}
                  volumeUnit={volumeUnit}
                  onMarkInUse={() => handleMarkInUse(item)}
                  onMarkUsed={() => handleMarkUsed(item)}
                  isExpiringSoon={isExpiringSoon(item)}
                  isExpired={isExpired(item)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Freezer */}
        {freezerMilk.filter(m => !m.isInUse).length > 0 && (
          <div>
            <h3 className="font-semibold text-indigo-600 mb-2">Freezer</h3>
            <div className="space-y-2">
              {freezerMilk.filter(m => !m.isInUse).map((item) => (
                <MilkCard
                  key={item.id}
                  item={item}
                  volumeUnit={volumeUnit}
                  onMarkInUse={() => handleMarkInUse(item)}
                  onMarkUsed={() => handleMarkUsed(item)}
                  isExpiringSoon={isExpiringSoon(item)}
                  isExpired={isExpired(item)}
                />
              ))}
            </div>
          </div>
        )}

        {stash.length === 0 && !showForm && (
          <Card className="text-center py-8">
            <Milk className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No milk stored</p>
            <p className="text-sm text-gray-400">Tap + to add pumped milk</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function MilkCard({
  item,
  volumeUnit,
  onMarkInUse,
  onMarkUsed,
  isExpiringSoon,
  isExpired,
}: {
  item: MilkStash;
  volumeUnit: string;
  onMarkInUse: () => void;
  onMarkUsed: () => void;
  isExpiringSoon: boolean;
  isExpired: boolean;
}) {
  const locConfig = MILK_STORAGE_CONFIG[item.location];

  return (
    <Card
      className={clsx(
        'py-3',
        isExpired && 'bg-red-50 border border-red-200',
        isExpiringSoon && !isExpired && 'bg-amber-50 border border-amber-200',
        item.isInUse && 'bg-green-50 border border-green-200'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{item.volume} {volumeUnit}</span>
            <span
              className="px-2 py-0.5 rounded-full text-xs text-white"
              style={{ backgroundColor: locConfig.color }}
            >
              {locConfig.label}
            </span>
            {isExpired && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Expired
              </span>
            )}
            {isExpiringSoon && !isExpired && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white">
                Expiring soon
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Pumped: {new Date(item.pumpedDate).toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-400">
            Expires: {new Date(item.expirationDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!item.isInUse ? (
            <Button size="sm" variant="outline" onClick={onMarkInUse}>
              Use
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={onMarkUsed}>
                <Check className="w-4 h-4 mr-1" />
                Done
              </Button>
              <Button size="sm" variant="outline" onClick={onMarkInUse}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
