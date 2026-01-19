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
  Settings,
  FileText,
  LogOut,
  ChevronRight,
  Users,
  Edit,
} from 'lucide-react';

const features = [
  { icon: TrendingUp, label: 'Growth Tracking', path: '/more/growth', color: '#ff9800' },
  { icon: Apple, label: 'Solid Foods', path: '/more/solid-foods', color: '#4caf50' },
  { icon: Syringe, label: 'Vaccinations', path: '/more/vaccinations', color: '#2196f3' },
  { icon: Pill, label: 'Medicine', path: '/more/medicine', color: '#9c27b0' },
  { icon: SmilePlus, label: 'Teething', path: '/more/teething', color: '#e91e63' },
  { icon: Stethoscope, label: 'Pediatrician Notes', path: '/more/pediatrician', color: '#00bcd4' },
  { icon: Star, label: 'Milestones', path: '/more/milestones', color: '#ffc107' },
  { icon: Milk, label: 'Milk Stash', path: '/more/milk-stash', color: '#3f51b5' },
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
    <div>
      <Header title="More" showBabySwitcher={false} />

      <div className="px-4 py-4 space-y-4">
        {/* Current Baby Card */}
        {selectedBaby && (
          <Card className="relative overflow-hidden">
            <div
              className="absolute top-0 left-0 w-full h-1"
              style={{ backgroundColor: babyColor }}
            />
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: babyColor }}
              >
                {selectedBaby.photoUrl ? (
                  <img
                    src={selectedBaby.photoUrl}
                    alt={selectedBaby.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  selectedBaby.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{selectedBaby.name}</h3>
                {babyAge && (
                  <p className="text-sm text-gray-500">{babyAge.text}</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/more/babies/${selectedBaby.id}/edit`)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Edit className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <button
              onClick={() => navigate('/more/babies')}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2 border-t border-gray-100 text-sm text-gray-600 hover:text-gray-900"
            >
              <Users className="w-4 h-4" />
              Manage All Babies
            </button>
          </Card>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-3">
          {features.map(({ icon: Icon, label, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <span className="text-xs text-center text-gray-700 font-medium">
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Settings & Data */}
        <Card padding="none">
          <button
            onClick={() => navigate('/more/settings')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Settings</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <div className="border-t border-gray-100" />

          <button
            onClick={() => navigate('/more/export')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Export Data</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <div className="border-t border-gray-100" />

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <span className="flex-1 text-left font-medium text-red-600">Sign Out</span>
          </button>
        </Card>

        {/* Version info */}
        <p className="text-xs text-center text-gray-400">
          LittleRoutine v1.0.0
        </p>
      </div>
    </div>
  );
}
