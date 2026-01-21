import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { Home, Droplet, Moon, Leaf, MoreHorizontal } from 'lucide-react';

const navItems = [
  { to: '/home', label: 'Home', icon: Home, color: '#2196f3' },
  { to: '/feed', label: 'Feed', icon: Droplet, color: '#e91e63' },
  { to: '/sleep', label: 'Sleep', icon: Moon, color: '#3f51b5' },
  { to: '/diaper', label: 'Diaper', icon: Leaf, color: '#4caf50' },
  { to: '/more', label: 'More', icon: MoreHorizontal, color: '#757575' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 bottom-nav z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map(({ to, label, icon: Icon, color }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center py-2 px-4 min-w-[60px] transition-all duration-200',
                isActive ? 'text-primary-600' : 'text-gray-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={clsx(
                    'p-1.5 rounded-xl transition-all duration-200',
                    isActive && 'bg-primary-50'
                  )}
                >
                  <Icon
                    className="w-6 h-6"
                    style={isActive ? { color } : undefined}
                  />
                </div>
                <span
                  className={clsx(
                    'text-xs mt-0.5 font-medium',
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
