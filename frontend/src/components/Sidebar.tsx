import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '@shared/ui';
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  Calendar,
  BarChart3,
  Settings,
  type LucideIcon,
} from '@shared/ui/icons';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Members', path: '/members', icon: Users },
  { label: 'Visitors', path: '/visitors', icon: DoorOpen },
  { label: 'Events', path: '/events', icon: Calendar },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <Logo size="sm" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-sm">
          <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
          <p className="text-gray-500 capitalize">{user?.role}</p>
        </div>
      </div>
    </aside>
  );
}
