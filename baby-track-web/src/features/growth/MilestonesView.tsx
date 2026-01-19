import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createMilestone, subscribeToMilestones, markMilestoneAchieved } from '@/lib/firestore';
import type { Milestone } from '@/types';
import { MilestoneCategory, MILESTONE_CATEGORY_CONFIG, COMMON_MILESTONES } from '@/types/enums';
import { Star, Plus, X, Check, Clock } from 'lucide-react';
import { clsx } from 'clsx';

export function MilestonesView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<MilestoneCategory | 'all'>('all');
  const [loading, setLoading] = useState(false);

  // Form state
  const [milestoneName, setMilestoneName] = useState('');
  const [category, setCategory] = useState<MilestoneCategory>('motor');
  const [achievedDate, setAchievedDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribe = subscribeToMilestones(selectedBaby.id, (data) => {
      setMilestones(data);
    });

    return () => unsubscribe();
  }, [selectedBaby]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby || !milestoneName.trim()) return;

    setLoading(true);
    try {
      await createMilestone(selectedBaby.id, user.uid, {
        name: milestoneName.trim(),
        category,
        achievedDate: achievedDate || null,
        notes: notes || null,
      });

      setMilestoneName('');
      setCategory('motor');
      setAchievedDate('');
      setNotes('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding milestone:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAchieved = async (milestone: Milestone) => {
    const date = new Date().toISOString().split('T')[0];
    try {
      await markMilestoneAchieved(milestone.id, date);
    } catch (error) {
      console.error('Error marking milestone:', error);
    }
  };

  const filteredMilestones = filter === 'all'
    ? milestones
    : milestones.filter(m => m.category === filter);

  const achieved = filteredMilestones.filter(m => m.isAchieved);
  const pending = filteredMilestones.filter(m => !m.isAchieved);

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
        title="Milestones"
        showBabySwitcher={false}
        rightAction={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="text-center">
            <p className="text-3xl font-bold text-yellow-500">{achieved.length}</p>
            <p className="text-sm text-gray-500">Achieved</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-gray-400">{pending.length}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </Card>
        </div>

        {/* Add Form */}
        {showForm && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Add Milestone</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Milestone"
                placeholder="e.g., First smile, First steps"
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
                required
              />

              {/* Common milestones */}
              <div className="flex flex-wrap gap-2">
                {COMMON_MILESTONES.slice(0, 6).map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => {
                      setMilestoneName(m.name);
                      setCategory(m.category);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 rounded-full hover:bg-gray-200"
                  >
                    {m.name}
                  </button>
                ))}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(MILESTONE_CATEGORY_CONFIG) as MilestoneCategory[]).map((cat) => {
                    const config = MILESTONE_CATEGORY_CONFIG[cat];
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

              <Input
                type="date"
                label="Achieved Date (optional)"
                value={achievedDate}
                onChange={(e) => setAchievedDate(e.target.value)}
              />

              <Input
                label="Notes (optional)"
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button type="submit" className="w-full" disabled={loading || !milestoneName.trim()}>
                {loading ? 'Saving...' : 'Add Milestone'}
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
          {(Object.keys(MILESTONE_CATEGORY_CONFIG) as MilestoneCategory[]).map((cat) => {
            const config = MILESTONE_CATEGORY_CONFIG[cat];
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

        {/* Pending */}
        {pending.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pending.length})
            </h3>
            <div className="space-y-2">
              {pending.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onMarkAchieved={() => handleMarkAchieved(milestone)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Achieved */}
        {achieved.length > 0 && (
          <div>
            <h3 className="font-semibold text-yellow-600 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Achieved ({achieved.length})
            </h3>
            <div className="space-y-2">
              {achieved.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} achieved />
              ))}
            </div>
          </div>
        )}

        {milestones.length === 0 && !showForm && (
          <Card className="text-center py-8">
            <Star className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No milestones recorded</p>
            <p className="text-sm text-gray-400">Tap + to add one</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function MilestoneCard({
  milestone,
  onMarkAchieved,
  achieved,
}: {
  milestone: Milestone;
  onMarkAchieved?: () => void;
  achieved?: boolean;
}) {
  const catConfig = MILESTONE_CATEGORY_CONFIG[milestone.category];

  return (
    <Card className={clsx('py-3', achieved && 'bg-yellow-50 border border-yellow-200')}>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded-full text-xs text-white"
              style={{ backgroundColor: catConfig.color }}
            >
              {catConfig.label}
            </span>
          </div>
          <p className="font-medium text-gray-900">{milestone.name}</p>
          {achieved && milestone.achievedDate && (
            <p className="text-sm text-yellow-600">
              Achieved: {new Date(milestone.achievedDate).toLocaleDateString()}
            </p>
          )}
          {milestone.notes && (
            <p className="text-sm text-gray-500 mt-1">{milestone.notes}</p>
          )}
        </div>
        {!achieved && onMarkAchieved && (
          <Button size="sm" onClick={onMarkAchieved}>
            <Check className="w-4 h-4" />
          </Button>
        )}
        {achieved && <Star className="w-5 h-5 text-yellow-500" />}
      </div>
    </Card>
  );
}
