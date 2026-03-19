import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from '@/stores/toastStore';
import { Baby, Minus, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ChecklistItem {
  id: string;
  label: string;
  quantity: number;
  isPreset: boolean;
}

const STORAGE_KEY_PREFIX = 'diaper-bag-checklist';

const PRESET_ITEMS: ChecklistItem[] = [
  { id: 'preset-diapers', label: 'Diapers', quantity: 0, isPreset: true },
  { id: 'preset-wipes', label: 'Wipes', quantity: 0, isPreset: true },
  { id: 'preset-changing-mat', label: 'Changing Mat', quantity: 0, isPreset: true },
  { id: 'preset-rash-cream', label: 'Diaper Rash Cream', quantity: 0, isPreset: true },
  { id: 'preset-change-clothes', label: 'Change of Clothes', quantity: 0, isPreset: true },
];

function getStorageKey(userId: string | null | undefined) {
  return `${STORAGE_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

function mergeWithPresetItems(savedItems: ChecklistItem[] | null): ChecklistItem[] {
  if (!savedItems || savedItems.length === 0) return PRESET_ITEMS;

  const savedById = new Map(savedItems.map((item) => [item.id, item]));
  const presetItems = PRESET_ITEMS.map((item) => {
    const saved = savedById.get(item.id);
    return saved ? { ...item, quantity: saved.quantity } : item;
  });

  const customItems = savedItems.filter((item) => !item.isPreset);
  return [...presetItems, ...customItems];
}

export function DiaperBagChecklistView() {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>(PRESET_ITEMS);
  const [customItemName, setCustomItemName] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(false);

    try {
      const stored = localStorage.getItem(getStorageKey(user?.uid));
      if (!stored) {
        setItems(PRESET_ITEMS);
        setHasHydrated(true);
        return;
      }

      const parsed = JSON.parse(stored) as ChecklistItem[];
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

  const packedTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const packedItemsCount = useMemo(
    () => items.filter((item) => item.quantity > 0).length,
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

    setItems((currentItems) => [
      ...currentItems,
      {
        id: `custom-${Date.now()}`,
        label: trimmedName,
        quantity: 0,
        isPreset: false,
      },
    ]);
    setCustomItemName('');
  };

  const handleRemoveCustomItem = (itemId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-amber-50/40 to-white">
      <Header title="Diaper Bag" showBabySwitcher={false} />

      <div className="px-4 py-4 space-y-4">
        <Card
          className="overflow-hidden border-amber-100"
          style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 55%, #ffffff 100%)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-700">Pack status</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{packedTotal}</p>
              <p className="text-sm text-gray-500 mt-1">
                {packedItemsCount} item{packedItemsCount === 1 ? '' : 's'} packed
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Baby className="w-7 h-7 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Checklist"
            subtitle="Adjust each item as you pack the bag"
            emoji="🧷"
          />

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={clsx(
                  'rounded-2xl border px-4 py-3 transition-colors',
                  item.quantity > 0 ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-100 bg-white'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.isPreset ? 'Essential item' : 'Custom item'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.label}`}
                      className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:border-gray-300 disabled:opacity-40"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity === 0}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="w-12 text-center">
                      <p className="text-2xl font-bold text-gray-900">{item.quantity}</p>
                    </div>

                    <button
                      type="button"
                      aria-label={`Increase ${item.label}`}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm hover:shadow-md"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {!item.isPreset && (
                      <button
                        type="button"
                        aria-label={`Remove ${item.label}`}
                        className="w-10 h-10 rounded-full border border-red-200 bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100"
                        onClick={() => handleRemoveCustomItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Add Custom Item"
            subtitle="Include toys, meds, pacifiers, or anything else"
            emoji="➕"
          />

          <div className="flex gap-3">
            <Input
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
            <Button onClick={handleAddCustomItem} disabled={!customItemName.trim()}>
              Add
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
