import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createTeethingEvent, subscribeToTeethingEvents, updateTeethingEvent } from '@/lib/firestore';
import type { TeethingEvent } from '@/types';
import { ToothPosition, TeethingSymptom, TOOTH_POSITION_CONFIG, TEETHING_SYMPTOM_CONFIG } from '@/types/enums';
import { SmilePlus, X } from 'lucide-react';
import { clsx } from 'clsx';

export function TeethingView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const [events, setEvents] = useState<TeethingEvent[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<ToothPosition | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [firstSignsDate, setFirstSignsDate] = useState('');
  const [eruptionDate, setEruptionDate] = useState('');
  const [symptoms, setSymptoms] = useState<TeethingSymptom[]>([]);
  const [remediesUsed, setRemediesUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribe = subscribeToTeethingEvents(selectedBaby.id, (data) => {
      setEvents(data);
    });

    return () => unsubscribe();
  }, [selectedBaby]);

  const getToothEvent = (position: ToothPosition) => {
    return events.find(e => e.toothPosition === position);
  };

  const handleToothClick = (position: ToothPosition) => {
    const existingEvent = getToothEvent(position);
    setSelectedTooth(position);
    setShowForm(true);

    if (existingEvent) {
      setFirstSignsDate(existingEvent.firstSignsDate || '');
      setEruptionDate(existingEvent.eruptionDate || '');
      setSymptoms(existingEvent.symptoms || []);
      setRemediesUsed(existingEvent.remediesUsed || '');
      setNotes(existingEvent.notes || '');
    } else {
      setFirstSignsDate('');
      setEruptionDate('');
      setSymptoms([]);
      setRemediesUsed('');
      setNotes('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby || !selectedTooth) return;

    setLoading(true);
    try {
      const existingEvent = getToothEvent(selectedTooth);

      if (existingEvent) {
        await updateTeethingEvent(existingEvent.id, {
          firstSignsDate: firstSignsDate || null,
          eruptionDate: eruptionDate || null,
          symptoms,
          remediesUsed: remediesUsed || null,
          notes: notes || null,
        });
      } else {
        await createTeethingEvent(selectedBaby.id, user.uid, {
          toothPosition: selectedTooth,
          firstSignsDate: firstSignsDate || null,
          eruptionDate: eruptionDate || null,
          symptoms,
          remediesUsed: remediesUsed || null,
          notes: notes || null,
        });
      }

      setShowForm(false);
      setSelectedTooth(null);
    } catch (error) {
      console.error('Error saving teething event:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (symptom: TeethingSymptom) => {
    setSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const eruptedCount = events.filter(e => e.eruptionDate).length;
  const teethingCount = events.filter(e => e.firstSignsDate && !e.eruptionDate).length;

  if (!selectedBaby) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please select a baby first
      </div>
    );
  }

  return (
    <div>
      <Header title="Teething" showBabySwitcher={false} />

      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="text-center">
            <p className="text-3xl font-bold text-green-500">{eruptedCount}</p>
            <p className="text-sm text-gray-500">Teeth Erupted</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-orange-500">{teethingCount}</p>
            <p className="text-sm text-gray-500">Currently Teething</p>
          </Card>
        </div>

        {/* Tooth Chart */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4 text-center">Tooth Chart</h3>
          <p className="text-xs text-gray-500 text-center mb-4">Tap a tooth to record</p>

          {/* Upper Teeth */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 text-center mb-2">Upper</p>
            <div className="flex justify-center gap-1">
              {['upperRightSecondMolar', 'upperRightFirstMolar', 'upperRightCanine', 'upperRightLateralIncisor', 'upperRightCentralIncisor',
                'upperLeftCentralIncisor', 'upperLeftLateralIncisor', 'upperLeftCanine', 'upperLeftFirstMolar', 'upperLeftSecondMolar'].map((pos) => {
                const event = getToothEvent(pos as ToothPosition);
                const toothInfo = TOOTH_POSITION_CONFIG[pos as ToothPosition];
                return (
                  <ToothButton
                    key={pos}
                    position={pos as ToothPosition}
                    label={toothInfo?.shortName || pos}
                    status={event?.eruptionDate ? 'erupted' : event?.firstSignsDate ? 'teething' : 'none'}
                    onClick={() => handleToothClick(pos as ToothPosition)}
                    selected={selectedTooth === pos}
                  />
                );
              })}
            </div>
          </div>

          {/* Lower Teeth */}
          <div>
            <p className="text-xs text-gray-400 text-center mb-2">Lower</p>
            <div className="flex justify-center gap-1">
              {['lowerRightSecondMolar', 'lowerRightFirstMolar', 'lowerRightCanine', 'lowerRightLateralIncisor', 'lowerRightCentralIncisor',
                'lowerLeftCentralIncisor', 'lowerLeftLateralIncisor', 'lowerLeftCanine', 'lowerLeftFirstMolar', 'lowerLeftSecondMolar'].map((pos) => {
                const event = getToothEvent(pos as ToothPosition);
                const toothInfo = TOOTH_POSITION_CONFIG[pos as ToothPosition];
                return (
                  <ToothButton
                    key={pos}
                    position={pos as ToothPosition}
                    label={toothInfo?.shortName || pos}
                    status={event?.eruptionDate ? 'erupted' : event?.firstSignsDate ? 'teething' : 'none'}
                    onClick={() => handleToothClick(pos as ToothPosition)}
                    selected={selectedTooth === pos}
                  />
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gray-200" />
              <span>Not started</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-orange-400" />
              <span>Teething</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>Erupted</span>
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        {showForm && selectedTooth && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {TOOTH_POSITION_CONFIG[selectedTooth]?.name || selectedTooth}
              </h3>
              <button onClick={() => { setShowForm(false); setSelectedTooth(null); }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="date"
                label="First Signs Date"
                value={firstSignsDate}
                onChange={(e) => setFirstSignsDate(e.target.value)}
              />

              <Input
                type="date"
                label="Eruption Date"
                value={eruptionDate}
                onChange={(e) => setEruptionDate(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symptoms
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TEETHING_SYMPTOM_CONFIG) as TeethingSymptom[]).map((symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-sm transition-colors',
                        symptoms.includes(symptom)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {TEETHING_SYMPTOM_CONFIG[symptom].label}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Remedies Used"
                placeholder="e.g., teething ring, gel"
                value={remediesUsed}
                onChange={(e) => setRemediesUsed(e.target.value)}
              />

              <Input
                label="Notes"
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </Card>
        )}

        {/* Recent Activity */}
        {events.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Recent Activity</h3>
            <div className="space-y-2">
              {events.slice(0, 5).map((event) => {
                const toothInfo = TOOTH_POSITION_CONFIG[event.toothPosition];
                return (
                  <Card key={event.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{toothInfo?.name || event.toothPosition}</p>
                        <p className="text-sm text-gray-500">
                          {event.eruptionDate
                            ? `Erupted: ${new Date(event.eruptionDate).toLocaleDateString()}`
                            : event.firstSignsDate
                              ? `Teething since: ${new Date(event.firstSignsDate).toLocaleDateString()}`
                              : 'Recorded'}
                        </p>
                      </div>
                      <div
                        className={clsx(
                          'w-3 h-3 rounded-full',
                          event.eruptionDate ? 'bg-green-500' : 'bg-orange-400'
                        )}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToothButton({
  position,
  label,
  status,
  onClick,
  selected,
}: {
  position: ToothPosition;
  label: string;
  status: 'none' | 'teething' | 'erupted';
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-7 h-8 rounded text-xs font-medium transition-all',
        status === 'erupted' && 'bg-green-500 text-white',
        status === 'teething' && 'bg-orange-400 text-white',
        status === 'none' && 'bg-gray-200 text-gray-600',
        selected && 'ring-2 ring-primary-500 ring-offset-2'
      )}
      title={label}
    >
      {label.charAt(0)}
    </button>
  );
}
