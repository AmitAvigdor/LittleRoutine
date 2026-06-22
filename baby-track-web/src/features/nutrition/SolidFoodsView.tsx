import { useEffect, useId, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createSolidFood, deleteSolidFood, subscribeToSolidFoods, updateSolidFood } from '@/lib/firestore';
import type { SolidFood } from '@/types';
import { COMMON_FOODS, FoodCategory, FoodReaction, FoodPreference, FOOD_CATEGORY_CONFIG, FOOD_REACTION_CONFIG } from '@/types/enums';
import { Apple, AlertTriangle, Minus, Pencil, Plus, Search, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from '@/stores/toastStore';
import {
  compareSolidFoodsNewestFirst,
  formatSolidFoodDate,
  normalizeSolidFoodDate,
} from './solidFoodUtils';

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeFoodName(foodName: string) {
  return foodName.trim().toLowerCase();
}

function getSuggestedFoods() {
  const suggestions: typeof COMMON_FOODS = [];
  const seenNames = new Set<string>();
  const categoriesCovered = new Set<FoodCategory>();

  for (const food of COMMON_FOODS) {
    if (!categoriesCovered.has(food.category)) {
      suggestions.push(food);
      seenNames.add(food.name);
      categoriesCovered.add(food.category);
    }
  }

  for (const food of COMMON_FOODS) {
    if (suggestions.length >= 10) {
      break;
    }

    if (seenNames.has(food.name)) {
      continue;
    }

    suggestions.push(food);
    seenNames.add(food.name);
  }

  return suggestions;
}

function getDefaultFormState() {
  return {
    foodName: '',
    date: getTodayLocalDate(),
    category: 'fruit' as FoodCategory,
    isFirstIntroduction: true,
    reaction: 'none' as FoodReaction,
    reactionNotes: '',
    liked: null as FoodPreference | null,
    notes: '',
  };
}

export function SolidFoodsView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const [foods, setFoods] = useState<SolidFood[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);
  const [filter, setFilter] = useState<FoodCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [deletingFoodId, setDeletingFoodId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [formState, setFormState] = useState(getDefaultFormState());
  const reactionLabelId = useId();
  const preferenceLabelId = useId();
  const categoryLabelId = useId();
  const formTitleId = useId();

  useEffect(() => {
    setShowForm(false);
    setEditingFoodId(null);
    setFormError('');
    setFormState(getDefaultFormState());

    if (!selectedBaby) {
      setFoods([]);
      setIsLoadingFoods(false);
      return;
    }

    setFoods([]);
    setIsLoadingFoods(true);

    const unsubscribe = subscribeToSolidFoods(selectedBaby.id, (data) => {
      setFoods(data);
      setIsLoadingFoods(false);
    });

    return () => unsubscribe();
  }, [selectedBaby]);

  const existingFoodNames = useMemo(
    () => new Set(
      foods
        .filter((food) => food.id !== editingFoodId)
        .map((food) => normalizeFoodName(food.foodName))
    ),
    [editingFoodId, foods]
  );

  const normalizedCurrentFoodName = normalizeFoodName(formState.foodName);
  const hasTriedCurrentFood = normalizedCurrentFoodName.length > 0 && existingFoodNames.has(normalizedCurrentFoodName);
  const shouldSuggestFirstIntroduction = normalizedCurrentFoodName.length > 0 && !hasTriedCurrentFood;
  const filteredFoods = useMemo(() => {
    const query = search.trim().toLowerCase();

    return foods.filter((food) => {
      const categoryMatches = filter === 'all' || food.category === filter;
      const queryMatches = !query
        || food.foodName.toLowerCase().includes(query)
        || (food.notes?.toLowerCase().includes(query) ?? false)
        || (food.reactionNotes?.toLowerCase().includes(query) ?? false);

      return categoryMatches && queryMatches;
    }).sort(compareSolidFoodsNewestFirst);
  }, [filter, foods, search]);

  const foodsWithReactions = useMemo(() => {
    const latestByFood = new Map<string, SolidFood>();

    foods
      .filter((food) => food.reaction && food.reaction !== 'none')
      .forEach((food) => {
        const key = normalizeFoodName(food.foodName);
        const existing = latestByFood.get(key);

        const isNewerDate = normalizeSolidFoodDate(food.date) > normalizeSolidFoodDate(existing?.date ?? '');
        const isSameDateButNewer = existing
          && normalizeSolidFoodDate(food.date) === normalizeSolidFoodDate(existing.date)
          && food.updatedAt > existing.updatedAt;

        if (!existing || isNewerDate || isSameDateButNewer) {
          latestByFood.set(key, food);
        }
      });

    return Array.from(latestByFood.values()).sort(compareSolidFoodsNewestFirst);
  }, [foods]);

  const suggestionFoods = useMemo(() => getSuggestedFoods(), []);
  const visibleSuggestions = useMemo(() => {
    const query = normalizeFoodName(formState.foodName);
    const matches = query
      ? COMMON_FOODS.filter((food) => normalizeFoodName(food.name).includes(query))
      : suggestionFoods;
    return matches.slice(0, 6);
  }, [formState.foodName, suggestionFoods]);

  const foodGroups = useMemo(() => {
    const groups = new Map<string, SolidFood[]>();
    filteredFoods.forEach((food) => {
      const date = normalizeSolidFoodDate(food.date);
      groups.set(date, [...(groups.get(date) ?? []), food]);
    });
    return Array.from(groups.entries());
  }, [filteredFoods]);

  const updateFormState = <K extends keyof ReturnType<typeof getDefaultFormState>>(
    key: K,
    value: ReturnType<typeof getDefaultFormState>[K]
  ) => {
    setFormError('');
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingFoodId(null);
    setFormError('');
    setFormState(getDefaultFormState());
  };

  const openCreateForm = () => {
    setEditingFoodId(null);
    setFormError('');
    setFormState(getDefaultFormState());
    setShowForm(true);
  };

  const openEditForm = (food: SolidFood) => {
    setEditingFoodId(food.id);
    setFormError('');
    setFormState({
      foodName: food.foodName,
      date: normalizeSolidFoodDate(food.date),
      category: food.category,
      isFirstIntroduction: food.isFirstIntroduction,
      reaction: food.reaction ?? 'none',
      reactionNotes: food.reactionNotes ?? '',
      liked: food.liked,
      notes: food.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby || !formState.foodName.trim()) return;

    const trimmedFoodName = formState.foodName.trim();
    const today = getTodayLocalDate();
    if (formState.date > today) {
      setFormError('Date cannot be in the future.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        foodName: trimmedFoodName,
        date: normalizeSolidFoodDate(formState.date),
        category: formState.category,
        isFirstIntroduction: formState.isFirstIntroduction,
        reaction: formState.reaction,
        reactionNotes: formState.reaction === 'none' ? null : formState.reactionNotes.trim() || null,
        liked: formState.liked,
        notes: formState.notes.trim() || null,
      };

      if (editingFoodId) {
        await updateSolidFood(editingFoodId, payload);
        toast.success(`Updated ${trimmedFoodName}`);
      } else {
        await createSolidFood(selectedBaby.id, user.uid, payload);
        toast.success(`Added ${trimmedFoodName}`);
      }

      closeForm();
    } catch (error) {
      console.error('Error saving solid food:', error);
      setFormError('Could not save this entry. Please try again.');
      toast.error('Could not save food entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (food: SolidFood) => {
    if (!window.confirm(`Delete ${food.foodName} from ${formatSolidFoodDate(food.date)}?`)) {
      return;
    }

    setDeletingFoodId(food.id);
    try {
      await deleteSolidFood(food.id);
      if (editingFoodId === food.id) {
        closeForm();
      }
      toast.success(`Deleted ${food.foodName}`);
    } catch (error) {
      console.error('Error deleting solid food:', error);
      toast.error('Could not delete food entry');
    } finally {
      setDeletingFoodId(null);
    }
  };

  if (!selectedBaby) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please select a baby first
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Solid Foods"
        showBabySwitcher
        rightAction={
          <Button size="sm" onClick={openCreateForm}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Reactions Alert */}
        {foodsWithReactions.length > 0 && (
          <Card className="bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Foods with reactions</p>
                <div className="mt-2 space-y-2">
                  {foodsWithReactions.slice(0, 3).map((food) => (
                    <div key={food.id} className="text-sm text-amber-700">
                      <p className="font-medium">
                        {food.foodName} · {FOOD_REACTION_CONFIG[food.reaction ?? 'none'].label}
                      </p>
                      <p className="text-amber-600">
                        {formatSolidFoodDate(food.date)}
                        {food.reactionNotes ? ` · ${food.reactionNotes}` : ''}
                      </p>
                    </div>
                  ))}
                  {foodsWithReactions.length > 3 && (
                    <p className="text-xs text-amber-600">
                      {foodsWithReactions.length - 3} more reaction entries in history
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Add Entry Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/40 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={formTitleId}
            className="mx-auto w-full max-w-lg"
          >
          <Card className="shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 id={formTitleId} className="font-semibold text-gray-900">
                {editingFoodId ? 'Edit Food Entry' : 'Add Food'}
              </h3>
              <button
                type="button"
                aria-label="Close solid food form"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Food Name"
                placeholder="Enter food name"
                value={formState.foodName}
                onChange={(e) => {
                  const nextFoodName = e.target.value;
                  const normalizedNextFoodName = normalizeFoodName(nextFoodName);
                  const hasTried = normalizedNextFoodName.length > 0 && existingFoodNames.has(normalizedNextFoodName);

                  setFormState((current) => ({
                    ...current,
                    foodName: nextFoodName,
                    isFirstIntroduction: normalizedNextFoodName.length === 0
                      ? current.isFirstIntroduction
                      : !hasTried,
                  }));
                  setFormError('');
                }}
                required
              />

              {/* Common foods suggestions */}
              {visibleSuggestions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">
                  {formState.foodName.trim() ? 'Matching foods' : 'Quick picks'}
                </p>
                <div className="flex flex-wrap gap-2">
                {visibleSuggestions.map((food) => (
                  <button
                    key={food.name}
                    type="button"
                    onClick={() => {
                      const normalizedFoodName = normalizeFoodName(food.name);
                      setFormState((current) => ({
                        ...current,
                        foodName: food.name,
                        category: food.category,
                        isFirstIntroduction: !existingFoodNames.has(normalizedFoodName),
                      }));
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-100 rounded-full hover:bg-gray-200"
                  >
                    {food.name}
                  </button>
                ))}
                </div>
              </div>
              )}

              <Input
                type="date"
                label="Date"
                value={formState.date}
                max={getTodayLocalDate()}
                onChange={(e) => updateFormState('date', e.target.value)}
                required
              />

              {/* Category */}
              <div>
                <label id={categoryLabelId} className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby={categoryLabelId}>
                  {(Object.keys(FOOD_CATEGORY_CONFIG) as FoodCategory[]).map((cat) => {
                    const config = FOOD_CATEGORY_CONFIG[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={formState.category === cat}
                        onClick={() => updateFormState('category', cat)}
                        className={clsx(
                          'px-3 py-2 rounded-full text-sm font-medium transition-colors border',
                          formState.category === cat
                            ? clsx(cat === 'protein' ? 'text-white' : 'text-gray-950', 'border-transparent')
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                        style={formState.category === cat ? { backgroundColor: config.color } : undefined}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* First Introduction */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formState.isFirstIntroduction}
                  onChange={(e) => updateFormState('isFirstIntroduction', e.target.checked)}
                  className="w-4 h-4 rounded text-primary-500"
                />
                <span className="text-sm text-gray-700">
                  First time trying this food
                  {formState.foodName.trim() && (
                    <span className="text-gray-500">
                      {shouldSuggestFirstIntroduction ? ' · suggested as first try' : ' · already logged before'}
                    </span>
                  )}
                </span>
              </label>

              {/* Reaction */}
              <div>
                <label id={reactionLabelId} className="block text-sm font-medium text-gray-700 mb-2">
                  Reaction
                </label>
                <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={reactionLabelId}>
                  {(Object.keys(FOOD_REACTION_CONFIG) as FoodReaction[]).map((r) => {
                    const config = FOOD_REACTION_CONFIG[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={formState.reaction === r}
                        onClick={() => {
                          updateFormState('reaction', r);
                          if (r === 'none') updateFormState('reactionNotes', '');
                        }}
                        className={clsx(
                          'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          formState.reaction === r
                            ? r === 'severe' ? 'text-white' : 'text-gray-950'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                        style={formState.reaction === r ? { backgroundColor: config.color } : undefined}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formState.reaction !== 'none' && (
                <Textarea
                  label="Reaction details (optional)"
                  placeholder="Add details only if they are useful"
                  value={formState.reactionNotes}
                  onChange={(e) => updateFormState('reactionNotes', e.target.value)}
                  rows={2}
                />
              )}

              {/* Liked */}
              <div>
                <label id={preferenceLabelId} className="block text-sm font-medium text-gray-700 mb-2">
                  Did baby like it?
                </label>
                <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={preferenceLabelId}>
                  <button
                    type="button"
                    aria-pressed={formState.liked === 'loved'}
                    onClick={() => updateFormState('liked', formState.liked === 'loved' ? null : 'loved')}
                    className={clsx(
                      'flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm transition-colors',
                      formState.liked === 'loved'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Loved
                  </button>
                  <button
                    type="button"
                    aria-pressed={formState.liked === 'neutral'}
                    onClick={() => updateFormState('liked', formState.liked === 'neutral' ? null : 'neutral')}
                    className={clsx(
                      'flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm transition-colors',
                      formState.liked === 'neutral'
                        ? 'bg-gray-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <Minus className="w-4 h-4" />
                    Neutral
                  </button>
                  <button
                    type="button"
                    aria-pressed={formState.liked === 'disliked'}
                    onClick={() => updateFormState('liked', formState.liked === 'disliked' ? null : 'disliked')}
                    className={clsx(
                      'flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm transition-colors',
                      formState.liked === 'disliked'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Disliked
                  </button>
                </div>
              </div>

              <Textarea
                label="Notes (optional)"
                placeholder="Anything else worth remembering"
                value={formState.notes}
                onChange={(e) => updateFormState('notes', e.target.value)}
                rows={2}
              />

              {formError && (
                <p role="alert" className="text-sm text-red-500">{formError}</p>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeForm} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saving || !formState.foodName.trim()}>
                  {saving ? 'Saving...' : editingFoodId ? 'Update' : 'Save'}
                </Button>
              </div>
            </form>
          </Card>
          </div>
          </div>
        )}

        {/* Filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            aria-label="Search solid foods"
            placeholder="Search foods, notes, or reactions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
            className={clsx(
              'px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap',
              filter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            All
          </button>
          {(Object.keys(FOOD_CATEGORY_CONFIG) as FoodCategory[]).map((cat) => {
            const config = FOOD_CATEGORY_CONFIG[cat];
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={filter === cat}
                onClick={() => setFilter(cat)}
                className={clsx(
                  'px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap',
                  filter === cat
                    ? cat === 'protein' ? 'text-white' : 'text-gray-950'
                    : 'bg-gray-100 text-gray-600'
                )}
                style={filter === cat ? { backgroundColor: config.color } : undefined}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* History */}
        {isLoadingFoods ? (
          <Card className="text-center py-8">
            <p className="text-gray-500">Loading foods...</p>
          </Card>
        ) : filteredFoods.length === 0 ? (
          <Card className="text-center py-8">
            <Apple className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              {foods.length === 0 ? 'No foods recorded yet' : 'No foods match this filter'}
            </p>
            <p className="text-sm text-gray-400">
              {foods.length === 0 ? 'Tap + to add your first food' : 'Try a different category or search term'}
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            {foodGroups.map(([date, dateFoods]) => (
              <section key={date} aria-label={formatSolidFoodDate(date)}>
                <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {formatSolidFoodDate(date)}
                </h3>
                <div className="space-y-2">
            {dateFoods.map((food) => {
              const catConfig = FOOD_CATEGORY_CONFIG[food.category];
              const reactionConfig = food.reaction ? FOOD_REACTION_CONFIG[food.reaction] : null;

              return (
                <Card key={food.id} className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded-full text-xs',
                            food.category === 'protein' ? 'text-white' : 'text-gray-950'
                          )}
                          style={{ backgroundColor: catConfig.color }}
                        >
                          {catConfig.label}
                        </span>
                        {food.isFirstIntroduction && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-600">
                            First time
                          </span>
                        )}
                        {reactionConfig && food.reaction !== 'none' && (
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-xs',
                              food.reaction === 'severe' ? 'text-white' : 'text-gray-950'
                            )}
                            style={{ backgroundColor: reactionConfig.color }}
                          >
                            {reactionConfig.label}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 mt-1">{food.foodName}</p>
                      {food.reactionNotes && food.reaction !== 'none' && (
                        <p className="text-sm text-amber-700 mt-1">{food.reactionNotes}</p>
                      )}
                      {food.notes && (
                        <p className="text-sm text-gray-500 mt-1">{food.notes}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      {food.liked === 'loved' && <ThumbsUp className="w-5 h-5 text-green-500" />}
                      {food.liked === 'neutral' && <Minus className="w-5 h-5 text-gray-400" />}
                      {food.liked === 'disliked' && <ThumbsDown className="w-5 h-5 text-red-500" />}
                      <button
                        type="button"
                        aria-label={`Edit ${food.foodName}`}
                        onClick={() => openEditForm(food)}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${food.foodName}`}
                        onClick={() => handleDelete(food)}
                        disabled={deletingFoodId === food.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
