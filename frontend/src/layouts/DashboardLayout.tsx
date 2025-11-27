import { Outlet } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
