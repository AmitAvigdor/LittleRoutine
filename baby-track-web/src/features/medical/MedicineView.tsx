import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createMedicine, subscribeToMedicines, createMedicineLog, subscribeToMedicineLogs, updateMedicine } from '@/lib/firestore';
import type { Medicine, MedicineLog } from '@/types';
import { MedicationFrequency, MEDICATION_FREQUENCY_CONFIG } from '@/types/enums';
import { Pill, Plus, X, Clock, Check, History } from 'lucide-react';
import { clsx } from 'clsx';

export function MedicineView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('asNeeded');
  const [hoursInterval, setHoursInterval] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribe = subscribeToMedicines(selectedBaby.id, (data) => {
      setMedicines(data);
    });

    return () => unsubscribe();
  }, [selectedBaby]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby || !name.trim()) return;

    setLoading(true);
    try {
      await createMedicine(selectedBaby.id, user.uid, {
        name: name.trim(),
        dosage: dosage || '',
        frequency,
        hoursInterval: hoursInterval ? parseInt(hoursInterval) : null,
        instructions: instructions || null,
      });

      setName('');
      setDosage('');
      setFrequency('asNeeded');
      setHoursInterval('');
      setInstructions('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding medicine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGiveMedicine = async (medicine: Medicine) => {
    if (!user || !selectedBaby) return;

    try {
      await createMedicineLog(medicine.id, selectedBaby.id, user.uid, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging medicine:', error);
    }
  };

  const handleToggleActive = async (medicine: Medicine) => {
    try {
      await updateMedicine(medicine.id, { isActive: !medicine.isActive });
    } catch (error) {
      console.error('Error toggling medicine:', error);
    }
  };

  const activeMedicines = medicines.filter(m => m.isActive);
  const inactiveMedicines = medicines.filter(m => !m.isActive);

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
        title="Medicine"
        showBabySwitcher={false}
        rightAction={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Add Form */}
        {showForm && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Add Medicine</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Medicine Name"
                placeholder="e.g., Tylenol, Vitamin D"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Dosage"
                placeholder="e.g., 5ml, 1 dropper"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(MEDICATION_FREQUENCY_CONFIG) as MedicationFrequency[]).map((freq) => {
                    const config = MEDICATION_FREQUENCY_CONFIG[freq];
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setFrequency(freq)}
                        className={clsx(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          frequency === freq
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {frequency === 'everyHours' && (
                <Input
                  type="number"
                  label="Hours Interval"
                  placeholder="e.g., 4, 6, 8"
                  value={hoursInterval}
                  onChange={(e) => setHoursInterval(e.target.value)}
                />
              )}

              <Input
                label="Instructions (optional)"
                placeholder="Special instructions..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />

              <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
                {loading ? 'Saving...' : 'Add Medicine'}
              </Button>
            </form>
          </Card>
        )}

        {/* Medicine Detail */}
        {selectedMedicine && (
          <MedicineDetail
            medicine={selectedMedicine}
            onClose={() => setSelectedMedicine(null)}
            onGive={() => handleGiveMedicine(selectedMedicine)}
          />
        )}

        {/* Active Medicines */}
        {activeMedicines.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Active ({activeMedicines.length})</h3>
            <div className="space-y-2">
              {activeMedicines.map((medicine) => (
                <MedicineCard
                  key={medicine.id}
                  medicine={medicine}
                  onGive={() => handleGiveMedicine(medicine)}
                  onToggleActive={() => handleToggleActive(medicine)}
                  onSelect={() => setSelectedMedicine(medicine)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive Medicines */}
        {inactiveMedicines.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-500 mb-2">Inactive ({inactiveMedicines.length})</h3>
            <div className="space-y-2">
              {inactiveMedicines.map((medicine) => (
                <MedicineCard
                  key={medicine.id}
                  medicine={medicine}
                  onToggleActive={() => handleToggleActive(medicine)}
                  onSelect={() => setSelectedMedicine(medicine)}
                  inactive
                />
              ))}
            </div>
          </div>
        )}

        {medicines.length === 0 && !showForm && (
          <Card className="text-center py-8">
            <Pill className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No medicines added</p>
            <p className="text-sm text-gray-400">Tap + to add one</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function MedicineCard({
  medicine,
  onGive,
  onToggleActive,
  onSelect,
  inactive,
}: {
  medicine: Medicine;
  onGive?: () => void;
  onToggleActive: () => void;
  onSelect: () => void;
  inactive?: boolean;
}) {
  const freqConfig = MEDICATION_FREQUENCY_CONFIG[medicine.frequency];

  return (
    <Card className={clsx('py-3', inactive && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <div className="flex-1" onClick={onSelect}>
          <p className="font-medium text-gray-900">{medicine.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {medicine.dosage && (
              <span className="text-sm text-gray-500">{medicine.dosage}</span>
            )}
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
              {freqConfig.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!inactive && onGive && (
            <Button size="sm" onClick={onGive}>
              <Check className="w-4 h-4 mr-1" />
              Give
            </Button>
          )}
          <button
            onClick={onToggleActive}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            {inactive ? 'Activate' : 'Deactivate'}
          </button>
        </div>
      </div>
    </Card>
  );
}

function MedicineDetail({
  medicine,
  onClose,
  onGive,
}: {
  medicine: Medicine;
  onClose: () => void;
  onGive: () => void;
}) {
  const [logs, setLogs] = useState<MedicineLog[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToMedicineLogs(medicine.id, (data) => {
      setLogs(data);
    });

    return () => unsubscribe();
  }, [medicine.id]);

  const freqConfig = MEDICATION_FREQUENCY_CONFIG[medicine.frequency];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{medicine.name}</h3>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {medicine.dosage && (
          <div className="flex justify-between">
            <span className="text-gray-500">Dosage</span>
            <span className="font-medium">{medicine.dosage}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Frequency</span>
          <span className="font-medium">{freqConfig.label}</span>
        </div>
        {medicine.instructions && (
          <div>
            <span className="text-gray-500">Instructions</span>
            <p className="text-sm mt-1">{medicine.instructions}</p>
          </div>
        )}
      </div>

      <Button className="w-full mb-4" onClick={onGive}>
        <Check className="w-4 h-4 mr-2" />
        Give Now
      </Button>

      <div>
        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
          <History className="w-4 h-4" />
          History
        </h4>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">No doses logged yet</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex justify-between text-sm py-1 border-b border-gray-100">
                <span className="text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                {log.givenBy && <span>{log.givenBy}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
