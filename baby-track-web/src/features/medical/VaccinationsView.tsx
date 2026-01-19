import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createVaccination, subscribeToVaccinations, markVaccinationAdministered, deleteDocument } from '@/lib/firestore';
import type { Vaccination } from '@/types';
import { Syringe, Plus, X, Check, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

export function VaccinationsView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribe = subscribeToVaccinations(selectedBaby.id, (data) => {
      setVaccinations(data);
    });

    return () => unsubscribe();
  }, [selectedBaby]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby || !name.trim() || !scheduledDate) return;

    setLoading(true);
    try {
      await createVaccination(selectedBaby.id, user.uid, {
        name: name.trim(),
        scheduledDate,
        notes: notes || null,
      });

      setName('');
      setScheduledDate('');
      setNotes('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding vaccination:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAdministered = async (vaccination: Vaccination) => {
    const date = new Date().toISOString().split('T')[0];
    try {
      await markVaccinationAdministered(vaccination.id, date);
    } catch (error) {
      console.error('Error marking vaccination:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vaccination?')) return;
    try {
      await deleteDocument('vaccinations', id);
    } catch (error) {
      console.error('Error deleting vaccination:', error);
    }
  };

  const getStatus = (vaccination: Vaccination) => {
    if (vaccination.administeredDate) return 'completed';
    const scheduled = new Date(vaccination.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scheduled < today) return 'overdue';
    return 'upcoming';
  };

  const overdue = vaccinations.filter(v => getStatus(v) === 'overdue');
  const upcoming = vaccinations.filter(v => getStatus(v) === 'upcoming');
  const completed = vaccinations.filter(v => getStatus(v) === 'completed');

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
        title="Vaccinations"
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
              <h3 className="font-semibold text-gray-900">Schedule Vaccination</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Vaccine Name"
                placeholder="e.g., DTaP, MMR, Polio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                type="date"
                label="Scheduled Date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />

              <Input
                label="Notes (optional)"
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
                {loading ? 'Saving...' : 'Schedule'}
              </Button>
            </form>
          </Card>
        )}

        {/* Overdue */}
        {overdue.length > 0 && (
          <div>
            <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Overdue ({overdue.length})
            </h3>
            <div className="space-y-2">
              {overdue.map((v) => (
                <VaccinationCard
                  key={v.id}
                  vaccination={v}
                  status="overdue"
                  onMarkAdministered={() => handleMarkAdministered(v)}
                  onDelete={() => handleDelete(v.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Upcoming ({upcoming.length})
            </h3>
            <div className="space-y-2">
              {upcoming.map((v) => (
                <VaccinationCard
                  key={v.id}
                  vaccination={v}
                  status="upcoming"
                  onMarkAdministered={() => handleMarkAdministered(v)}
                  onDelete={() => handleDelete(v.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Completed ({completed.length})
            </h3>
            <div className="space-y-2">
              {completed.map((v) => (
                <VaccinationCard
                  key={v.id}
                  vaccination={v}
                  status="completed"
                  onDelete={() => handleDelete(v.id)}
                />
              ))}
            </div>
          </div>
        )}

        {vaccinations.length === 0 && !showForm && (
          <Card className="text-center py-8">
            <Syringe className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No vaccinations scheduled</p>
            <p className="text-sm text-gray-400">Tap + to schedule one</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function VaccinationCard({
  vaccination,
  status,
  onMarkAdministered,
  onDelete,
}: {
  vaccination: Vaccination;
  status: 'overdue' | 'upcoming' | 'completed';
  onMarkAdministered?: () => void;
  onDelete: () => void;
}) {
  const statusConfig = {
    overdue: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
    upcoming: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
    completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
  };

  const config = statusConfig[status];

  return (
    <Card className={clsx('py-3', config.bg, 'border', config.border)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{vaccination.name}</p>
          <p className={clsx('text-sm', config.text)}>
            {status === 'completed' && vaccination.administeredDate
              ? `Given: ${new Date(vaccination.administeredDate).toLocaleDateString()}`
              : `Scheduled: ${new Date(vaccination.scheduledDate).toLocaleDateString()}`}
          </p>
          {vaccination.notes && (
            <p className="text-xs text-gray-500 mt-1">{vaccination.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status !== 'completed' && onMarkAdministered && (
            <Button size="sm" onClick={onMarkAdministered}>
              <Check className="w-4 h-4" />
            </Button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
