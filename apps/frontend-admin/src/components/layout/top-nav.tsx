'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/members', label: 'Members' },
  { href: '/checkins', label: 'Check-ins' },
  { href: '/schedules', label: 'Schedules' },
  { href: '/database', label: 'Database' },
  { href: '/settings', label: 'Settings' },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold">
              Sentinel
            </Link>

            <div className="flex gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
