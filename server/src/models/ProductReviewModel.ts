import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

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
  // Reply fields
  reply?: string;
  replyBy?: string;
  replyAt?: Date;
  // Joined fields
  userName?: string;
  userAvatar?: string;
  replyByName?: string;
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

export interface UpdateReviewRequest {
  rating?: number;
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
      try {
        await this.updateProductReviewStats(data.productId);
      } catch (error: any) {
        logger.error(`Failed to update product review stats for product ${data.productId}:`, error);
        // Continue even if stats update fails
      }

      // Update store review stats
      try {
        await this.updateStoreReviewStats(data.productId);
      } catch (error: any) {
        logger.error(`Failed to update store review stats for product ${data.productId}:`, error);
        // Continue even if stats update fails
      }

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
          u.avatar,
          reply_user.first_name as reply_first_name,
          reply_user.last_name as reply_last_name
        FROM product_reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN staff reply_user ON r.reply_by = reply_user.id
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
          u.avatar,
          reply_user.first_name as reply_first_name,
          reply_user.last_name as reply_last_name
        FROM product_reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN staff reply_user ON r.reply_by = reply_user.id
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

  async findByProductIdAndUserId(productId: string, userId: string): Promise<ProductReview | null> {
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
        FROM product_reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN staff reply_user ON r.reply_by = reply_user.id
        WHERE r.product_id = ? AND r.user_id = ?
        LIMIT 1
      `, [productId, userId]);

      const reviews = rows as any[];
      if (reviews.length === 0) {
        return null;
      }

      return this.mapRowToReview(reviews[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Check if user has purchased the product and if the purchase is within 30 days
   * @returns { purchaseValid: boolean, orderId?: string, orderDate?: Date, message?: string }
   */
  async validatePurchaseForReview(
    productId: string,
    userId: string,
    providedOrderId?: string
  ): Promise<{
    purchaseValid: boolean;
    orderId?: string;
    orderDate?: Date;
    message?: string;
  }> {
    const connection = await this.pool.getConnection();
    
    try {
      // If orderId is provided, validate that specific order
      if (providedOrderId) {
        const [orderRows] = await connection.execute(`
          SELECT 
            o.id,
            o.user_id,
            o.order_date,
            o.status,
            oi.product_id
          FROM orders o
          INNER JOIN order_items oi ON o.id = oi.order_id
          WHERE o.id = ? AND o.user_id = ? AND oi.product_id = ?
          AND o.status NOT IN ('cancelled', 'returned', 'return_processing')
        `, [providedOrderId, userId, productId]);

        const orders = orderRows as any[];
        if (orders.length === 0) {
          return {
            purchaseValid: false,
            message: 'Order not found or does not contain this product',
          };
        }

        const order = orders[0];
        const orderDate = new Date(order.order_date);
        const now = new Date();
        const daysSincePurchase = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSincePurchase > 30) {
          return {
            purchaseValid: false,
            orderId: order.id,
            orderDate,
            message: 'Review can only be submitted within 30 days of purchase',
          };
        }

        return {
          purchaseValid: true,
          orderId: order.id,
          orderDate,
        };
      }

      // If no orderId provided, find the most recent purchase of this product
      const [orderRows] = await connection.execute(`
        SELECT 
          o.id,
          o.order_date,
          o.status
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ? AND oi.product_id = ?
        AND o.status NOT IN ('cancelled', 'returned', 'return_processing')
        ORDER BY o.order_date DESC
        LIMIT 1
      `, [userId, productId]);

      const orders = orderRows as any[];
      if (orders.length === 0) {
        return {
          purchaseValid: false,
          message: 'You must purchase this product before writing a review',
        };
      }

      const order = orders[0];
      const orderDate = new Date(order.order_date);
      const now = new Date();
      const daysSincePurchase = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSincePurchase > 30) {
        return {
          purchaseValid: false,
          orderId: order.id,
          orderDate,
          message: 'Review can only be submitted within 30 days of purchase',
        };
      }

      return {
        purchaseValid: true,
        orderId: order.id,
        orderDate,
      };
    } finally {
      connection.release();
    }
  }

  async updateProductReviewStats(productId: string): Promise<void> {
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

  async updateStoreReviewStats(productId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      // Get the store_id for this product
      const [productRows] = await connection.execute(`
        SELECT store_id FROM products WHERE id = ?
      `, [productId]);

      const products = productRows as any[];
      if (products.length === 0) {
        return; // Product not found, skip store update
      }

      const storeId = products[0].store_id;

      // Calculate store review stats from all product reviews in the store
      // Get all product IDs for this store
      const [storeProductRows] = await connection.execute(`
        SELECT id FROM products WHERE store_id = ?
      `, [storeId]);

      const storeProductIds = (storeProductRows as any[]).map(row => row.id);
      
      if (storeProductIds.length === 0) {
        return; // No products in store
      }

      // Calculate total reviews and average rating from all product reviews
      const placeholders = storeProductIds.map(() => '?').join(',');
      const [statsRows] = await connection.execute(`
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating
        FROM product_reviews
        WHERE product_id IN (${placeholders})
      `, storeProductIds);

      const stats = (statsRows as any[])[0] || {};
      const totalReviews = parseInt(stats.total_reviews || 0);
      const averageRating = parseFloat(stats.average_rating || 0) || 0;

      // Update store review count and rating
      await connection.execute(`
        UPDATE stores
        SET review_count = ?, rating = ?
        WHERE id = ?
      `, [totalReviews, averageRating, storeId]);
    } finally {
      connection.release();
    }
  }

  async update(reviewId: string, data: UpdateReviewRequest): Promise<ProductReview> {
    const connection = await this.pool.getConnection();
    
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.rating !== undefined) {
        fields.push('rating = ?');
        params.push(data.rating);
      }
      if (data.title !== undefined) {
        fields.push('title = ?');
        params.push(data.title || null);
      }
      if (data.comment !== undefined) {
        fields.push('comment = ?');
        params.push(data.comment || null);
      }
      if (data.images !== undefined) {
        fields.push('images = ?');
        params.push(data.images.length > 0 ? JSON.stringify(data.images) : null);
      }

      if (fields.length === 0) {
        return await this.findById(reviewId);
      }

      fields.push('updated_at = NOW()');
      params.push(reviewId);

      await connection.execute(
        `UPDATE product_reviews SET ${fields.join(', ')} WHERE id = ?`,
        params
      );

      const review = await this.findById(reviewId);
      
      // Update product review stats
      try {
        await this.updateProductReviewStats(review.productId);
      } catch (error: any) {
        logger.error(`Failed to update product review stats for product ${review.productId}:`, error);
        // Continue even if stats update fails
      }
      
      // Update store review stats
      try {
        await this.updateStoreReviewStats(review.productId);
      } catch (error: any) {
        logger.error(`Failed to update store review stats for product ${review.productId}:`, error);
        // Continue even if stats update fails
      }

      return review;
    } finally {
      connection.release();
    }
  }

  async delete(reviewId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      // Get review to find productId before deleting
      const review = await this.findById(reviewId);
      const productId = review.productId;

      await connection.execute(
        `DELETE FROM product_reviews WHERE id = ?`,
        [reviewId]
      );

      // Update product review stats
      await this.updateProductReviewStats(productId);
      
      // Update store review stats
      try {
        await this.updateStoreReviewStats(productId);
      } catch (error: any) {
        logger.error(`Failed to update store review stats for product ${productId}:`, error);
      }
    } finally {
      connection.release();
    }
  }

  async replyToReview(reviewId: string, reply: string, repliedBy: string): Promise<ProductReview> {
    const connection = await this.pool.getConnection();
    
    try {
      const now = new Date();
      
      await connection.execute(
        `UPDATE product_reviews 
         SET reply = ?, reply_by = ?, reply_at = ?, updated_at = ?
         WHERE id = ?`,
        [reply, repliedBy, now, now, reviewId]
      );

      return await this.findById(reviewId);
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
      reply: row.reply || undefined,
      replyBy: row.reply_by || undefined,
      replyAt: row.reply_at ? new Date(row.reply_at) : undefined,
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

