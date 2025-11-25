import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface BrowseHistory {
  id: string;
  userId: string;
  productId: string;
  viewedAt: Date;
  // Joined product data
  product?: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    storeId: string;
    storeName?: string;
  };
}

export class BrowseHistoryModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async recordView(userId: string, productId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      // Check if recent view exists (within last hour)
      const [existing] = await connection.execute(`
        SELECT id FROM browse_history
        WHERE user_id = ? AND product_id = ? 
        AND viewed_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        LIMIT 1
      `, [userId, productId]);

      if ((existing as any[]).length > 0) {
        // Update existing record
        await connection.execute(`
          UPDATE browse_history
          SET viewed_at = NOW()
          WHERE user_id = ? AND product_id = ?
          AND viewed_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
          LIMIT 1
        `, [userId, productId]);
      } else {
        // Create new record
        await connection.execute(`
          INSERT INTO browse_history (id, user_id, product_id)
          VALUES (?, ?, ?)
        `, [uuidv4(), userId, productId]);
      }

      // Update product view count
      await connection.execute(`
        UPDATE products
        SET view_count = view_count + 1
        WHERE id = ?
      `, [productId]);

      // Keep only last 100 records per user
      await connection.execute(`
        DELETE FROM browse_history
        WHERE user_id = ? AND id NOT IN (
          SELECT id FROM (
            SELECT id FROM browse_history
            WHERE user_id = ?
            ORDER BY viewed_at DESC
            LIMIT 100
          ) AS temp
        )
      `, [userId, userId]);
    } finally {
      connection.release();
    }
  }

  async getUserHistory(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ history: BrowseHistory[]; total: number }> {
    const connection = await this.pool.getConnection();
    
    try {
      // Get total count
      const [countRows] = await connection.execute(`
        SELECT COUNT(*) as total FROM browse_history
        WHERE user_id = ?
      `, [userId]);
      const total = (countRows as any[])[0]?.total || 0;

      let limitClause = '';
      if (options?.limit) {
        limitClause = `LIMIT ${options.limit}`;
        if (options?.offset) {
          limitClause += ` OFFSET ${options.offset}`;
        }
      }

      const [rows] = await connection.execute(`
        SELECT 
          bh.*,
          p.name as product_name,
          p.price as product_price,
          p.image_url as product_image_url,
          p.store_id as product_store_id,
          s.name as store_name
        FROM browse_history bh
        LEFT JOIN products p ON bh.product_id = p.id
        LEFT JOIN stores s ON p.store_id = s.id
        WHERE bh.user_id = ?
        ORDER BY bh.viewed_at DESC
        ${limitClause}
      `, [userId]);

      const history = (rows as any[]).map(this.mapRowToHistory);

      return { history, total };
    } finally {
      connection.release();
    }
  }

  async clearUserHistory(userId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(`
        DELETE FROM browse_history WHERE user_id = ?
      `, [userId]);
    } finally {
      connection.release();
    }
  }

  async deleteHistoryItem(userId: string, historyId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(`
        DELETE FROM browse_history
        WHERE id = ? AND user_id = ?
      `, [historyId, userId]);
    } finally {
      connection.release();
    }
  }

  async getRecommendedProducts(userId: string, limit: number = 10): Promise<string[]> {
    const connection = await this.pool.getConnection();
    
    try {
      // Get products from user's browse history
      const [rows] = await connection.execute(`
        SELECT DISTINCT product_id
        FROM browse_history
        WHERE user_id = ?
        ORDER BY viewed_at DESC
        LIMIT ?
      `, [userId, limit]);

      return (rows as any[]).map(row => row.product_id);
    } finally {
      connection.release();
    }
  }

  private mapRowToHistory(row: any): BrowseHistory {
    return {
      id: row.id,
      userId: row.user_id,
      productId: row.product_id,
      viewedAt: new Date(row.viewed_at),
      product: row.product_name ? {
        id: row.product_id,
        name: row.product_name,
        price: parseFloat(row.product_price),
        imageUrl: row.product_image_url || undefined,
        storeId: row.product_store_id,
        storeName: row.store_name || undefined,
      } : undefined,
    };
  }
}

