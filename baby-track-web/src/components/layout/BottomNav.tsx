import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { Home, Droplet, Moon, Leaf, MoreHorizontal } from 'lucide-react';

const navItems = [
  { to: '/home', label: 'Home', icon: Home, color: '#2196f3', emoji: '🏠' },
  { to: '/feed', label: 'Feed', icon: Droplet, color: '#e91e63', emoji: '🍼' },
  { to: '/sleep', label: 'Sleep', icon: Moon, color: '#3f51b5', emoji: '😴' },
  { to: '/diaper', label: 'Diaper', icon: Leaf, color: '#4caf50', emoji: '🧷' },
  { to: '/more', label: 'More', icon: MoreHorizontal, color: '#757575', emoji: '⚙️' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 bottom-nav z-50 shadow-lg shadow-gray-200/50">
      <div className="bottom-nav-inner max-w-lg mx-auto flex items-center justify-around px-2">
        {navItems.map(({ to, label, icon: Icon, color }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex h-full min-w-[56px] flex-col items-center justify-center gap-0.5 px-2.5 transition-all duration-200',
                isActive ? 'text-primary-600' : 'text-gray-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300',
                    isActive && 'shadow-sm'
                  )}
                  style={isActive ? {
                    backgroundColor: `${color}15`,
                  } : undefined}
                >
                  <Icon
                    className={clsx(
                      'w-5 h-5 transition-transform duration-200',
                      isActive && 'scale-110'
                    )}
                    style={isActive ? { color } : undefined}
                  />
                </div>
                <span
                  className={clsx(
                    'text-[10px] leading-none font-semibold transition-colors duration-200',
                    isActive ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
