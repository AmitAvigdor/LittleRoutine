import type { LucideIcon } from 'lucide-react';
import {
  Apple,
  Baby,
  BarChart2,
  Briefcase,
  Droplet,
  Footprints,
  Gamepad2,
  Leaf,
  Milk,
  Moon,
  Pill,
  SmilePlus,
  Star,
  Stethoscope,
  Syringe,
  TrendingUp,
} from 'lucide-react';
import type { FeedingTypePreference } from '@/types/enums';

export type FeatureId =
  | 'feed'
  | 'pump'
  | 'sleep'
  | 'diaper'
  | 'bag'
  | 'milk-stash'
  | 'stats'
  | 'play'
  | 'walks'
  | 'growth'
  | 'solid-foods'
  | 'vaccinations'
  | 'medicine'
  | 'teething'
  | 'pediatrician'
  | 'milestones';

interface FeatureDefinition {
  id: FeatureId;
  label: string;
  formulaLabel?: string;
  path: string;
  color: string;
  icon: LucideIcon;
  formulaIcon?: LucideIcon;
  emoji: string;
}

export interface FeatureShortcut {
  id: FeatureId;
  label: string;
  path: string;
  color: string;
  emoji: string;
  Icon: LucideIcon;
}

export const MAX_FAVORITES = 6;
export const DEFAULT_FAVORITE_FEATURE_IDS: FeatureId[] = ['pump', 'milk-stash', 'stats', 'bag'];

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  { id: 'feed', label: 'Nursing', formulaLabel: 'Bottle', path: '/feed', color: '#e91e63', icon: Baby, formulaIcon: Milk, emoji: '🍼' },
  { id: 'pump', label: 'Pump', path: '/more/pump', color: '#2196f3', icon: Droplet, emoji: '💧' },
  { id: 'sleep', label: 'Sleep', path: '/sleep', color: '#3f51b5', icon: Moon, emoji: '😴' },
  { id: 'diaper', label: 'Diaper', path: '/diaper', color: '#4caf50', icon: Leaf, emoji: '🧷' },
  { id: 'bag', label: 'Bag', path: '/more/diaper-bag', color: '#f59e0b', icon: Briefcase, emoji: '🎒' },
  { id: 'milk-stash', label: 'Milk Stash', path: '/more/milk-stash', color: '#3f51b5', icon: Milk, emoji: '🥛' },
  { id: 'stats', label: 'Stats', path: '/stats', color: '#9c27b0', icon: BarChart2, emoji: '📊' },
  { id: 'play', label: 'Play', path: '/more/play', color: '#ff9800', icon: Gamepad2, emoji: '🎮' },
  { id: 'walks', label: 'Walks', path: '/more/walks', color: '#8bc34a', icon: Footprints, emoji: '🚶' },
  { id: 'growth', label: 'Growth', path: '/more/growth', color: '#ff9800', icon: TrendingUp, emoji: '📈' },
  { id: 'solid-foods', label: 'Solids', path: '/more/solid-foods', color: '#4caf50', icon: Apple, emoji: '🍎' },
  { id: 'vaccinations', label: 'Vaccines', path: '/more/vaccinations', color: '#03a9f4', icon: Syringe, emoji: '💉' },
  { id: 'medicine', label: 'Medicine', path: '/more/medicine', color: '#9c27b0', icon: Pill, emoji: '💊' },
  { id: 'teething', label: 'Teething', path: '/more/teething', color: '#e91e63', icon: SmilePlus, emoji: '🦷' },
  { id: 'pediatrician', label: 'Doctor', path: '/more/pediatrician', color: '#00bcd4', icon: Stethoscope, emoji: '👨‍⚕️' },
  { id: 'milestones', label: 'Milestones', path: '/more/milestones', color: '#ffc107', icon: Star, emoji: '⭐' },
];

const FEATURE_BY_ID = new Map(FEATURE_DEFINITIONS.map((feature) => [feature.id, feature]));

export function getFeatureShortcut(
  id: FeatureId,
  feedingTypePreference?: FeedingTypePreference
): FeatureShortcut | null {
  const feature = FEATURE_BY_ID.get(id);
  if (!feature) return null;

  const isFormulaShortcut = id === 'feed' && feedingTypePreference === 'formula';

  return {
    id: feature.id,
    label: isFormulaShortcut ? feature.formulaLabel ?? feature.label : feature.label,
    path: feature.path,
    color: feature.color,
    emoji: feature.emoji,
    Icon: isFormulaShortcut ? feature.formulaIcon ?? feature.icon : feature.icon,
  };
}

export function getFeatureShortcuts(feedingTypePreference?: FeedingTypePreference): FeatureShortcut[] {
  return FEATURE_DEFINITIONS
    .map((feature) => getFeatureShortcut(feature.id, feedingTypePreference))
    .filter((feature): feature is FeatureShortcut => feature !== null);
}

export function resolveFavoriteFeatures(
  favoriteIds: FeatureId[],
  feedingTypePreference?: FeedingTypePreference
): { features: FeatureShortcut[]; usesDefault: boolean } {
  const usesDefault = favoriteIds.length === 0;
  const sourceIds = usesDefault ? DEFAULT_FAVORITE_FEATURE_IDS : favoriteIds;
  const seen = new Set<FeatureId>();

  const features = sourceIds
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX_FAVORITES)
    .map((id) => getFeatureShortcut(id, feedingTypePreference))
    .filter((feature): feature is FeatureShortcut => feature !== null);

  return { features, usesDefault };
}
