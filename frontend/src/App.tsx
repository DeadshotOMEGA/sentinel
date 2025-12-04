import { Routes, Route, Navigate } from 'react-router-dom';
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
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members/*" element={<Members />} />
        <Route path="visitors" element={<Visitors />} />
        <Route path="events" element={<Events />} />
        <Route path="events/monitor" element={<EventMonitor />} />
        <Route path="events/:eventId" element={<EventDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings/*" element={<Settings />} />
      </Route>
    </Routes>
  );
}
