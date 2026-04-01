'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { AppNavbar } from '@/components/layout/app-navbar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AuthHydrator } from '@/components/auth/auth-hydrator'
import './globals.css'

const DRAWER_ID = 'app-drawer'

/** Routes that render without the app shell (navbar, sidebar) */
const BARE_ROUTES = ['/login', '/kiosk', '/change-pin-required']

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const pathname = usePathname()
  const isBareRoute = BARE_ROUTES.some((r) => pathname.startsWith(r))

  return (
    <html lang="en" data-theme="sentinel" suppressHydrationWarning>
      <body className="bg-base-300" suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          <AuthHydrator />
          {isBareRoute ? (
            children
          ) : (
            <div className={`drawer min-h-screen ${isDrawerOpen ? 'drawer-open' : ''}`}>
              <input
                id={DRAWER_ID}
                type="checkbox"
                className="drawer-toggle"
                checked={isDrawerOpen}
                onChange={(e) => setIsDrawerOpen(e.target.checked)}
              />

              {/* Main Content */}
              <div className="drawer-content flex flex-col">
                <AppNavbar drawerId={DRAWER_ID} isDrawerOpen={isDrawerOpen} />
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
              </div>

              {/* Sidebar */}
              <div className="drawer-side z-40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <label htmlFor={DRAWER_ID} aria-label="close sidebar" className="drawer-overlay" />
                <AppSidebar drawerId={DRAWER_ID} />
              </div>
            </div>
          )}
          <Toaster
            position="top-right"
            expand={false}
            visibleToasts={4}
            closeButton
            richColors={false}
            offset={{ top: 'var(--space-4)', right: 'var(--space-4)' }}
            mobileOffset={{
              top: 'var(--space-3)',
              right: 'var(--space-3)',
              left: 'var(--space-3)',
            }}
            toastOptions={{
              unstyled: true,
              duration: 4000,
              classNames: {
                toast:
                  'pointer-events-auto flex w-full max-w-96 items-start gap-(--space-3) rounded-box border border-base-300 px-(--space-4) py-(--space-3) shadow-lg',
                title: 'text-sm font-medium leading-5',
                description: 'text-sm leading-5 text-current/80',
                content: 'min-w-0 flex-1 space-y-(--space-1)',
                icon: 'mt-0.5 shrink-0',
                closeButton:
                  'btn btn-ghost btn-xs btn-circle border-0 bg-transparent text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
                actionButton: 'btn btn-primary btn-xs',
                cancelButton: 'btn btn-ghost btn-xs',
                success: 'alert alert-success alert-soft text-success-fadded-content',
                error: 'alert alert-error alert-soft text-error-fadded-content',
                warning: 'alert alert-warning alert-soft text-warning-fadded-content',
                info: 'alert alert-info alert-soft text-info-fadded-content',
                loading: 'alert alert-info alert-soft text-info-fadded-content',
                default: 'alert bg-base-100 text-base-content',
              },
            }}
          />
          {!isBareRoute && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </body>
    </html>
  )
}
