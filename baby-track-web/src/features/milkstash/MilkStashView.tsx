import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createMilkStash, subscribeToMilkStash, markMilkStashInUse, markMilkStashUsed, updateMilkStashVolume, createBottleSession, deleteMilkStashEntry, deleteMilkStashEntries } from '@/lib/firestore';
import type { MilkStash, Baby } from '@/types';
import { MilkStorageLocation, MILK_STORAGE_CONFIG } from '@/types/enums';
import { Milk, Plus, X, Clock, Check, AlertTriangle, Trash2, Pencil } from 'lucide-react';
import { clsx } from 'clsx';

export function MilkStashView() {
  const { user } = useAuth();
  const { settings, babies, selectedBaby } = useAppStore();
  const [stash, setStash] = useState<MilkStash[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedMilkItem, setSelectedMilkItem] = useState<MilkStash | null>(null);
  const [selectedBabyForFeeding, setSelectedBabyForFeeding] = useState<Baby | null>(null);
  const [usedVolume, setUsedVolume] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMilkItem, setEditingMilkItem] = useState<MilkStash | null>(null);
  const [editVolume, setEditVolume] = useState('');

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
    setUsedVolume(item.volume.toString());
    setShowConfirmDialog(true);
  };

  const handleConfirmUsed = async () => {
    if (!selectedMilkItem || !user || !usedVolume) return;

    const usedAmount = parseFloat(usedVolume);
    if (isNaN(usedAmount) || usedAmount <= 0) return;

    setLoading(true);
    try {
      // If a baby is selected, create a bottle session to record the feeding
      if (selectedBabyForFeeding) {
        await createBottleSession(selectedBabyForFeeding.id, user.uid, {
          timestamp: new Date().toISOString(),
          volume: usedAmount,
          volumeUnit: selectedMilkItem.volumeUnit,
          contentType: 'breastMilk',
          milkStashId: selectedMilkItem.id,
          notes: `From milk stash (pumped: ${new Date(selectedMilkItem.pumpedDate).toLocaleDateString()})`,
          babyMood: null,
        });
      }

      // Check if fully used or partial
      const remainingVolume = selectedMilkItem.volume - usedAmount;

      if (remainingVolume <= 0) {
        // Fully used - mark as used
        await markMilkStashUsed(selectedMilkItem.id);
      } else {
        // Partial use - update the remaining volume and keep in use
        await updateMilkStashVolume(selectedMilkItem.id, remainingVolume);
      }

      // Close dialog
      setShowConfirmDialog(false);
      setSelectedMilkItem(null);
      setUsedVolume('');
    } catch (error) {
      console.error('Error marking used:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setSelectedMilkItem(null);
    setUsedVolume('');
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedForDeletion([]);
  };

  const handleToggleDeleteSelection = (itemId: string) => {
    setSelectedForDeletion((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const requestDelete = (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    setPendingDeleteIds(itemIds);
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setPendingDeleteIds([]);
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteIds.length === 0) return;

    setLoading(true);
    try {
      if (pendingDeleteIds.length === 1) {
        await deleteMilkStashEntry(pendingDeleteIds[0]);
      } else {
        await deleteMilkStashEntries(pendingDeleteIds);
      }

      setSelectedForDeletion((prev) => prev.filter((id) => !pendingDeleteIds.includes(id)));
      setSelectionMode(false);
      handleCancelDelete();
    } catch (error) {
      console.error('Error deleting milk stash entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestEdit = (item: MilkStash) => {
    setEditingMilkItem(item);
    setEditVolume(item.volume.toString());
    setShowEditDialog(true);
  };

  const handleCancelEdit = () => {
    setEditingMilkItem(null);
    setEditVolume('');
    setShowEditDialog(false);
  };

  const handleConfirmEdit = async () => {
    if (!editingMilkItem || !editVolume) return;

    const nextVolume = parseFloat(editVolume);
    if (isNaN(nextVolume) || nextVolume <= 0) return;

    setLoading(true);
    try {
      await updateMilkStashVolume(editingMilkItem.id, nextVolume);
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating milk stash volume:', error);
    } finally {
      setLoading(false);
    }
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

        <div className="flex items-center justify-between gap-3">
          <Button size="sm" variant="outline" onClick={toggleSelectionMode}>
            {selectionMode ? 'Cancel Selection' : 'Select Multiple'}
          </Button>

          {selectionMode && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => requestDelete(selectedForDeletion)}
              disabled={selectedForDeletion.length === 0 || loading}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected ({selectedForDeletion.length})
            </Button>
          )}
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

            <p className="text-sm text-gray-600 mb-3">
              How much milk was used? (Total: {selectedMilkItem.volume} {volumeUnit})
            </p>

            <Input
              type="number"
              step="0.5"
              label={`Amount used (${volumeUnit})`}
              value={usedVolume}
              onChange={(e) => setUsedVolume(e.target.value)}
              max={selectedMilkItem.volume}
              min="0.5"
            />

            {parseFloat(usedVolume) < selectedMilkItem.volume && parseFloat(usedVolume) > 0 && (
              <p className="text-sm text-blue-600 mb-2">
                Remaining: {(selectedMilkItem.volume - parseFloat(usedVolume)).toFixed(1)} {volumeUnit} will stay in stash
              </p>
            )}

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
                disabled={loading || !usedVolume || parseFloat(usedVolume) <= 0}
              >
                {loading ? 'Saving...' : 'Record Feeding'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelConfirm}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {showDeleteConfirm && (
          <Card className="border-2 border-red-300 bg-red-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Delete milk stash {pendingDeleteIds.length > 1 ? 'entries' : 'entry'}?</h3>
              <button onClick={handleCancelDelete}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-red-700 mb-4">
              {pendingDeleteIds.length > 1
                ? `You are about to permanently delete ${pendingDeleteIds.length} milk stash entries. This cannot be undone.`
                : 'This milk stash entry will be permanently deleted. This cannot be undone.'}
            </p>

            <div className="flex gap-2">
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {showEditDialog && editingMilkItem && (
          <Card className="border-2 border-blue-300 bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Edit milk volume</h3>
              <button onClick={handleCancelEdit}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-blue-700 mb-3">
              Update the stored amount for this entry to correct a logging error.
            </p>

            <Input
              type="number"
              step="0.5"
              label={`Volume (${volumeUnit})`}
              value={editVolume}
              onChange={(e) => setEditVolume(e.target.value)}
              min="0.5"
            />

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleConfirmEdit}
                className="flex-1"
                disabled={loading || !editVolume || parseFloat(editVolume) <= 0}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="flex-1"
                disabled={loading}
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
                  selectionMode={selectionMode}
                  isSelected={selectedForDeletion.includes(item.id)}
                  onToggleSelect={() => handleToggleDeleteSelection(item.id)}
                  onEdit={() => requestEdit(item)}
                  onDelete={() => requestDelete([item.id])}
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
                  selectionMode={selectionMode}
                  isSelected={selectedForDeletion.includes(item.id)}
                  onToggleSelect={() => handleToggleDeleteSelection(item.id)}
                  onEdit={() => requestEdit(item)}
                  onDelete={() => requestDelete([item.id])}
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
                  selectionMode={selectionMode}
                  isSelected={selectedForDeletion.includes(item.id)}
                  onToggleSelect={() => handleToggleDeleteSelection(item.id)}
                  onEdit={() => requestEdit(item)}
                  onDelete={() => requestDelete([item.id])}
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
  selectionMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onMarkInUse,
  onMarkUsed,
  isExpiringSoon,
  isExpired,
}: {
  item: MilkStash;
  volumeUnit: string;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
          {selectionMode ? (
            <Button size="sm" variant={isSelected ? 'primary' : 'outline'} onClick={onToggleSelect}>
              {isSelected ? 'Selected' : 'Select'}
            </Button>
          ) : (
            <>
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
              <Button size="sm" variant="outline" onClick={onEdit} aria-label={`Edit ${item.volume} ${volumeUnit} milk stash entry`}>
                <Pencil className="w-4 h-4 text-blue-500" />
              </Button>
              <Button size="sm" variant="outline" onClick={onDelete} aria-label={`Delete ${item.volume} ${volumeUnit} milk stash entry`}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
