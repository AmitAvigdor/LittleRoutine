import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import { joinBabyByShareCode } from '@/lib/firestore';
import { BABY_COLOR_CONFIG, calculateBabyAge } from '@/types';
import { Plus, Edit, Check, UserPlus, Users } from 'lucide-react';

export function BabyManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { babies, selectedBaby, setSelectedBabyId } = useAppStore();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleSelectBaby = (babyId: string) => {
    setSelectedBabyId(babyId);
  };

  const handleJoinBaby = async () => {
    if (!user || !joinCode.trim()) return;

    setJoining(true);
    try {
      const baby = await joinBabyByShareCode(user.uid, joinCode);
      setShowJoinForm(false);
      setJoinCode('');
      setSelectedBabyId(baby.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join';
    } finally {
      setJoining(false);
    }
  };

  return (
    <div>
      <Header
        title="Babies"
        showBabySwitcher={false}
        rightAction={
          <Button
            size="sm"
            onClick={() => navigate('/more/babies/new')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {babies.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gray-500 mb-4">No babies added yet</p>
            <Button onClick={() => navigate('/more/babies/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Baby
            </Button>
          </Card>
        ) : (
          babies.map((baby) => {
            const color = BABY_COLOR_CONFIG[baby.color]?.hex || '#9c27b0';
            const isSelected = baby.id === selectedBaby?.id;
            const age = baby.birthDate ? calculateBabyAge(baby.birthDate) : null;
            const isShared = baby.userId !== user?.uid;

            return (
              <Card
                key={baby.id}
                className="relative overflow-hidden"
                onClick={() => handleSelectBaby(baby.id)}
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: color }}
                />

                <div className="flex items-center gap-4 pl-2">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 relative"
                    style={{ backgroundColor: color }}
                  >
                    {baby.photoUrl ? (
                      <img
                        src={baby.photoUrl}
                        alt={baby.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      baby.name.charAt(0).toUpperCase()
                    )}
                    {isShared && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Users className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {baby.name}
                    </h3>
                    {age && (
                      <p className="text-sm text-gray-500">{age.text}</p>
                    )}
                    {isShared && (
                      <p className="text-xs text-blue-600">Shared with you</p>
                    )}
                  </div>

                  {isSelected && (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/more/babies/${baby.id}/edit`);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Edit className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </Card>
            );
          })
        )}

        {/* Join a Baby with Share Code */}
        <Card className="mt-4">
          {!showJoinForm ? (
            <button
              onClick={() => setShowJoinForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 hover:text-gray-900"
            >
              <UserPlus className="w-5 h-5" />
              <span>Join a shared baby</span>
            </button>
          ) : (
            <div className="space-y-3">
              <CardHeader
                title="Join a Baby"
                subtitle="Enter the share code from your partner"
              />
              <Input
                placeholder="Enter 6-letter code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center font-mono text-lg tracking-widest"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowJoinForm(false);
                    setJoinCode('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleJoinBaby}
                  disabled={joinCode.length !== 6 || joining}
                >
                  {joining ? 'Joining...' : 'Join'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
