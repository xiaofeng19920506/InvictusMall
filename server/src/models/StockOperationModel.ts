import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export type StockOperationType = 'in' | 'out';

export interface StockOperation {
  id: string;
  productId: string;
  type: StockOperationType;
  quantity: number;
  reason?: string;
  performedBy: string; // Staff ID
  performedAt: Date;
  createdAt: Date;
  // Additional fields for tracking
  orderId?: string; // If stock out is related to an order
  previousQuantity: number;
  newQuantity: number;
}

export interface CreateStockOperationRequest {
  productId: string;
  type: StockOperationType;
  quantity: number;
  reason?: string;
  orderId?: string; // Optional: for stock out operations related to orders
}

export class StockOperationModel {
  private pool = pool;

  // Initialize stock operations table
  async initializeTable(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS stock_operations (
          id VARCHAR(36) PRIMARY KEY,
          product_id VARCHAR(36) NOT NULL,
          type ENUM('in', 'out') NOT NULL,
          quantity INT NOT NULL,
          reason TEXT,
          performed_by VARCHAR(36) NOT NULL,
          performed_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          order_id VARCHAR(36),
          previous_quantity INT NOT NULL,
          new_quantity INT NOT NULL,
          INDEX idx_product_id (product_id),
          INDEX idx_performed_by (performed_by),
          INDEX idx_performed_at (performed_at),
          INDEX idx_order_id (order_id),
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (error: any) {
      // If table already exists, ignore error
      if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.code !== '42S01') {
        throw error;
      }
    } finally {
      connection.release();
    }
  }

  // Create stock operation
  async createStockOperation(
    data: CreateStockOperationRequest,
    performedBy: string
  ): Promise<StockOperation> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get current product stock
      const [productRows] = await connection.execute(
        'SELECT stock_quantity FROM products WHERE id = ?',
        [data.productId]
      );
      const products = productRows as any[];
      if (!products || products.length === 0) {
        throw new Error('Product not found');
      }

      // Ensure stock_quantity is a number (database may return string)
      const currentQuantity = parseInt(products[0].stock_quantity, 10) || 0;
      const previousQuantity = currentQuantity;
      const operationQuantity = parseInt(String(data.quantity), 10);

      // Validate operation quantity
      if (isNaN(operationQuantity) || operationQuantity <= 0) {
        throw new Error('Invalid quantity: must be a positive integer');
      }

      // Calculate new quantity based on operation type
      let newQuantity: number;
      if (data.type === 'in') {
        newQuantity = currentQuantity + operationQuantity;
        logger.info('Stock-in operation', {
          productId: data.productId,
          currentQuantity,
          operationQuantity,
          newQuantity,
        });
      } else {
        // Stock out
        if (currentQuantity < operationQuantity) {
          throw new Error(`Insufficient stock. Current: ${currentQuantity}, Requested: ${operationQuantity}`);
        }
        newQuantity = currentQuantity - operationQuantity;
        logger.info('Stock-out operation', {
          productId: data.productId,
          currentQuantity,
          operationQuantity,
          newQuantity,
        });
      }

      // Create stock operation record
      const operationId = uuidv4();
      const now = new Date();
      
      await connection.execute(
        `INSERT INTO stock_operations (
          id, product_id, type, quantity, reason, performed_by,
          performed_at, created_at, order_id, previous_quantity, new_quantity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          operationId,
          data.productId,
          data.type,
          operationQuantity,
          data.reason || null,
          performedBy,
          now,
          now,
          data.orderId || null,
          previousQuantity,
          newQuantity,
        ]
      );

      // Update product stock quantity
      const [updateResult] = await connection.execute(
        'UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?',
        [newQuantity, now, data.productId]
      );

      // Verify the update was successful
      const affectedRows = (updateResult as any).affectedRows;
      if (affectedRows === 0) {
        throw new Error(`Failed to update product stock quantity. Product ${data.productId} may not exist.`);
      }

      logger.info('Product stock quantity updated', {
        productId: data.productId,
        previousQuantity,
        newQuantity,
        affectedRows,
      });

      await connection.commit();

      // Return the created operation
      return this.getStockOperationById(operationId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get stock operation by ID
  async getStockOperationById(id: string): Promise<StockOperation> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM stock_operations WHERE id = ?`,
        [id]
      );
      const operations = rows as any[];
      if (!operations || operations.length === 0) {
        throw new Error('Stock operation not found');
      }
      return this.mapRowToStockOperation(operations[0]);
    } finally {
      connection.release();
    }
  }

  // Get stock operations by product ID
  async getStockOperationsByProductId(
    productId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ operations: StockOperation[]; total: number }> {
    const connection = await this.pool.getConnection();
    try {
      // Get total count
      const [countRows] = await connection.execute(
        'SELECT COUNT(*) as total FROM stock_operations WHERE product_id = ?',
        [productId]
      );
      const total = (countRows as any[])[0]?.total || 0;

      // Get operations with pagination
      let query = `
        SELECT * FROM stock_operations 
        WHERE product_id = ? 
        ORDER BY performed_at DESC
      `;
      const params: any[] = [productId];

      if (options?.limit !== undefined) {
        query += ` LIMIT ?`;
        params.push(options.limit);
        if (options.offset !== undefined) {
          query += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const [rows] = await connection.execute(query, params);
      const operations = (rows as any[]).map(row => this.mapRowToStockOperation(row));

      return { operations, total };
    } finally {
      connection.release();
    }
  }

  // Get all stock operations with pagination and filters
  async getAllStockOperations(options?: {
    productId?: string;
    type?: StockOperationType;
    performedBy?: string;
    orderId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ operations: StockOperation[]; total: number }> {
    const connection = await this.pool.getConnection();
    try {
      // Build WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];

      if (options?.productId) {
        conditions.push('product_id = ?');
        params.push(options.productId);
      }
      if (options?.type) {
        conditions.push('type = ?');
        params.push(options.type);
      }
      if (options?.performedBy) {
        conditions.push('performed_by = ?');
        params.push(options.performedBy);
      }
      if (options?.orderId) {
        conditions.push('order_id = ?');
        params.push(options.orderId);
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      // Get total count
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM stock_operations ${whereClause}`,
        params
      );
      const total = (countRows as any[])[0]?.total || 0;

      // Get operations with pagination
      let query = `
        SELECT * FROM stock_operations 
        ${whereClause}
        ORDER BY performed_at DESC
      `;
      const queryParams = [...params];

      if (options?.limit !== undefined) {
        query += ` LIMIT ?`;
        queryParams.push(options.limit);
        if (options.offset !== undefined) {
          query += ` OFFSET ?`;
          queryParams.push(options.offset);
        }
      }

      const [rows] = await connection.execute(query, queryParams);
      const operations = (rows as any[]).map(row => this.mapRowToStockOperation(row));

      return { operations, total };
    } finally {
      connection.release();
    }
  }

  // Map database row to StockOperation
  private mapRowToStockOperation(row: any): StockOperation {
    return {
      id: row.id,
      productId: row.product_id,
      type: row.type,
      quantity: row.quantity,
      reason: row.reason || undefined,
      performedBy: row.performed_by,
      performedAt: new Date(row.performed_at),
      createdAt: new Date(row.created_at),
      orderId: row.order_id || undefined,
      previousQuantity: row.previous_quantity,
      newQuantity: row.new_quantity,
    };
  }
}

