import { useState } from 'react';
import AdminLayout from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import StoresManagement from './components/StoresManagement';
import NotificationSystem from './components/NotificationSystem';
import type { Notification } from './components/NotificationSystem';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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
    <>
      <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </AdminLayout>
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </>
  );
}

export default App;