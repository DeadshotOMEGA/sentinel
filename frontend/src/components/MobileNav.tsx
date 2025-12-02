import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from '@shared/ui/icons';
import { useAuth } from '../hooks/useAuth';
import { sidebarItems } from './pro/nav-items';
import { create } from 'zustand';

interface MobileNavStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const useMobileNav = create<MobileNavStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export default function MobileNav() {
  const { isOpen, open, close } = useMobileNav();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Filter items based on user role (settings is admin-only)
  const filteredItems = sidebarItems.filter((item) => {
    if (item.key === 'settings') {
      return user?.role === 'admin';
    }
    return true;
  });

  // Close drawer when route changes
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  // Focus trap when drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    // Focus close button when drawer opens
    closeButtonRef.current?.focus();

    const focusableElements = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    drawer.addEventListener('keydown', handleTab as EventListener);
    return () => drawer.removeEventListener('keydown', handleTab as EventListener);
  }, [isOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Click outside to close drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    // Add small delay to prevent immediate close from open click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, close]);

  const handleNavItemClick = (href: string | undefined) => {
    if (!href) return;
    navigate(href);
    close();
  };

  const pathSegment = location.pathname.split('/')[1];
  const currentKey =
    location.pathname === '/' ? 'dashboard' : pathSegment ? pathSegment : 'dashboard';

  return (
    <>
      {/* Hamburger Button - Visible only on mobile */}
      <button
        onClick={open}
        className="fixed left-4 top-4 z-40 flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-md md:hidden"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          isOpen
            ? 'opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        style={{
          transitionDuration: 'var(--prefers-reduced-motion, 300ms)',
        }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-divider bg-content1 shadow-lg transition-transform md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          transitionDuration: 'var(--prefers-reduced-motion, 300ms)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header with Close Button */}
        <div className="flex h-16 items-center justify-between border-b border-divider px-4">
          <span className="text-xl font-bold text-primary">Sentinel</span>
          <button
            ref={closeButtonRef}
            onClick={close}
            className="flex h-12 w-12 items-center justify-center rounded-lg hover:bg-gray-100"
            aria-label="Close navigation menu"
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            <X className="h-6 w-6 text-gray-700" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile navigation">
          <ul className="space-y-1" role="list">
            {filteredItems.map((item) => {
              const isActive = currentKey === item.key;
              const IconComponent = item.icon;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => handleNavItemClick(item.href)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{ minHeight: '48px' }}
                  >
                    {IconComponent && (
                      <IconComponent className="h-5 w-5" aria-hidden="true" />
                    )}
                    {item.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-divider p-4">
          <div className="text-sm">
            <p className="font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="capitalize text-gray-500">{user?.role}</p>
          </div>
        </div>
      </div>
    </>
  );
}
