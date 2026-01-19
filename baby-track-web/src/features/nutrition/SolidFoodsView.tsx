import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createSolidFood, subscribeToSolidFoods } from '@/lib/firestore';
import type { SolidFood } from '@/types';
import { COMMON_FOODS, FoodCategory, FoodReaction, FoodPreference, FOOD_CATEGORY_CONFIG, FOOD_REACTION_CONFIG, FOOD_PREFERENCE_CONFIG } from '@/types/enums';
import { Apple, Plus, X, AlertTriangle, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';

export function SolidFoodsView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const [foods, setFoods] = useState<SolidFood[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FoodCategory | 'all'>('all');

  // Form state
  const [foodName, setFoodName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<FoodCategory>('fruit');
  const [isFirstIntroduction, setIsFirstIntroduction] = useState(true);
  const [reaction, setReaction] = useState<FoodReaction>('none');
  const [reactionNotes, setReactionNotes] = useState('');
  const [liked, setLiked] = useState<FoodPreference | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribe = subscribeToSolidFoods(selectedBaby.id, (data) => {
      setFoods(data);
    });

    return () => unsubscribe();
  }, [selectedBaby]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby || !foodName.trim()) return;

    setLoading(true);
    try {
      await createSolidFood(selectedBaby.id, user.uid, {
        foodName: foodName.trim(),
        date,
        category,
        isFirstIntroduction,
        reaction,
        reactionNotes: reactionNotes || null,
        liked,
        notes: notes || null,
      });

      // Reset form
      setFoodName('');
      setIsFirstIntroduction(true);
      setReaction('none');
      setReactionNotes('');
      setLiked(null);
      setNotes('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding solid food:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = filter === 'all'
    ? foods
    : foods.filter(f => f.category === filter);

  const foodsWithReactions = foods.filter(f => f.reaction && f.reaction !== 'none');

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
        showBabySwitcher={false}
        rightAction={
          <Button size="sm" onClick={() => setShowForm(true)}>
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
                <p className="text-sm text-amber-600">
                  {foodsWithReactions.map(f => f.foodName).join(', ')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Add Entry Form */}
        {showForm && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Add Food</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Food Name"
                placeholder="Enter food name"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                required
              />

              {/* Common foods suggestions */}
              <div className="flex flex-wrap gap-2">
                {COMMON_FOODS.slice(0, 8).map((food) => (
                  <button
                    key={food.name}
                    type="button"
                    onClick={() => {
                      setFoodName(food.name);
                      setCategory(food.category);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 rounded-full hover:bg-gray-200"
                  >
                    {food.name}
                  </button>
                ))}
              </div>

              <Input
                type="date"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FOOD_CATEGORY_CONFIG) as FoodCategory[]).map((cat) => {
                    const config = FOOD_CATEGORY_CONFIG[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={clsx(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                          category === cat
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                        style={category === cat ? { backgroundColor: config.color } : undefined}
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
                  checked={isFirstIntroduction}
                  onChange={(e) => setIsFirstIntroduction(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-500"
                />
                <span className="text-sm text-gray-700">First time trying this food</span>
              </label>

              {/* Reaction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reaction
                </label>
                <div className="flex gap-2">
                  {(Object.keys(FOOD_REACTION_CONFIG) as FoodReaction[]).map((r) => {
                    const config = FOOD_REACTION_CONFIG[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReaction(r)}
                        className={clsx(
                          'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          reaction === r
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                        style={reaction === r ? { backgroundColor: config.color } : undefined}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {reaction !== 'none' && (
                <Input
                  label="Reaction Notes"
                  placeholder="Describe the reaction..."
                  value={reactionNotes}
                  onChange={(e) => setReactionNotes(e.target.value)}
                />
              )}

              {/* Liked */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Did baby like it?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLiked('loved')}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors',
                      liked === 'loved'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Loved it
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiked('neutral')}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors',
                      liked === 'neutral'
                        ? 'bg-gray-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <Minus className="w-4 h-4" />
                    Neutral
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiked('disliked')}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors',
                      liked === 'disliked'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Disliked
                  </button>
                </div>
              </div>

              <Input
                label="Notes (optional)"
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button type="submit" className="w-full" disabled={loading || !foodName.trim()}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </Card>
        )}

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap',
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
                onClick={() => setFilter(cat)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap',
                  filter === cat
                    ? 'text-white'
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
        {filteredFoods.length === 0 ? (
          <Card className="text-center py-8">
            <Apple className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No foods recorded yet</p>
            <p className="text-sm text-gray-400">Tap + to add your first food</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredFoods.map((food) => {
              const catConfig = FOOD_CATEGORY_CONFIG[food.category];
              const reactionConfig = food.reaction ? FOOD_REACTION_CONFIG[food.reaction] : null;

              return (
                <Card key={food.id} className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs text-white"
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
                            className="px-2 py-0.5 rounded-full text-xs text-white"
                            style={{ backgroundColor: reactionConfig.color }}
                          >
                            {reactionConfig.label}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 mt-1">{food.foodName}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(food.date).toLocaleDateString()}
                      </p>
                      {food.notes && (
                        <p className="text-sm text-gray-500 mt-1">{food.notes}</p>
                      )}
                    </div>
                    <div>
                      {food.liked === 'loved' && <ThumbsUp className="w-5 h-5 text-green-500" />}
                      {food.liked === 'disliked' && <ThumbsDown className="w-5 h-5 text-red-500" />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
