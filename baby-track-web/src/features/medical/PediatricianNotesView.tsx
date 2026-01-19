import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createPediatricianNote, subscribeToPediatricianNotes, resolvePediatricianNote, deleteDocument } from '@/lib/firestore';
import type { PediatricianNote } from '@/types';
import { Stethoscope, Plus, X, Check, AlertCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

export function PediatricianNotesView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const [notes, setNotes] = useState<PediatricianNote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [concern, setConcern] = useState('');
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribe = subscribeToPediatricianNotes(selectedBaby.id, (data) => {
      setNotes(data);
    });

    return () => unsubscribe();
  }, [selectedBaby]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBaby || !concern.trim()) return;

    setLoading(true);
    try {
      await createPediatricianNote(selectedBaby.id, user.uid, {
        date,
        concern: concern.trim(),
        notes: noteText || null,
      });

      setConcern('');
      setNoteText('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (noteId: string) => {
    if (!resolution.trim()) return;

    try {
      await resolvePediatricianNote(noteId, resolution.trim());
      setResolvingId(null);
      setResolution('');
    } catch (error) {
      console.error('Error resolving note:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      await deleteDocument('pediatricianNotes', id);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const unresolved = notes.filter(n => !n.isResolved);
  const resolved = notes.filter(n => n.isResolved);

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
        title="Pediatrician Notes"
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
              <h3 className="font-semibold text-gray-900">Add Concern</h3>
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
                label="Concern / Question"
                placeholder="What do you want to ask the doctor?"
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                required
              />

              <Input
                label="Additional Notes"
                placeholder="Any additional details..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />

              <Button type="submit" className="w-full" disabled={loading || !concern.trim()}>
                {loading ? 'Saving...' : 'Add Note'}
              </Button>
            </form>
          </Card>
        )}

        {/* Unresolved */}
        {unresolved.length > 0 && (
          <div>
            <h3 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              To Discuss ({unresolved.length})
            </h3>
            <div className="space-y-2">
              {unresolved.map((note) => (
                <Card key={note.id} className="py-3 bg-orange-50 border border-orange-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{note.concern}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(note.date).toLocaleDateString()}
                      </p>
                      {note.notes && (
                        <p className="text-sm text-gray-600 mt-1">{note.notes}</p>
                      )}

                      {resolvingId === note.id && (
                        <div className="mt-3 space-y-2">
                          <Input
                            placeholder="Enter resolution..."
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleResolve(note.id)}
                              disabled={!resolution.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setResolvingId(null);
                                setResolution('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {resolvingId !== note.id && (
                        <Button size="sm" onClick={() => setResolvingId(note.id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Resolved */}
        {resolved.length > 0 && (
          <div>
            <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Resolved ({resolved.length})
            </h3>
            <div className="space-y-2">
              {resolved.map((note) => (
                <Card key={note.id} className="py-3 bg-green-50 border border-green-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{note.concern}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(note.date).toLocaleDateString()}
                      </p>
                      {note.resolution && (
                        <p className="text-sm text-green-700 mt-2">
                          <span className="font-medium">Resolution:</span> {note.resolution}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {notes.length === 0 && !showForm && (
          <Card className="text-center py-8">
            <Stethoscope className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No notes yet</p>
            <p className="text-sm text-gray-400">Add questions for your pediatrician</p>
          </Card>
        )}
      </div>
    </div>
  );
}
