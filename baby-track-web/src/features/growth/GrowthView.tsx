import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createGrowthEntry, subscribeToGrowthEntries } from '@/lib/firestore';
import type { GrowthEntry } from '@/types';
import { TrendingUp, Plus, X, Scale, Ruler, Circle } from 'lucide-react';

export function GrowthView() {
  const { user } = useAuth();
  const { selectedBaby, settings } = useAppStore();
  const [entries, setEntries] = useState<GrowthEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [headCircumference, setHeadCircumference] = useState('');
  const [notes, setNotes] = useState('');

  const weightUnit = settings?.preferredWeightUnit || 'lbs';
  const lengthUnit = settings?.preferredLengthUnit || 'in';

  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribe = subscribeToGrowthEntries(selectedBaby.id, (data) => {
      setEntries(data);
    });

    return () => unsubscribe();
  }, [selectedBaby]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby) return;

    setLoading(true);
    try {
      await createGrowthEntry(selectedBaby.id, user.uid, {
        date,
        weight: weight ? parseFloat(weight) : null,
        weightUnit,
        height: height ? parseFloat(height) : null,
        heightUnit: lengthUnit,
        headCircumference: headCircumference ? parseFloat(headCircumference) : null,
        headCircumferenceUnit: lengthUnit,
        notes: notes || null,
      });

      // Reset form
      setWeight('');
      setHeight('');
      setHeadCircumference('');
      setNotes('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding growth entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const latestEntry = entries[0];

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
        title="Growth"
        showBabySwitcher={false}
        rightAction={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Latest Measurements */}
        {latestEntry && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Latest Measurements</h3>
            <div className="grid grid-cols-3 gap-4">
              {latestEntry.weight && (
                <div className="text-center">
                  <Scale className="w-6 h-6 mx-auto text-orange-500 mb-1" />
                  <p className="text-lg font-bold text-gray-900">
                    {latestEntry.weight}
                  </p>
                  <p className="text-xs text-gray-500">{latestEntry.weightUnit}</p>
                </div>
              )}
              {latestEntry.height && (
                <div className="text-center">
                  <Ruler className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold text-gray-900">
                    {latestEntry.height}
                  </p>
                  <p className="text-xs text-gray-500">{latestEntry.heightUnit}</p>
                </div>
              )}
              {latestEntry.headCircumference && (
                <div className="text-center">
                  <Circle className="w-6 h-6 mx-auto text-purple-500 mb-1" />
                  <p className="text-lg font-bold text-gray-900">
                    {latestEntry.headCircumference}
                  </p>
                  <p className="text-xs text-gray-500">{latestEntry.headCircumferenceUnit}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              {new Date(latestEntry.date).toLocaleDateString()}
            </p>
          </Card>
        )}

        {/* Add Entry Form */}
        {showForm && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">New Measurement</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="date"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                type="number"
                step="0.1"
                label={`Weight (${weightUnit})`}
                placeholder="Enter weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />

              <Input
                type="number"
                step="0.1"
                label={`Height (${lengthUnit})`}
                placeholder="Enter height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />

              <Input
                type="number"
                step="0.1"
                label={`Head Circumference (${lengthUnit})`}
                placeholder="Enter measurement"
                value={headCircumference}
                onChange={(e) => setHeadCircumference(e.target.value)}
              />

              <Input
                label="Notes (optional)"
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Save Measurement'}
              </Button>
            </form>
          </Card>
        )}

        {/* History */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">History</h3>
          {entries.length === 0 ? (
            <Card className="text-center py-8">
              <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No growth entries yet</p>
              <p className="text-sm text-gray-400">Tap + to add your first measurement</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <Card key={entry.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm text-gray-500">
                        {entry.weight && (
                          <span>{entry.weight} {entry.weightUnit}</span>
                        )}
                        {entry.height && (
                          <span>{entry.height} {entry.heightUnit}</span>
                        )}
                        {entry.headCircumference && (
                          <span>HC: {entry.headCircumference} {entry.headCircumferenceUnit}</span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-gray-400 mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
