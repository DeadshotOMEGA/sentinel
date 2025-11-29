import { Outlet } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';
import MobileNav from '../components/MobileNav';
import { SkipNav } from '@shared/ui';

export default function DashboardLayout() {
  return (
    <>
      <SkipNav
        links={[
          {
            id: 'skip-to-main',
            label: 'Skip to main content',
            targetId: 'main-content',
          },
          {
            id: 'skip-to-nav',
            label: 'Skip to navigation',
            targetId: 'primary-navigation',
          },
        ]}
      />
      <div className="flex h-screen bg-gray-50">
        <MobileNav />
        <AppSidebar />
        <main
          id="main-content"
          className="flex flex-1 flex-col overflow-hidden"
          role="main"
          aria-label="Main content"
        >
          <Outlet />
        </main>
      </div>
    </>
  );
}
