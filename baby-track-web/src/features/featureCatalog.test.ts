import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FAVORITE_FEATURE_IDS,
  MAX_FAVORITES,
  getFeatureShortcut,
  resolveFavoriteFeatures,
} from './featureCatalog';

describe('featureCatalog', () => {
  describe('getFeatureShortcut', () => {
    it('uses the bottle label and icon for feed favorites in formula mode', () => {
      const shortcut = getFeatureShortcut('feed', 'formula');

      expect(shortcut).not.toBeNull();
      expect(shortcut?.label).toBe('Bottle');
    });

    it('keeps the nursing label in breastfeeding mode', () => {
      const shortcut = getFeatureShortcut('feed', 'breastfeeding');

      expect(shortcut).not.toBeNull();
      expect(shortcut?.label).toBe('Nursing');
    });
  });

  describe('resolveFavoriteFeatures', () => {
    it('falls back to the default home favorites when none are selected', () => {
      const result = resolveFavoriteFeatures([], 'breastfeeding');

      expect(result.usesDefault).toBe(true);
      expect(result.features.map((feature) => feature.id)).toEqual(DEFAULT_FAVORITE_FEATURE_IDS);
    });

    it('deduplicates and limits favorites to the maximum display count', () => {
      const result = resolveFavoriteFeatures(
        ['feed', 'sleep', 'diaper', 'milk-stash', 'pump', 'bag', 'stats', 'feed'],
        'breastfeeding'
      );

      expect(result.usesDefault).toBe(false);
      expect(result.features).toHaveLength(MAX_FAVORITES);
      expect(result.features.map((feature) => feature.id)).toEqual([
        'feed',
        'sleep',
        'diaper',
        'milk-stash',
        'pump',
        'bag',
      ]);
    });
  });
});
