import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createBaby, updateBaby, deleteBaby, getBaby } from '@/lib/firestore';
import { uploadBabyPhoto } from '@/lib/storage';
import { BabyColor, BABY_COLOR_CONFIG } from '@/types';
import { clsx } from 'clsx';
import { Camera, Trash2 } from 'lucide-react';

export function BabyForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { babies } = useAppStore();

  const isEditing = !!id;

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [color, setColor] = useState<BabyColor>('purple');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Load existing baby data
  useEffect(() => {
    if (id) {
      const baby = babies.find((b) => b.id === id);
      if (baby) {
        setName(baby.name);
        setBirthDate(baby.birthDate?.split('T')[0] || '');
        setColor(baby.color);
        setPhotoUrl(baby.photoUrl);
      }
    }
  }, [id, babies]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      let finalPhotoUrl = photoUrl;

      // Upload photo if new file selected
      if (photoFile) {
        finalPhotoUrl = await uploadBabyPhoto(user.uid, id || 'new', photoFile);
      }

      if (isEditing && id) {
        await updateBaby(id, {
          name: name.trim(),
          birthDate: birthDate || null,
          color,
          photoUrl: finalPhotoUrl,
        });
      } else {
        await createBaby(user.uid, {
          name: name.trim(),
          birthDate: birthDate || null,
          color,
          photoUrl: finalPhotoUrl,
        });
      }

      navigate('/more/babies');
    } catch (error) {
      console.error('Error saving baby:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setLoading(true);
    try {
      await deleteBaby(id);
      navigate('/more/babies');
    } catch (error) {
      console.error('Error deleting baby:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedColor = BABY_COLOR_CONFIG[color]?.hex || '#9c27b0';

  return (
    <div>
      <Header
        title={isEditing ? 'Edit Baby' : 'Add Baby'}
        showBabySwitcher={false}
      />

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Photo */}
        <Card className="flex flex-col items-center py-6">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold relative overflow-hidden"
              style={{ backgroundColor: selectedColor }}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Baby"
                  className="w-full h-full object-cover"
                />
              ) : (
                name.charAt(0).toUpperCase() || '?'
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
          </label>
          <p className="text-sm text-gray-500 mt-2">Tap to add photo</p>
        </Card>

        {/* Name */}
        <Input
          label="Baby's Name"
          placeholder="Enter name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Birth Date */}
        <Input
          type="date"
          label="Birth Date (optional)"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Theme Color
          </label>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(BABY_COLOR_CONFIG) as BabyColor[]).map((colorKey) => {
              const config = BABY_COLOR_CONFIG[colorKey];
              const isSelected = color === colorKey;

              return (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => setColor(colorKey)}
                  className={clsx(
                    'w-12 h-12 rounded-full transition-all duration-200',
                    isSelected ? 'ring-4 ring-offset-2 scale-110' : 'hover:scale-105'
                  )}
                  style={{
                    backgroundColor: config.hex,
                    '--tw-ring-color': config.hex,
                  } as React.CSSProperties}
                  title={config.label}
                />
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
          {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Baby'}
        </Button>

        {/* Delete */}
        {isEditing && (
          <div className="pt-4 border-t border-gray-200">
            {!deleteConfirm ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-red-600 hover:bg-red-50"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Baby
              </Button>
            ) : (
              <Card className="bg-red-50 border border-red-200">
                <p className="text-sm text-red-800 mb-3">
                  Are you sure? This will delete all data associated with this baby.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
