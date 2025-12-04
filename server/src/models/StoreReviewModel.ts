import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface StoreReview {
  id: string;
  storeId: string;
  userId: string;
  orderId?: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  images?: string[];
  reply?: string;
  replyBy?: string;
  replyAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  userName?: string;
  userAvatar?: string;
  replyByName?: string;
}

export interface CreateStoreReviewRequest {
  storeId: string;
  userId: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface StoreReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export class StoreReviewModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async create(data: CreateStoreReviewRequest): Promise<StoreReview> {
    const id = uuidv4();
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      await connection.execute(`
        INSERT INTO store_reviews (
          id, store_id, user_id, order_id, rating, title, comment, 
          is_verified_purchase, images
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        data.storeId,
        data.userId,
        data.orderId || null,
        data.rating,
        data.title || null,
        data.comment || null,
        data.orderId ? true : false,
        data.images ? JSON.stringify(data.images) : null
      ]);

      // Update store review stats
      await this.updateStoreReviewStats(data.storeId, connection);

      await connection.commit();
      return await this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<StoreReview> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          r.*,
          u.first_name,
          u.last_name,
          u.avatar,
          reply_user.first_name as reply_first_name,
          reply_user.last_name as reply_last_name
        FROM store_reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN staff reply_staff ON r.reply_by = reply_staff.id
        LEFT JOIN users reply_user ON reply_staff.user_id = reply_user.id
        WHERE r.id = ?
      `, [id]);

      const reviews = rows as any[];
      if (reviews.length === 0) {
        throw new Error('Review not found');
      }

      return this.mapRowToReview(reviews[0]);
    } finally {
      connection.release();
    }
  }

  async findByStoreId(
    storeId: string,
    options?: {
      limit?: number;
      offset?: number;
      rating?: number;
      sortBy?: 'newest' | 'oldest' | 'helpful' | 'rating';
    }
  ): Promise<{ reviews: StoreReview[]; total: number }> {
    const connection = await this.pool.getConnection();
    
    try {
      let whereClause = 'WHERE r.store_id = ?';
      const params: any[] = [storeId];

      if (options?.rating) {
        whereClause += ' AND r.rating = ?';
        params.push(options.rating);
      }

      // Get total count
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM store_reviews r ${whereClause}`,
        params
      );
      const total = (countRows as any[])[0]?.total || 0;

      // Build ORDER BY clause
      let orderBy = 'ORDER BY r.created_at DESC';
      if (options?.sortBy) {
        switch (options.sortBy) {
          case 'oldest':
            orderBy = 'ORDER BY r.created_at ASC';
            break;
          case 'helpful':
            orderBy = 'ORDER BY r.helpful_count DESC, r.created_at DESC';
            break;
          case 'rating':
            orderBy = 'ORDER BY r.rating DESC, r.created_at DESC';
            break;
          default:
            orderBy = 'ORDER BY r.created_at DESC';
        }
      }

      let limitClause = '';
      if (options?.limit) {
        limitClause = `LIMIT ${options.limit}`;
        if (options?.offset) {
          limitClause += ` OFFSET ${options.offset}`;
        }
      }

      const [rows] = await connection.execute(`
        SELECT 
          r.*,
          u.first_name,
          u.last_name,
          u.avatar,
          reply_staff.id as reply_staff_id,
          reply_user.first_name as reply_first_name,
          reply_user.last_name as reply_last_name
        FROM store_reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN staff reply_staff ON r.reply_by = reply_staff.id
        LEFT JOIN users reply_user ON reply_staff.user_id = reply_user.id
        ${whereClause}
        ${orderBy}
        ${limitClause}
      `, params);

      const reviews = (rows as any[]).map(this.mapRowToReview);

      return { reviews, total };
    } finally {
      connection.release();
    }
  }

  async getReviewStats(storeId: string): Promise<StoreReviewStats> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          AVG(rating) as average_rating,
          COUNT(*) as total_reviews,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1
        FROM store_reviews
        WHERE store_id = ?
      `, [storeId]);

      const stats = (rows as any[])[0] || {};

      return {
        averageRating: parseFloat(stats.average_rating || 0),
        totalReviews: parseInt(stats.total_reviews || 0),
        ratingDistribution: {
          5: parseInt(stats.rating_5 || 0),
          4: parseInt(stats.rating_4 || 0),
          3: parseInt(stats.rating_3 || 0),
          2: parseInt(stats.rating_2 || 0),
          1: parseInt(stats.rating_1 || 0),
        },
      };
    } finally {
      connection.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get store ID before deleting
      const [reviewRows] = await connection.execute(
        `SELECT store_id FROM store_reviews WHERE id = ?`,
        [id]
      );
      const storeId = (reviewRows as any[])[0]?.store_id;

      if (!storeId) {
        throw new Error('Review not found');
      }

      // Delete the review
      const [result] = await connection.execute(
        `DELETE FROM store_reviews WHERE id = ?`,
        [id]
      );

      const deleted = (result as any).affectedRows > 0;

      if (deleted) {
        // Update store review stats
        await this.updateStoreReviewStats(storeId, connection);
      }

      await connection.commit();
      return deleted;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async userHasReviewed(storeId: string, userId: string): Promise<boolean> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT id FROM store_reviews
        WHERE store_id = ? AND user_id = ?
      `, [storeId, userId]);

      return (rows as any[]).length > 0;
    } finally {
      connection.release();
    }
  }

  private async updateStoreReviewStats(storeId: string, connection?: any): Promise<void> {
    const shouldRelease = !connection;
    if (!connection) {
      connection = await this.pool.getConnection();
    }
    
    try {
      const stats = await this.getReviewStats(storeId);
      
      await connection.execute(`
        UPDATE stores
        SET rating = ?, review_count = ?
        WHERE id = ?
      `, [stats.averageRating, stats.totalReviews, storeId]);
    } finally {
      if (shouldRelease) {
        connection.release();
      }
    }
  }

  async replyToReview(reviewId: string, replyText: string, repliedBy: string): Promise<StoreReview> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(`
        UPDATE store_reviews
        SET reply = ?, reply_by = ?, reply_at = NOW()
        WHERE id = ?
      `, [replyText, repliedBy, reviewId]);

      return await this.findById(reviewId);
    } finally {
      connection.release();
    }
  }

  private mapRowToReview(row: any): StoreReview {
    return {
      id: row.id,
      storeId: row.store_id,
      userId: row.user_id,
      orderId: row.order_id || undefined,
      rating: parseInt(row.rating),
      title: row.title || undefined,
      comment: row.comment || undefined,
      isVerifiedPurchase: Boolean(row.is_verified_purchase),
      helpfulCount: parseInt(row.helpful_count || 0),
      images: row.images ? JSON.parse(row.images) : undefined,
      reply: row.reply || undefined,
      replyBy: row.reply_by || undefined,
      replyAt: row.reply_at ? new Date(row.reply_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      userName: row.first_name && row.last_name 
        ? `${row.first_name} ${row.last_name}` 
        : undefined,
      userAvatar: row.avatar || undefined,
      replyByName: row.reply_first_name && row.reply_last_name
        ? `${row.reply_first_name} ${row.reply_last_name}`
        : undefined,
    };
  }
}

