import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { createBaby, updateBaby, deleteBaby, generateShareCode, regenerateShareCode, removeSharedUser } from '@/lib/firestore';
import { uploadBabyPhoto } from '@/lib/storage';
import { BabyColor, BABY_COLOR_CONFIG } from '@/types';
import { clsx } from 'clsx';
import { toast } from '@/stores/toastStore';
import { Camera, Trash2, Share2, Copy, RefreshCw, X } from 'lucide-react';

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
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [isOwner, setIsOwner] = useState(true);

  // Load existing baby data
  useEffect(() => {
    if (id) {
      const baby = babies.find((b) => b.id === id);
      if (baby) {
        setName(baby.name);
        setBirthDate(baby.birthDate?.split('T')[0] || '');
        setColor(baby.color);
        setPhotoUrl(baby.photoUrl);
        setShareCode(baby.shareCode || null);
        setSharedWith(baby.sharedWith || []);
        setIsOwner(baby.userId === user?.uid);
      }
    }
  }, [id, babies, user?.uid]);

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

  const handleGenerateShareCode = async () => {
    if (!id) return;

    setGeneratingCode(true);
    try {
      const code = await generateShareCode(id);
      setShareCode(code);
      toast.success('Share code generated');
    } catch (error) {
      console.error('Error generating share code:', error);
      toast.error('Failed to generate share code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleRegenerateShareCode = async () => {
    if (!id) return;

    setGeneratingCode(true);
    try {
      const code = await regenerateShareCode(id);
      setShareCode(code);
      toast.success('Share code regenerated');
    } catch (error) {
      console.error('Error regenerating share code:', error);
      toast.error('Failed to regenerate share code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyShareCode = async () => {
    if (!shareCode) return;

    try {
      await navigator.clipboard.writeText(shareCode);
      toast.success('Code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleRemoveSharedUser = async (userIdToRemove: string) => {
    if (!id || !user) return;

    try {
      await removeSharedUser(id, user.uid, userIdToRemove);
      setSharedWith(prev => prev.filter(uid => uid !== userIdToRemove));
      toast.success('User removed');
    } catch (error) {
      console.error('Error removing shared user:', error);
      toast.error('Failed to remove user');
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

        {/* Partner Sharing - only show when editing and user is owner */}
        {isEditing && isOwner && (
          <Card>
            <CardHeader
              title="Partner Sharing"
              subtitle="Share access with your partner"
            />
            <div className="space-y-4">
              {!shareCode ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGenerateShareCode}
                  disabled={generatingCode}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {generatingCode ? 'Generating...' : 'Generate Share Code'}
                </Button>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">Share this code with your partner:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-mono font-bold tracking-widest flex-1">
                        {shareCode}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyShareCode}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRegenerateShareCode}
                        disabled={generatingCode}
                      >
                        <RefreshCw className={clsx('w-4 h-4', generatingCode && 'animate-spin')} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Your partner can enter this code in their app to access {name}'s data.
                  </p>
                </>
              )}

              {sharedWith.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Shared with {sharedWith.length} partner{sharedWith.length > 1 ? 's' : ''}
                  </p>
                  {sharedWith.map((uid, index) => (
                    <div key={uid} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Partner {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSharedUser(uid)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Show shared status for non-owners */}
        {isEditing && !isOwner && (
          <Card className="bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">
              You have shared access to {name}. Only the owner can manage sharing settings.
            </p>
          </Card>
        )}

        {/* Delete */}
        {isEditing && isOwner && (
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
