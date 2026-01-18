import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/stores/appStore';
import { BABY_COLOR_CONFIG, calculateBabyAge } from '@/types';
import { Plus, Edit, Check } from 'lucide-react';

export function BabyManagement() {
  const navigate = useNavigate();
  const { babies, selectedBaby, setSelectedBabyId } = useAppStore();

  const handleSelectBaby = (babyId: string) => {
    setSelectedBabyId(babyId);
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
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
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
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {baby.name}
                    </h3>
                    {age && (
                      <p className="text-sm text-gray-500">{age.text}</p>
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
      </div>
    </div>
  );
}
