import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import AdminLayout from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import StoresManagement from './components/StoresManagement';
import Analytics from './components/Analytics';
import SystemLogs from './components/SystemLogs';
import AdminRegister from './components/AdminRegister';
import SetupPassword from './components/SetupPassword';
import NotificationSystem from './components/NotificationSystem';
import type { Notification } from './components/NotificationSystem';

function App() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/setup-password" element={<SetupPassword />} />
          <Route path="/*" element={
            <AuthGuard>
              <AdminApp notifications={notifications} onRemoveNotification={removeNotification} />
            </AuthGuard>
          } />
        </Routes>
        <NotificationSystem 
          notifications={notifications} 
          onRemove={removeNotification} 
        />
      </AuthProvider>
    </Router>
  );
}

function AdminApp({ notifications, onRemoveNotification }: { 
  notifications: Notification[], 
  onRemoveNotification: (id: string) => void 
}) {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'stores':
        return <StoresManagement />;
      case 'users':
        return (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Users Management</h3>
            </div>
            <p>Users management functionality will be implemented here.</p>
          </div>
        );
      case 'analytics':
        return <Analytics />;
      case 'register-staff':
        return <AdminRegister />;
      case 'system_logs':
        return <SystemLogs />;
      case 'settings':
        return (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Settings</h3>
            </div>
            <p>Settings functionality will be implemented here.</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </AdminLayout>
  );
}

export default App;