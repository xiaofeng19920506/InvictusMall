import { pool } from '../config/database';

export interface ActivityLog {
  id: string;
  type: 'store_created' | 'store_updated' | 'store_deleted' | 'store_verified' | 'user_registered' | 'user_login' | 'password_reset_requested' | 'password_reset_completed';
  message: string;
  timestamp: Date;
  storeName?: string;
  storeId?: string;
  metadata?: Record<string, any>;
}

export class ActivityLogModel {
  /**
   * Create a new activity log entry
   */
  static async createLog(logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    const query = `
      INSERT INTO activity_logs (type, message, store_name, store_id, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const metadataJson = logData.metadata ? JSON.stringify(logData.metadata) : null;
    
    const [result] = await pool.execute(query, [
      logData.type,
      logData.message,
      logData.storeName || null,
      logData.storeId || null,
      metadataJson
    ]);
    
    const insertId = (result as any).insertId;
    const log = await this.getLogById(insertId.toString());
    if (!log) throw new Error('Failed to retrieve created activity log');
    return log;
  }

  /**
   * Get activity log by ID
   */
  static async getLogById(id: string): Promise<ActivityLog | null> {
    const query = `
      SELECT id, type, message, store_name, store_id, metadata, created_at
      FROM activity_logs
      WHERE id = ?
    `;
    
    const [rows] = await pool.execute(query, [id]);
    const row = (rows as any[])[0];
    
    if (!row) return null;
    
    return {
      id: row.id.toString(),
      type: row.type,
      message: row.message,
      timestamp: row.created_at,
      storeName: row.store_name,
      storeId: row.store_id,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined
    };
  }

  /**
   * Get recent activity logs
   */
  static async getRecentLogs(limit: number = 20): Promise<ActivityLog[]> {
    const query = `
      SELECT id, type, message, store_name, store_id, metadata, created_at
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    try {
      const [rows] = await pool.execute(query, [limit]);
      
      return (rows as any[]).map(row => ({
        id: row.id.toString(),
        type: row.type,
        message: row.message,
        timestamp: row.created_at,
        storeName: row.store_name,
        storeId: row.store_id,
        metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined
      }));
    } catch (error) {
      console.error('Error fetching recent logs:', error);
      return [];
    }
  }

  /**
   * Get activity logs by store ID
   */
  static async getLogsByStoreId(storeId: string, limit: number = 10): Promise<ActivityLog[]> {
    const query = `
      SELECT id, type, message, store_name, store_id, metadata, created_at
      FROM activity_logs
      WHERE store_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    try {
      const [rows] = await pool.execute(query, [storeId, limit]);
      
      return (rows as any[]).map(row => ({
        id: row.id.toString(),
        type: row.type,
        message: row.message,
        timestamp: row.created_at,
        storeName: row.store_name,
        storeId: row.store_id,
        metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined
      }));
    } catch (error) {
      console.error('Error fetching logs by store ID:', error);
      return [];
    }
  }

  /**
   * Get activity logs by type
   */
  static async getLogsByType(type: ActivityLog['type'], limit: number = 10): Promise<ActivityLog[]> {
    const query = `
      SELECT id, type, message, store_name, store_id, metadata, created_at
      FROM activity_logs
      WHERE type = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    try {
      const [rows] = await pool.execute(query, [type, limit]);
      
      return (rows as any[]).map(row => ({
        id: row.id.toString(),
        type: row.type,
        message: row.message,
        timestamp: row.created_at,
        storeName: row.store_name,
        storeId: row.store_id,
        metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined
      }));
    } catch (error) {
      console.error('Error fetching logs by type:', error);
      return [];
    }
  }
}
