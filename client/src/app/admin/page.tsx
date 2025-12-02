'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import styles from './page.module.scss';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredRole="admin">
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Admin Dashboard</h1>
            <p className={styles.subtitle}>
              Welcome back, {user?.firstName}! Manage your mall operations.
            </p>
          </div>

          <div className={styles.statsGrid}>
            {/* Stats Cards */}
            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <div className={`${styles.statIcon} ${styles.orange}`}>
                  <span className={styles.statIconText}>🏪</span>
                </div>
                <div className={styles.statInfo}>
                  <h3 className={styles.statTitle}>Total Stores</h3>
                  <p className={`${styles.statValue} ${styles.orange}`}>24</p>
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <div className={`${styles.statIcon} ${styles.blue}`}>
                  <span className={styles.statIconText}>👥</span>
                </div>
                <div className={styles.statInfo}>
                  <h3 className={styles.statTitle}>Total Users</h3>
                  <p className={`${styles.statValue} ${styles.blue}`}>1,234</p>
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <div className={`${styles.statIcon} ${styles.green}`}>
                  <span className={styles.statIconText}>💰</span>
                </div>
                <div className={styles.statInfo}>
                  <h3 className={styles.statTitle}>Revenue</h3>
                  <p className={`${styles.statValue} ${styles.green}`}>$45.2K</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActionsCard}>
              <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
              <div className={styles.quickActionsGrid}>
                <button className={styles.quickActionButton}>
                  <span className={styles.quickActionIcon}>➕</span>
                  <h4 className={styles.quickActionTitle}>Add New Store</h4>
                  <p className={styles.quickActionDescription}>Register a new store</p>
                </button>
                
                <button className={styles.quickActionButton}>
                  <span className={styles.quickActionIcon}>📊</span>
                  <h4 className={styles.quickActionTitle}>View Analytics</h4>
                  <p className={styles.quickActionDescription}>Check performance metrics</p>
                </button>
                
                <button className={styles.quickActionButton}>
                  <span className={styles.quickActionIcon}>⚙️</span>
                  <h4 className={styles.quickActionTitle}>System Settings</h4>
                  <p className={styles.quickActionDescription}>Configure mall settings</p>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className={styles.recentActivityCard}>
              <h3 className={styles.recentActivityTitle}>Recent Activity</h3>
              <div className={styles.activityList}>
                <div className={styles.activityItem}>
                  <div className={styles.activityContent}>
                    <span className={`${styles.activityIcon} ${styles.orange}`}>🏪</span>
                    <span className={styles.activityText}>New store "Tech Hub" registered</span>
                  </div>
                  <span className={styles.activityTime}>2 hours ago</span>
                </div>
                
                <div className={styles.activityItem}>
                  <div className={styles.activityContent}>
                    <span className={`${styles.activityIcon} ${styles.blue}`}>👤</span>
                    <span className={styles.activityText}>User "John Doe" signed up</span>
                  </div>
                  <span className={styles.activityTime}>4 hours ago</span>
                </div>
                
                <div className={styles.activityItem}>
                  <div className={styles.activityContent}>
                    <span className={`${styles.activityIcon} ${styles.green}`}>✅</span>
                    <span className={styles.activityText}>Store "Fashion World" verified</span>
                  </div>
                  <span className={styles.activityTime}>6 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
