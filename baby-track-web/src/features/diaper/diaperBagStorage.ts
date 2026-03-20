export type ChecklistCategory = 'hygiene' | 'clothing' | 'feeding' | 'custom';

export interface ChecklistItem {
  id: string;
  label: string;
  quantity: number;
  isPreset: boolean;
  category: ChecklistCategory;
}

type SavedChecklistItem = Partial<ChecklistItem> & {
  id: string;
  label: string;
  quantity?: number;
  isPreset: boolean;
};

const STORAGE_KEY_PREFIX = 'diaper-bag-checklist';
export const DIAPER_BAG_ITEM_IDS = {
  diapers: 'preset-diapers',
  wipes: 'preset-wipes',
} as const;

export const DIAPER_BAG_PRESET_ITEMS: ChecklistItem[] = [
  { id: DIAPER_BAG_ITEM_IDS.diapers, label: 'Diapers', quantity: 0, isPreset: true, category: 'hygiene' },
  { id: DIAPER_BAG_ITEM_IDS.wipes, label: 'Wipes', quantity: 0, isPreset: true, category: 'hygiene' },
  { id: 'preset-changing-mat', label: 'Changing Mat', quantity: 0, isPreset: true, category: 'hygiene' },
  { id: 'preset-rash-cream', label: 'Diaper Rash Cream', quantity: 0, isPreset: true, category: 'hygiene' },
  { id: 'preset-disposable-diaper-bag', label: 'Disposable Diaper Bag', quantity: 0, isPreset: true, category: 'hygiene' },
  { id: 'preset-hand-sanitizer', label: 'Hand Sanitizer', quantity: 0, isPreset: true, category: 'hygiene' },
  { id: 'preset-change-clothes', label: 'Change of Clothes', quantity: 0, isPreset: true, category: 'clothing' },
  { id: 'preset-hat', label: 'Hat', quantity: 0, isPreset: true, category: 'clothing' },
  { id: 'preset-burp-cloth', label: 'Burp Cloth', quantity: 0, isPreset: true, category: 'feeding' },
  { id: 'preset-pacifier', label: 'Pacifier', quantity: 0, isPreset: true, category: 'feeding' },
];

function createCustomItem(id: string, label: string, quantity = 0): ChecklistItem {
  return {
    id,
    label,
    quantity,
    isPreset: false,
    category: 'custom',
  };
}

export function getDiaperBagStorageKey(userId: string | null | undefined) {
  return `${STORAGE_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

export function mergeWithPresetItems(savedItems: SavedChecklistItem[] | null): ChecklistItem[] {
  if (!savedItems || savedItems.length === 0) return DIAPER_BAG_PRESET_ITEMS;

  const savedById = new Map(savedItems.map((item) => [item.id, item]));
  const presetItems = DIAPER_BAG_PRESET_ITEMS.map((item) => {
    const saved = savedById.get(item.id);
    if (!saved) return item;

    return {
      ...item,
      quantity: saved.quantity ?? item.quantity,
    };
  });

  const customItems = savedItems
    .filter((item) => !item.isPreset)
    .map((item) => createCustomItem(item.id, item.label, item.quantity ?? 0));

  return [...presetItems, ...customItems];
}

export function loadDiaperBagItems(userId: string | null | undefined): ChecklistItem[] {
  const stored = localStorage.getItem(getDiaperBagStorageKey(userId));
  if (!stored) {
    return DIAPER_BAG_PRESET_ITEMS;
  }

  const parsed = JSON.parse(stored) as SavedChecklistItem[];
  return mergeWithPresetItems(parsed);
}

export function saveDiaperBagItems(userId: string | null | undefined, items: ChecklistItem[]) {
  localStorage.setItem(getDiaperBagStorageKey(userId), JSON.stringify(items));
}

export function consumeDiaperBagSupplies(userId: string | null | undefined, itemIds: string[]) {
  const items = loadDiaperBagItems(userId);
  const consumedItems: ChecklistItem[] = [];

  const updatedItems = items.map((item) => {
    if (!itemIds.includes(item.id)) {
      return item;
    }

    const nextQuantity = Math.max(0, item.quantity - 1);
    const updatedItem = {
      ...item,
      quantity: nextQuantity,
    };
    consumedItems.push(updatedItem);

    return updatedItem;
  });

  saveDiaperBagItems(userId, updatedItems);

  return {
    items: updatedItems,
    consumedItems,
  };
}
