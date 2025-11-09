import React, { useState } from 'react';
import { 
  Store, 
  BarChart3, 
  Settings, 
  Users, 
  Menu,
  X,
  LogOut,
  Shield,
  UserCheck,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import type { Permission } from '../services/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  currentPage, 
  onPageChange 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  // Define all possible navigation items
  const allNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, permission: 'dashboard' as Permission },
    { id: 'stores', label: 'Stores', icon: Store, permission: 'stores' as Permission },
    { id: 'users', label: 'Users', icon: Users, permission: 'users' as Permission },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, permission: 'analytics' as Permission },
    { id: 'register-staff', label: 'Register Staff', icon: UserCheck, permission: 'user_management' as Permission },
    { id: 'settings', label: 'Settings', icon: Settings, permission: 'settings' as Permission },
    { id: 'system_logs', label: 'System Logs', icon: FileText, permission: 'system_logs' as Permission },
  ];

  // Filter navigation items based on user permissions
  const navigationItems = user ? allNavigationItems.filter(item => 
    authService.hasPermission(user, item.permission)
  ) : [];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-900">Invictus Mall Admin</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <nav>
          <ul className="nav-menu">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="nav-item">
                  <button
                    onClick={() => {
                      onPageChange(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`nav-link w-full ${
                      currentPage === item.id ? 'active' : ''
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>

        </nav>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <div className="admin-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {navigationItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <div className="font-medium">{user ? `${user.firstName} ${user.lastName}` : 'User'}</div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user?.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user?.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                    user?.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user?.role === 'admin' && <Shield size={12} className="inline mr-1" />}
                    {user?.role === 'owner' && <UserCheck size={12} className="inline mr-1" />}
                    {user?.role === 'manager' && <TrendingUp size={12} className="inline mr-1" />}
                    {user?.role === 'employee' && <Store size={12} className="inline mr-1" />}
                    {user?.role?.toUpperCase() || 'USER'}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
              <div className="w-8 h-8 bg-primary-color rounded-full flex items-center justify-center text-white font-medium">
                {user ? user.firstName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
