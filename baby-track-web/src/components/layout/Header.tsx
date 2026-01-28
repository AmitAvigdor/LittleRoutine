import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronDown, Plus, Baby as BabyIcon, Check, UserPlus } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/features/auth/AuthContext';
import { joinBabyByShareCode } from '@/lib/firestore';
import { BABY_COLOR_CONFIG } from '@/types';

interface HeaderProps {
  title: string;
  showBabySwitcher?: boolean;
  rightAction?: React.ReactNode;
  gradient?: boolean;
  subtitle?: string;
}

export function Header({
  title,
  showBabySwitcher = true,
  rightAction,
  gradient = false,
  subtitle,
}: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { selectedBaby, babies, setSelectedBabyId } = useAppStore();
  const navigate = useNavigate();

  const handleSelectBaby = (babyId: string) => {
    setSelectedBabyId(babyId);
    setShowDropdown(false);
  };

  const babyColor = selectedBaby?.color
    ? BABY_COLOR_CONFIG[selectedBaby.color]?.hex
    : '#9c27b0';

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 safe-top',
        gradient ? 'gradient-primary text-white' : 'bg-white border-b border-gray-100'
      )}
    >
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Title and Baby Switcher */}
        <div className="flex items-center gap-3">
          <h1
            className={clsx(
              'text-xl font-bold',
              gradient ? 'text-white' : 'text-gray-900'
            )}
          >
            {title}
          </h1>

          {showBabySwitcher && selectedBaby && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
                  'transition-all duration-200',
                  gradient
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: babyColor }}
                >
                  {selectedBaby.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[80px] truncate">{selectedBaby.name}</span>
                {subtitle && (
                  <span className={clsx(
                    'text-xs',
                    gradient ? 'text-white/70' : 'text-gray-400'
                  )}>
                    ({subtitle})
                  </span>
                )}
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    {babies.map((baby) => {
                      const color = BABY_COLOR_CONFIG[baby.color]?.hex || '#9c27b0';
                      const isSelected = baby.id === selectedBaby.id;

                      return (
                        <button
                          key={baby.id}
                          onClick={() => handleSelectBaby(baby.id)}
                          className={clsx(
                            'w-full flex items-center gap-3 px-3 py-2 text-left',
                            'hover:bg-gray-50 transition-colors duration-200',
                            isSelected && 'bg-primary-50'
                          )}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: color }}
                          >
                            {baby.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="flex-1 font-medium text-gray-900">
                            {baby.name}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </button>
                      );
                    })}

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/more/babies/new');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-gray-600">Add Baby</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Action */}
        {rightAction}
      </div>
    </header>
  );
}

// Empty state when no babies
export function NoBabiesHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSelectedBabyId } = useAppStore();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

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
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
            <BabyIcon className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Welcome to LittleRoutine</h2>
          <p className="text-sm text-gray-500 mt-1">Add your first baby to get started</p>
          <button
            onClick={() => navigate('/more/babies/new')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Baby
          </button>

          {/* Join a shared baby option */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            {!showJoinForm ? (
              <button
                onClick={() => setShowJoinForm(true)}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <UserPlus className="w-4 h-4" />
                <span>Or join a shared baby</span>
              </button>
            ) : (
              <div className="max-w-xs mx-auto space-y-3">
                <p className="text-sm text-gray-600">Enter the share code from your partner</p>
                <input
                  type="text"
                  placeholder="Enter 6-letter code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full px-4 py-2 text-center font-mono text-lg tracking-widest border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowJoinForm(false);
                      setJoinCode('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinBaby}
                    disabled={joinCode.length !== 6 || joining}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joining ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
