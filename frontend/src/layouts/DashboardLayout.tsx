import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../components/sidebar';
import { DevModeProvider } from '../dev';

export default function DashboardLayout() {
  const content = (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex flex-1 flex-col overflow-auto">
        <Outlet />
      </main>
    </div>
  );

  // Wrap with DevModeProvider when dev mode is enabled
  // The provider itself handles the __DEV_MODE__ check and renders children directly if disabled
  return <DevModeProvider>{content}</DevModeProvider>;
}
