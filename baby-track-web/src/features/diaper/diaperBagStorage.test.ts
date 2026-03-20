import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeDiaperBagSupplies,
  DIAPER_BAG_ITEM_IDS,
  getDiaperBagStorageKey,
  loadDiaperBagItems,
} from './diaperBagStorage';

describe('diaperBagStorage', () => {
  const userId = 'user-1';

  beforeEach(() => {
    localStorage.clear();
  });

  it('subtracts only the requested diaper item', () => {
    localStorage.setItem(
      getDiaperBagStorageKey(userId),
      JSON.stringify([
        { id: DIAPER_BAG_ITEM_IDS.diapers, label: 'Diapers', quantity: 1, isPreset: true, category: 'hygiene' },
        { id: DIAPER_BAG_ITEM_IDS.wipes, label: 'Wipes', quantity: 1, isPreset: true, category: 'hygiene' },
      ])
    );

    const result = consumeDiaperBagSupplies(userId, [DIAPER_BAG_ITEM_IDS.diapers]);

    expect(result.consumedItems).toEqual([expect.objectContaining({ id: DIAPER_BAG_ITEM_IDS.diapers, quantity: 0 })]);
    expect(loadDiaperBagItems(userId)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: DIAPER_BAG_ITEM_IDS.diapers, quantity: 0 }),
      expect.objectContaining({ id: DIAPER_BAG_ITEM_IDS.wipes, quantity: 1 }),
    ]));
  });

  it('keeps quantities from going below zero', () => {
    localStorage.setItem(
      getDiaperBagStorageKey(userId),
      JSON.stringify([
        { id: DIAPER_BAG_ITEM_IDS.diapers, label: 'Diapers', quantity: 0, isPreset: true, category: 'hygiene' },
        { id: DIAPER_BAG_ITEM_IDS.wipes, label: 'Wipes', quantity: 0, isPreset: true, category: 'hygiene' },
      ])
    );

    consumeDiaperBagSupplies(userId, [DIAPER_BAG_ITEM_IDS.diapers]);

    expect(loadDiaperBagItems(userId)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: DIAPER_BAG_ITEM_IDS.diapers, quantity: 0 }),
      expect.objectContaining({ id: DIAPER_BAG_ITEM_IDS.wipes, quantity: 0 }),
    ]));
  });
});
