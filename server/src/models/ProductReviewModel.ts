import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  orderId?: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  userName?: string;
  userAvatar?: string;
}

export interface CreateReviewRequest {
  productId: string;
  userId: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface ReviewStats {
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

export class ProductReviewModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async create(data: CreateReviewRequest): Promise<ProductReview> {
    const id = uuidv4();
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(`
        INSERT INTO product_reviews (
          id, product_id, user_id, order_id, rating, title, comment, 
          is_verified_purchase, images
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        data.productId,
        data.userId,
        data.orderId || null,
        data.rating,
        data.title || null,
        data.comment || null,
        data.orderId ? true : false,
        data.images ? JSON.stringify(data.images) : null
      ]);

      // Update product review stats
      await this.updateProductReviewStats(data.productId);

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<ProductReview> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          r.*,
          u.first_name,
          u.last_name,
          u.avatar
        FROM product_reviews r
        LEFT JOIN users u ON r.user_id = u.id
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

  async findByProductId(
    productId: string,
    options?: {
      limit?: number;
      offset?: number;
      rating?: number;
      sortBy?: 'newest' | 'oldest' | 'helpful' | 'rating';
    }
  ): Promise<{ reviews: ProductReview[]; total: number }> {
    const connection = await this.pool.getConnection();
    
    try {
      let whereClause = 'WHERE r.product_id = ?';
      const params: any[] = [productId];

      if (options?.rating) {
        whereClause += ' AND r.rating = ?';
        params.push(options.rating);
      }

      // Get total count
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM product_reviews r ${whereClause}`,
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
          u.avatar
        FROM product_reviews r
        LEFT JOIN users u ON r.user_id = u.id
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

  async getReviewStats(productId: string): Promise<ReviewStats> {
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
        FROM product_reviews
        WHERE product_id = ?
      `, [productId]);

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

  async markHelpful(reviewId: string, userId: string, isHelpful: boolean): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insert or update vote
      await connection.execute(`
        INSERT INTO review_helpful_votes (id, review_id, user_id, is_helpful)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE is_helpful = ?
      `, [uuidv4(), reviewId, userId, isHelpful, isHelpful]);

      // Update helpful count
      const [voteRows] = await connection.execute(`
        SELECT COUNT(*) as count FROM review_helpful_votes
        WHERE review_id = ? AND is_helpful = true
      `, [reviewId]);

      const helpfulCount = (voteRows as any[])[0]?.count || 0;

      await connection.execute(`
        UPDATE product_reviews
        SET helpful_count = ?
        WHERE id = ?
      `, [helpfulCount, reviewId]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async userHasReviewed(productId: string, userId: string): Promise<boolean> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT id FROM product_reviews
        WHERE product_id = ? AND user_id = ?
      `, [productId, userId]);

      return (rows as any[]).length > 0;
    } finally {
      connection.release();
    }
  }

  private async updateProductReviewStats(productId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      const stats = await this.getReviewStats(productId);
      
      await connection.execute(`
        UPDATE products
        SET average_rating = ?, review_count = ?
        WHERE id = ?
      `, [stats.averageRating, stats.totalReviews, productId]);
    } finally {
      connection.release();
    }
  }

  private mapRowToReview(row: any): ProductReview {
    return {
      id: row.id,
      productId: row.product_id,
      userId: row.user_id,
      orderId: row.order_id || undefined,
      rating: parseInt(row.rating),
      title: row.title || undefined,
      comment: row.comment || undefined,
      isVerifiedPurchase: Boolean(row.is_verified_purchase),
      helpfulCount: parseInt(row.helpful_count || 0),
      images: row.images ? JSON.parse(row.images) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      userName: row.first_name && row.last_name 
        ? `${row.first_name} ${row.last_name}` 
        : undefined,
      userAvatar: row.avatar || undefined,
    };
  }
}

