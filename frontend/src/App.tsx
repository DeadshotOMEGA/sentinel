import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@heroui/react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Visitors from './pages/Visitors';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import EventMonitor from './pages/EventMonitor';
import Reports from './pages/Reports';
import Logs from './pages/Logs';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  // DEV MODE: Authentication disabled
  const isDev = import.meta.env.DEV;

  return (
    <>
      <ToastProvider placement="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            isDev ? <DashboardLayout /> : (
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="members/*" element={<Members />} />
          <Route path="visitors" element={<Visitors />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id/monitor" element={<EventMonitor />} />
          <Route path="events/:eventId" element={<EventDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="logs" element={<Logs />} />
          <Route path="settings/*" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}
