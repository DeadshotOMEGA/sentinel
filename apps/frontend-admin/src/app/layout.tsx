'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { AppNavbar } from '@/components/layout/app-navbar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import './globals.css'

const DRAWER_ID = 'app-drawer'

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)

  return (
    <html lang="en" data-theme="sentinel" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          <div className={`drawer ${isDrawerOpen ? 'drawer-open' : ''}`}>
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
              <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                {children}
              </main>
            </div>

            {/* Sidebar */}
            <div className="drawer-side z-40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <label
                htmlFor={DRAWER_ID}
                aria-label="close sidebar"
                className="drawer-overlay"
              />
              <AppSidebar drawerId={DRAWER_ID} />
            </div>
          </div>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  )
}
