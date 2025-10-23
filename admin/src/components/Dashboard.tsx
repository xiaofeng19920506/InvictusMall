import React, { useEffect, useState } from 'react';
import { Store, TrendingUp, Users, DollarSign, Plus, Edit, Trash2, Clock } from 'lucide-react';
import { storeApi, healthApi, activityLogApi } from '../services/api';
import type { ActivityLog } from '../types/store';

interface DashboardStats {
  totalStores: number;
  verifiedStores: number;
  totalCategories: number;
  avgRating: number;
  serverStatus: 'online' | 'offline';
  serverUptime?: number;
}


const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStores: 0,
    verifiedStores: 0,
    totalCategories: 0,
    avgRating: 0,
    serverStatus: 'offline'
  });
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadDashboardData();
    loadActivityLogs();
  }, []);

  const loadActivityLogs = async () => {
    try {
      const response = await activityLogApi.getRecentLogs(10);
      if (response.success) {
        setActivityLogs(response.data || []);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
      // Keep empty array on error
      setActivityLogs([]);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load stores data
      const storesResponse = await storeApi.getAllStores();
      const stores = storesResponse.data || [];
      
      // Calculate stats
      const totalStores = stores.length;
      const verifiedStores = stores.filter(store => store.isVerified).length;
      const categories = new Set(stores.flatMap(store => store.category));
      const avgRating = stores.length > 0 
        ? stores.reduce((sum, store) => sum + store.rating, 0) / stores.length 
        : 0;

      // Check server health
      try {
        const healthResponse = await healthApi.checkHealth();
        setStats({
          totalStores,
          verifiedStores,
          totalCategories: categories.size,
          avgRating: Math.round(avgRating * 10) / 10,
          serverStatus: 'online',
          serverUptime: healthResponse.uptime
        });
      } catch (error) {
        setStats({
          totalStores,
          verifiedStores,
          totalCategories: categories.size,
          avgRating: Math.round(avgRating * 10) / 10,
          serverStatus: 'offline'
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats(prev => ({ ...prev, serverStatus: 'offline' }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading"></div>
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-label">Total Stores</div>
              <div className="stat-value">{stats.totalStores}</div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-label">Verified Stores</div>
              <div className="stat-value">{stats.verifiedStores}</div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-label">Categories</div>
              <div className="stat-value">{stats.totalCategories}</div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-label">Average Rating</div>
              <div className="stat-value">{stats.avgRating}</div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <p className="card-subtitle">Latest store management activities</p>
        </div>
        
        <div className="space-y-4">
          {activityLogs.map((log) => {
            const getIcon = () => {
              switch (log.type) {
                case 'store_created':
                  return <Plus className="w-4 h-4 text-green-500" />;
                case 'store_updated':
                  return <Edit className="w-4 h-4 text-blue-500" />;
                case 'store_deleted':
                  return <Trash2 className="w-4 h-4 text-red-500" />;
                case 'store_verified':
                  return <Store className="w-4 h-4 text-purple-500" />;
                default:
                  return <Clock className="w-4 h-4 text-gray-500" />;
              }
            };

            const getBgColor = () => {
              switch (log.type) {
                case 'store_created':
                  return 'bg-green-50 border-green-200';
                case 'store_updated':
                  return 'bg-blue-50 border-blue-200';
                case 'store_deleted':
                  return 'bg-red-50 border-red-200';
                case 'store_verified':
                  return 'bg-purple-50 border-purple-200';
                default:
                  return 'bg-gray-50 border-gray-200';
              }
            };

            return (
              <div key={log.id} className={`p-4 border rounded-lg ${getBgColor()}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {log.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {log.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activityLogs.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card mt-6">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-primary">
            <Store className="w-4 h-4 mr-2" />
            Add New Store
          </button>
          <button className="btn btn-secondary">
            <TrendingUp className="w-4 h-4 mr-2" />
            View Analytics
          </button>
          <button className="btn btn-secondary">
            <Users className="w-4 h-4 mr-2" />
            Manage Users
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
