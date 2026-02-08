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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-xl border-t border-white/60 bottom-nav z-50 shadow-[0_-12px_30px_rgba(31,27,22,0.12)]">
      <div className="max-w-lg mx-auto flex items-center justify-around px-3 py-1">
        {navItems.map(({ to, label, icon: Icon, color }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center py-2 px-3 min-w-[60px] transition-all duration-200 rounded-2xl',
                'hover:-translate-y-0.5 active:translate-y-0',
                isActive ? 'text-gray-900' : 'text-gray-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={clsx(
                    'p-2.5 rounded-2xl transition-all duration-300',
                    isActive && 'shadow-md'
                  )}
                  style={isActive ? {
                    backgroundColor: `${color}1f`,
                  } : undefined}
                >
                  <Icon
                    className={clsx(
                      'w-6 h-6 transition-transform duration-200',
                      isActive && 'scale-110'
                    )}
                    style={isActive ? { color } : undefined}
                  />
                </div>
                <span
                  className={clsx(
                    'text-[11px] mt-1 font-semibold tracking-wide transition-colors duration-200',
                    isActive ? 'text-gray-900' : 'text-gray-500'
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
