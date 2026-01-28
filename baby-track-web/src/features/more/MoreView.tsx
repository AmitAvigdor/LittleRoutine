import { useNavigate } from 'react-router-dom';
import { Header, NoBabiesHeader } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import { BABY_COLOR_CONFIG, calculateBabyAge } from '@/types';
import {
  TrendingUp,
  Apple,
  Syringe,
  Pill,
  SmilePlus,
  Stethoscope,
  Star,
  Milk,
  Droplet,
  Settings,
  FileText,
  LogOut,
  ChevronRight,
  Users,
  Edit,
  BarChart2,
  Gamepad2,
  Footprints,
} from 'lucide-react';

const features = [
  { icon: BarChart2, label: 'Stats', path: '/stats', color: '#9c27b0', emoji: '📊' },
  { icon: Gamepad2, label: 'Play', path: '/more/play', color: '#ff9800', emoji: '🎮' },
  { icon: Footprints, label: 'Walks', path: '/more/walks', color: '#8bc34a', emoji: '🚶' },
  { icon: Droplet, label: 'Pump', path: '/more/pump', color: '#2196f3', emoji: '🍼' },
  { icon: Milk, label: 'Milk Stash', path: '/more/milk-stash', color: '#3f51b5', emoji: '🥛' },
  { icon: TrendingUp, label: 'Growth', path: '/more/growth', color: '#ff9800', emoji: '📈' },
  { icon: Apple, label: 'Solids', path: '/more/solid-foods', color: '#4caf50', emoji: '🍎' },
  { icon: Syringe, label: 'Vaccines', path: '/more/vaccinations', color: '#03a9f4', emoji: '💉' },
  { icon: Pill, label: 'Medicine', path: '/more/medicine', color: '#9c27b0', emoji: '💊' },
  { icon: SmilePlus, label: 'Teething', path: '/more/teething', color: '#e91e63', emoji: '🦷' },
  { icon: Stethoscope, label: 'Doctor', path: '/more/pediatrician', color: '#00bcd4', emoji: '👨‍⚕️' },
  { icon: Star, label: 'Milestones', path: '/more/milestones', color: '#ffc107', emoji: '⭐' },
];

export function MoreView() {
  const navigate = useNavigate();
  const { selectedBaby, babies } = useAppStore();
  const { logout } = useAuth();

  if (babies.length === 0) {
    return <NoBabiesHeader />;
  }

  const babyColor = selectedBaby?.color
    ? BABY_COLOR_CONFIG[selectedBaby.color]?.hex
    : '#9c27b0';

  const babyAge = selectedBaby?.birthDate
    ? calculateBabyAge(selectedBaby.birthDate)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header title="More" showBabySwitcher={false} />

      <div className="px-4 py-4 space-y-5">
        {/* Current Baby Card */}
        {selectedBaby && (
          <Card
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${babyColor}15 0%, ${babyColor}05 100%)`,
              borderColor: `${babyColor}30`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-18 h-18 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white/50"
                style={{ backgroundColor: babyColor }}
              >
                {selectedBaby.photoUrl ? (
                  <img
                    src={selectedBaby.photoUrl}
                    alt={selectedBaby.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">👶</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{selectedBaby.name}</h3>
                {babyAge && (
                  <p className="text-sm text-gray-600 mt-0.5">{babyAge.text}</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/more/babies/${selectedBaby.id}/edit`)}
                className="p-3 rounded-xl hover:bg-white/50 transition-colors"
              >
                <Edit className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <button
              onClick={() => navigate('/more/babies')}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 border-t border-gray-200/50 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Users className="w-4 h-4" />
              Manage All Babies
            </button>
          </Card>
        )}

        {/* Features Grid */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-base">🧰</span>
            <h3 className="text-sm font-bold text-gray-700">Features</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {features.map(({ icon: Icon, label, path, color, emoji }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:scale-105 transition-all duration-200 active:scale-95"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                  }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] text-center text-gray-700 font-semibold leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings & Data */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-base">⚙️</span>
            <h3 className="text-sm font-bold text-gray-700">Settings</h3>
          </div>
          <Card padding="none">
            <button
              onClick={() => navigate('/more/settings')}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <span className="flex-1 text-left font-semibold text-gray-900">Settings</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <div className="border-t border-gray-100 mx-4" />

            <button
              onClick={() => navigate('/more/export')}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <span className="flex-1 text-left font-semibold text-gray-900">Export Data</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <div className="border-t border-gray-100 mx-4" />

            <button
              onClick={logout}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-red-50 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center shadow-sm">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <span className="flex-1 text-left font-semibold text-red-600">Sign Out</span>
            </button>
          </Card>
        </div>

        {/* Version info */}
        <p className="text-xs text-center text-gray-400 pb-4">
          LittleRoutine v1.0.0 • Made with ❤️
        </p>
      </div>
    </div>
  );
}
