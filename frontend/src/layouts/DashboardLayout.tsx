import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../components/sidebar';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
