import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from '@/stores/toastStore';
import { Baby, Minus, Plus, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';

type ChecklistCategory = 'hygiene' | 'clothing' | 'feeding' | 'custom';

interface ChecklistItem {
  id: string;
  label: string;
  quantity: number;
  targetQuantity: number;
  isPreset: boolean;
  category: ChecklistCategory;
}

type SavedChecklistItem = Partial<ChecklistItem> & {
  id: string;
  label: string;
  quantity?: number;
  targetQuantity?: number;
  isPreset: boolean;
};

const STORAGE_KEY_PREFIX = 'diaper-bag-checklist';

const CATEGORY_CONFIG: Record<ChecklistCategory, { label: string; emoji: string; description: string }> = {
  hygiene: {
    label: 'Hygiene',
    emoji: '🧼',
    description: 'Changing and cleanup essentials',
  },
  clothing: {
    label: 'Clothing',
    emoji: '🧥',
    description: 'Backup outfits and weather gear',
  },
  feeding: {
    label: 'Feeding',
    emoji: '🍼',
    description: 'Comfort and feeding extras',
  },
  custom: {
    label: 'Custom',
    emoji: '✨',
    description: 'Your own must-pack items',
  },
};

const CATEGORY_ORDER: ChecklistCategory[] = ['hygiene', 'clothing', 'feeding', 'custom'];

const PRESET_ITEMS: ChecklistItem[] = [
  { id: 'preset-diapers', label: 'Diapers', quantity: 0, targetQuantity: 5, isPreset: true, category: 'hygiene' },
  { id: 'preset-wipes', label: 'Wipes', quantity: 0, targetQuantity: 1, isPreset: true, category: 'hygiene' },
  { id: 'preset-changing-mat', label: 'Changing Mat', quantity: 0, targetQuantity: 1, isPreset: true, category: 'hygiene' },
  { id: 'preset-rash-cream', label: 'Diaper Rash Cream', quantity: 0, targetQuantity: 1, isPreset: true, category: 'hygiene' },
  { id: 'preset-disposable-diaper-bag', label: 'Disposable Diaper Bag', quantity: 0, targetQuantity: 3, isPreset: true, category: 'hygiene' },
  { id: 'preset-hand-sanitizer', label: 'Hand Sanitizer', quantity: 0, targetQuantity: 1, isPreset: true, category: 'hygiene' },
  { id: 'preset-change-clothes', label: 'Change of Clothes', quantity: 0, targetQuantity: 1, isPreset: true, category: 'clothing' },
  { id: 'preset-hat', label: 'Hat', quantity: 0, targetQuantity: 1, isPreset: true, category: 'clothing' },
  { id: 'preset-burp-cloth', label: 'Burp Cloth', quantity: 0, targetQuantity: 2, isPreset: true, category: 'feeding' },
  { id: 'preset-pacifier', label: 'Pacifier', quantity: 0, targetQuantity: 1, isPreset: true, category: 'feeding' },
];

function getStorageKey(userId: string | null | undefined) {
  return `${STORAGE_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

function createCustomItem(id: string, label: string, quantity = 0, targetQuantity = 1): ChecklistItem {
  return {
    id,
    label,
    quantity,
    targetQuantity,
    isPreset: false,
    category: 'custom',
  };
}

function mergeWithPresetItems(savedItems: SavedChecklistItem[] | null): ChecklistItem[] {
  if (!savedItems || savedItems.length === 0) return PRESET_ITEMS;

  const savedById = new Map(savedItems.map((item) => [item.id, item]));
  const presetItems = PRESET_ITEMS.map((item) => {
    const saved = savedById.get(item.id);
    if (!saved) return item;

    return {
      ...item,
      quantity: saved.quantity ?? item.quantity,
      targetQuantity: saved.targetQuantity ?? item.targetQuantity,
    };
  });

  const customItems = savedItems
    .filter((item) => !item.isPreset)
    .map((item) =>
      createCustomItem(
        item.id,
        item.label,
        item.quantity ?? 0,
        item.targetQuantity ?? 1
      )
    );

  return [...presetItems, ...customItems];
}

export function DiaperBagChecklistView() {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>(PRESET_ITEMS);
  const [customItemName, setCustomItemName] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showAddCustomSheet, setShowAddCustomSheet] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemQuantity, setEditItemQuantity] = useState('0');
  const [customItemQuantity, setCustomItemQuantity] = useState('0');
  const [customItemTargetQuantity, setCustomItemTargetQuantity] = useState('1');
  const [editItemTargetQuantity, setEditItemTargetQuantity] = useState('1');

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingItemId) ?? null,
    [editingItemId, items]
  );

  useEffect(() => {
    setHasHydrated(false);

    try {
      const stored = localStorage.getItem(getStorageKey(user?.uid));
      if (!stored) {
        setItems(PRESET_ITEMS);
        setHasHydrated(true);
        return;
      }

      const parsed = JSON.parse(stored) as SavedChecklistItem[];
      setItems(mergeWithPresetItems(parsed));
      setHasHydrated(true);
    } catch (error) {
      console.error('Error loading diaper bag checklist:', error);
      setItems(PRESET_ITEMS);
      setHasHydrated(true);
    }
  }, [user]);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(getStorageKey(user?.uid), JSON.stringify(items));
  }, [items, user, hasHydrated]);

  const packedItemsCount = useMemo(
    () => items.filter((item) => item.quantity >= item.targetQuantity).length,
    [items]
  );

  const packedTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const underfilledItems = useMemo(
    () =>
      items
        .filter((item) => item.quantity < item.targetQuantity)
        .sort((a, b) => (a.quantity / a.targetQuantity) - (b.quantity / b.targetQuantity)),
    [items]
  );

  const bagStatus = useMemo(() => {
    if (packedTotal === 0) {
      return {
        tone: 'amber' as const,
        title: 'Your bag is empty.',
        body: 'Start packing your essentials!',
      };
    }

    if (underfilledItems.length === 0) {
      return {
        tone: 'emerald' as const,
        title: "Everything is packed!",
        body: "You're ready to go.",
      };
    }

    return {
      tone: 'rose' as const,
      title: 'Almost there!',
      body: 'You still need to pack:',
    };
  }, [packedTotal, underfilledItems]);

  const itemsByCategory = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: items.filter((item) => item.category === category),
      })),
    [items]
  );

  const updateQuantity = (itemId: string, nextQuantity: number) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(0, nextQuantity) } : item
      )
    );
  };

  const handleAddCustomItem = () => {
    const trimmedName = customItemName.trim();
    if (!trimmedName) return;

    const normalizedName = trimmedName.toLowerCase();
    const existingItem = items.find((item) => item.label.toLowerCase() === normalizedName);
    if (existingItem) {
      toast.info(`${trimmedName} is already on your checklist.`);
      setCustomItemName('');
      return;
    }

    const parsedQuantity = Number.parseInt(customItemQuantity, 10);
    const quantity = Number.isNaN(parsedQuantity) ? 0 : Math.max(0, parsedQuantity);
    const parsedTargetQuantity = Number.parseInt(customItemTargetQuantity, 10);
    const targetQuantity = Number.isNaN(parsedTargetQuantity) ? 1 : Math.max(1, parsedTargetQuantity);

    setItems((currentItems) => [
      ...currentItems,
      createCustomItem(`custom-${Date.now()}`, trimmedName, quantity, targetQuantity),
    ]);
    setCustomItemName('');
    setCustomItemQuantity('0');
    setCustomItemTargetQuantity('1');
    setShowAddCustomSheet(false);
  };

  const openEditItemDialog = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditItemName(item.label);
    setEditItemQuantity(String(item.quantity));
    setEditItemTargetQuantity(String(item.targetQuantity));
  };

  const closeEditItemDialog = () => {
    setEditingItemId(null);
    setEditItemName('');
    setEditItemQuantity('0');
    setEditItemTargetQuantity('1');
  };

  const handleSaveItem = () => {
    if (!editingItem) return;

    const trimmedName = editItemName.trim();
    if (!editingItem.isPreset && !trimmedName) {
      toast.error('Item name is required.');
      return;
    }

    if (!editingItem.isPreset) {
      const normalizedName = trimmedName.toLowerCase();
      const duplicateItem = items.find(
        (item) => item.id !== editingItem.id && item.label.toLowerCase() === normalizedName
      );
      if (duplicateItem) {
        toast.error(`${trimmedName} is already on your checklist.`);
        return;
      }
    }

    const parsedQuantity = Number.parseInt(editItemQuantity, 10);
    const quantity = Number.isNaN(parsedQuantity) ? 0 : Math.max(0, parsedQuantity);
    const parsedTargetQuantity = Number.parseInt(editItemTargetQuantity, 10);
    const targetQuantity = Number.isNaN(parsedTargetQuantity) ? 1 : Math.max(1, parsedTargetQuantity);

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              label: item.isPreset ? item.label : trimmedName,
              quantity: item.isPreset ? item.quantity : quantity,
              targetQuantity,
            }
          : item
      )
    );
    closeEditItemDialog();
  };

  const handleDeleteCustomItem = () => {
    if (!editingItem) return;
    if (!confirm('Are you sure you want to remove this item?')) return;

    setItems((currentItems) => currentItems.filter((item) => item.id !== editingItem.id));
    closeEditItemDialog();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-amber-50/40 to-white">
      <Header title="Diaper Bag" showBabySwitcher={false} />

      <div
        className="px-4 py-4 space-y-5"
        style={{ paddingBottom: 'calc(var(--bottom-nav-height, 64px) + 6rem)' }}
      >
        <Card
          className="overflow-hidden border-amber-100"
          style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 55%, #ffffff 100%)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className={clsx(
                'text-sm font-medium',
                bagStatus.tone === 'emerald'
                  ? 'text-emerald-700'
                  : bagStatus.tone === 'rose'
                    ? 'text-rose-700'
                    : 'text-amber-700'
              )}>
                Bag status
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{bagStatus.title}</p>
              <p className="text-sm text-gray-600 mt-2">{bagStatus.body}</p>

              {underfilledItems.length > 0 && packedTotal > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {underfilledItems.map((item) => (
                    <span
                      key={item.id}
                      className="text-xs font-medium px-2.5 py-1 rounded-full border border-rose-200 bg-rose-100 text-rose-700"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mt-4 text-sm text-gray-600">
                <span>{packedItemsCount} items at target</span>
                <span className="text-gray-300">•</span>
                <span>{underfilledItems.length} items still below target</span>
              </div>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Baby className="w-7 h-7 text-amber-600" />
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {itemsByCategory.map(({ category, items: categoryItems }) => {
            const categoryConfig = CATEGORY_CONFIG[category];

            return (
              <section key={category} className="space-y-3">
                <div className="px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{categoryConfig.emoji}</span>
                    <h2 className="text-sm font-bold text-gray-800">{categoryConfig.label}</h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{categoryConfig.description}</p>
                </div>

                {categoryItems.length === 0 ? (
                  <Card className="border-dashed border-amber-200 bg-amber-50/50">
                    <p className="text-sm text-gray-500">
                      No custom items yet. Use the button below to add one.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {categoryItems.map((item) => {
                      const isMissingQuantity = item.quantity === 0;
                      const isBelowTarget = item.quantity < item.targetQuantity;

                      return (
                        <Card
                          key={item.id}
                          className={clsx(
                            'transition-all',
                            !isBelowTarget
                              ? 'border-emerald-200 bg-emerald-50/70'
                              : isMissingQuantity
                                ? 'border-rose-200 bg-rose-50/70'
                                : 'border-amber-200 bg-amber-50/70'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {item.isPreset ? (
                              <button
                                type="button"
                                aria-label={`Edit ${item.label}`}
                                onClick={() => openEditItemDialog(item)}
                                className="flex-1 min-w-0 text-left rounded-xl -m-2 p-2 hover:bg-white/70 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-gray-900">{item.label}</p>
                                  {isMissingQuantity && (
                                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                                      Qty missing
                                    </span>
                                  )}
                                  {!isMissingQuantity && isBelowTarget && (
                                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                      Need {item.targetQuantity - item.quantity} more
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Essential item • Target {item.targetQuantity} • Tap to adjust target</p>
                              </button>
                            ) : (
                              <button
                                type="button"
                                aria-label={`Edit ${item.label}`}
                                onClick={() => openEditItemDialog(item)}
                                className="flex-1 min-w-0 text-left rounded-xl -m-2 p-2 hover:bg-white/70 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-gray-900">{item.label}</p>
                                  {isMissingQuantity && (
                                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                                      Qty missing
                                    </span>
                                  )}
                                  {!isMissingQuantity && isBelowTarget && (
                                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                      Need {item.targetQuantity - item.quantity} more
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-amber-700 mt-1 font-medium">
                                  Custom item • Target {item.targetQuantity} • Tap to edit or remove
                                </p>
                              </button>
                            )}

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                aria-label={`Decrease ${item.label}`}
                                className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:border-gray-300 disabled:opacity-40"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity === 0}
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <div className="w-14 text-center">
                                <p className={clsx(
                                  'text-2xl font-bold',
                                  isMissingQuantity ? 'text-rose-600' : isBelowTarget ? 'text-amber-700' : 'text-gray-900'
                                )}>
                                  {item.quantity}
                                </p>
                                <p className="text-[11px] text-gray-500">/ {item.targetQuantity}</p>
                              </div>

                              <button
                                type="button"
                                aria-label={`Increase ${item.label}`}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm hover:shadow-md"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <div
        className="fixed inset-x-0 z-30 border-t border-amber-100 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        style={{ bottom: 'var(--bottom-nav-height, 64px)' }}
      >
        <div className="max-w-lg mx-auto">
          <Button
            type="button"
            onClick={() => setShowAddCustomSheet(true)}
            className="w-full shadow-lg"
          >
            Add Custom Item
          </Button>
        </div>
      </div>

      {showAddCustomSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-4 sm:items-center">
          <Card className="w-full max-w-md border-2 border-amber-200 bg-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Add custom item</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add toys, medication, or anything else specific to your bag.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close add custom item"
                onClick={() => {
                  setShowAddCustomSheet(false);
                  setCustomItemName('');
                }}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                aria-label="Add custom item"
                placeholder="Add custom item"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomItem();
                  }
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  label="Initial quantity"
                  aria-label="Initial quantity"
                  min="0"
                  step="1"
                  value={customItemQuantity}
                  onChange={(e) => setCustomItemQuantity(e.target.value)}
                />
                <Input
                  type="number"
                  label="Target quantity"
                  aria-label="Target quantity"
                  min="1"
                  step="1"
                  value={customItemTargetQuantity}
                  onChange={(e) => setCustomItemTargetQuantity(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddCustomSheet(false);
                    setCustomItemName('');
                    setCustomItemQuantity('0');
                    setCustomItemTargetQuantity('1');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddCustomItem}
                  disabled={!customItemName.trim()}
                  className="flex-1"
                >
                  Add
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[60] bg-gray-900/55">
          <div className="flex min-h-full items-center justify-center p-4">
          <Card
            className="w-full max-w-md border-2 border-amber-200 bg-white shadow-xl"
            style={{ maxHeight: 'calc(100dvh - 2rem)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {editingItem.isPreset ? `Adjust ${editingItem.label}` : 'Edit custom item'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {editingItem.isPreset
                    ? 'Set how many of this item you want to keep stocked in the bag.'
                    : 'Rename it, adjust the quantity, target, or remove it from the bag.'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close custom item editor"
                onClick={closeEditItemDialog}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {!editingItem.isPreset && (
                <Input
                  label="Item name"
                  aria-label="Item name"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  placeholder="Custom item name"
                />
              )}

              {!editingItem.isPreset && (
                <Input
                  type="number"
                  label="Quantity"
                  aria-label="Quantity"
                  min="0"
                  step="1"
                  value={editItemQuantity}
                  onChange={(e) => setEditItemQuantity(e.target.value)}
                />
              )}

              <Input
                type="number"
                label="Target quantity"
                aria-label="Edit target quantity"
                min="1"
                step="1"
                value={editItemTargetQuantity}
                onChange={(e) => setEditItemTargetQuantity(e.target.value)}
              />

              <div className="flex gap-2 pt-2">
                {!editingItem.isPreset && (
                  <Button type="button" variant="danger" onClick={handleDeleteCustomItem} className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={closeEditItemDialog} className="flex-1">
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveItem} className="flex-1">
                  Save
                </Button>
              </div>
            </div>
          </Card>
          </div>
        </div>
      )}
    </div>
  );
}
