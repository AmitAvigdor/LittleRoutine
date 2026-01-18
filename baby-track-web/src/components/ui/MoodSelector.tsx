import { clsx } from 'clsx';
import {
  Smile,
  Frown,
  Leaf,
  Droplet,
  Moon,
  Zap,
  BatteryLow,
  Activity,
  Heart,
  CloudRain,
} from 'lucide-react';
import {
  BabyMood,
  MomMood,
  BABY_MOOD_CONFIG,
  MOM_MOOD_CONFIG,
} from '@/types';

const BABY_MOOD_ICONS: Record<BabyMood, React.ReactNode> = {
  happy: <Smile className="w-5 h-5" />,
  fussy: <Frown className="w-5 h-5" />,
  calm: <Leaf className="w-5 h-5" />,
  crying: <Droplet className="w-5 h-5" />,
  sleepy: <Moon className="w-5 h-5" />,
};

const MOM_MOOD_ICONS: Record<MomMood, React.ReactNode> = {
  energized: <Zap className="w-5 h-5" />,
  tired: <BatteryLow className="w-5 h-5" />,
  stressed: <Activity className="w-5 h-5" />,
  happy: <Heart className="w-5 h-5" />,
  overwhelmed: <CloudRain className="w-5 h-5" />,
};

interface BabyMoodSelectorProps {
  value: BabyMood | null;
  onChange: (mood: BabyMood | null) => void;
  label?: string;
}

export function BabyMoodSelector({ value, onChange, label }: BabyMoodSelectorProps) {
  const moods = Object.keys(BABY_MOOD_CONFIG) as BabyMood[];

  return (
    <div>
      {label && (
        <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {moods.map((mood) => {
          const config = BABY_MOOD_CONFIG[mood];
          const isSelected = value === mood;

          return (
            <button
              key={mood}
              type="button"
              onClick={() => onChange(isSelected ? null : mood)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium',
                'border-2 transition-all duration-200',
                isSelected
                  ? 'border-transparent'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
              style={isSelected ? {
                backgroundColor: `${config.color}20`,
                color: config.color,
                borderColor: config.color,
              } : undefined}
            >
              <span style={isSelected ? { color: config.color } : { color: '#9ca3af' }}>
                {BABY_MOOD_ICONS[mood]}
              </span>
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MomMoodSelectorProps {
  value: MomMood | null;
  onChange: (mood: MomMood | null) => void;
  label?: string;
}

export function MomMoodSelector({ value, onChange, label }: MomMoodSelectorProps) {
  const moods = Object.keys(MOM_MOOD_CONFIG) as MomMood[];

  return (
    <div>
      {label && (
        <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {moods.map((mood) => {
          const config = MOM_MOOD_CONFIG[mood];
          const isSelected = value === mood;

          return (
            <button
              key={mood}
              type="button"
              onClick={() => onChange(isSelected ? null : mood)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium',
                'border-2 transition-all duration-200',
                isSelected
                  ? 'border-transparent'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
              style={isSelected ? {
                backgroundColor: `${config.color}20`,
                color: config.color,
                borderColor: config.color,
              } : undefined}
            >
              <span style={isSelected ? { color: config.color } : { color: '#9ca3af' }}>
                {MOM_MOOD_ICONS[mood]}
              </span>
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Combined mood indicator for display
interface MoodIndicatorProps {
  babyMood?: BabyMood | null;
  momMood?: MomMood | null;
  size?: 'sm' | 'md';
}

export function MoodIndicator({ babyMood, momMood, size = 'md' }: MoodIndicatorProps) {
  if (!babyMood && !momMood) return null;

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-2">
      {babyMood && (
        <span
          className={clsx(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            size === 'sm' && 'px-1.5 py-0.5'
          )}
          style={{
            backgroundColor: `${BABY_MOOD_CONFIG[babyMood].color}20`,
            color: BABY_MOOD_CONFIG[babyMood].color,
          }}
        >
          <span className={iconSize}>
            {BABY_MOOD_ICONS[babyMood]}
          </span>
          {size === 'md' && BABY_MOOD_CONFIG[babyMood].label}
        </span>
      )}
      {momMood && (
        <span
          className={clsx(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            size === 'sm' && 'px-1.5 py-0.5'
          )}
          style={{
            backgroundColor: `${MOM_MOOD_CONFIG[momMood].color}20`,
            color: MOM_MOOD_CONFIG[momMood].color,
          }}
        >
          <span className={iconSize}>
            {MOM_MOOD_ICONS[momMood]}
          </span>
          {size === 'md' && MOM_MOOD_CONFIG[momMood].label}
        </span>
      )}
    </div>
  );
}
