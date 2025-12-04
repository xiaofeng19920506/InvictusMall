import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type { ProductCondition } from '../types/product';

export interface OrderReturn {
  id: string;
  orderId: string;
  orderItemId: string;
  userId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'received' | 'refunded';
  refundAmount?: number;
  returnTrackingNumber?: string;
  condition?: ProductCondition; // Condition of returned item: new, refurbished, open_box, or used
  isDisposed?: boolean; // Whether the item is disposed (not added back to inventory)
  requestedAt: string;
  processedAt?: string;
}

export interface CreateReturnRequest {
  orderId: string;
  orderItemId: string;
  userId: string;
  reason: string;
  condition?: ProductCondition; // Optional condition when creating return
  isDisposed?: boolean; // Optional disposal flag
}

export interface UpdateReturnStatusRequest {
  status: 'pending' | 'approved' | 'rejected' | 'received' | 'refunded';
  refundAmount?: number;
  returnTrackingNumber?: string;
  condition?: ProductCondition; // Condition of returned item (required when status is 'received')
  isDisposed?: boolean; // Whether the item is disposed (if true, inventory won't be added)
}

export class ReturnModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async create(returnData: CreateReturnRequest): Promise<OrderReturn> {
    const connection = await this.pool.getConnection();
    try {
      const id = uuidv4();

      await connection.execute(
        `INSERT INTO order_returns (
          id, order_id, order_item_id, user_id, reason, status, condition, is_disposed
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          id,
          returnData.orderId,
          returnData.orderItemId,
          returnData.userId,
          returnData.reason,
          returnData.condition || null,
          returnData.isDisposed || false,
        ]
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<OrderReturn> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM order_returns WHERE id = ?`,
        [id]
      );

      const returns = rows as any[];
      if (returns.length === 0) {
        throw new Error(`Return with id ${id} not found`);
      }

      return this.mapRowToReturn(returns[0]);
    } finally {
      connection.release();
    }
  }

  async findByOrderId(orderId: string): Promise<OrderReturn[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM order_returns WHERE order_id = ? ORDER BY requested_at DESC`,
        [orderId]
      );

      return (rows as any[]).map(row => this.mapRowToReturn(row));
    } finally {
      connection.release();
    }
  }

  async findByOrderItemId(orderItemId: string): Promise<OrderReturn[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM order_returns WHERE order_item_id = ? ORDER BY requested_at DESC`,
        [orderItemId]
      );

      return (rows as any[]).map(row => this.mapRowToReturn(row));
    } finally {
      connection.release();
    }
  }

  async updateStatus(id: string, updateData: UpdateReturnStatusRequest): Promise<OrderReturn> {
    const connection = await this.pool.getConnection();
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updateData.status) {
        fields.push('status = ?');
        params.push(updateData.status);
      }

      if (updateData.refundAmount !== undefined) {
        fields.push('refund_amount = ?');
        params.push(updateData.refundAmount);
      }

      if (updateData.returnTrackingNumber !== undefined) {
        fields.push('return_tracking_number = ?');
        params.push(updateData.returnTrackingNumber);
      }

      if (updateData.condition !== undefined) {
        fields.push('condition = ?');
        params.push(updateData.condition);
      }

      if (updateData.isDisposed !== undefined) {
        fields.push('is_disposed = ?');
        params.push(updateData.isDisposed);
      }

      if (updateData.status === 'refunded' || updateData.status === 'rejected' || updateData.status === 'received') {
        fields.push('processed_at = NOW()');
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      params.push(id);

      await connection.execute(
        `UPDATE order_returns SET ${fields.join(', ')} WHERE id = ?`,
        params
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  private mapRowToReturn(row: any): OrderReturn {
    return {
      id: row.id,
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      userId: row.user_id,
      reason: row.reason,
      status: row.status,
      refundAmount: row.refund_amount ? parseFloat(row.refund_amount) : undefined,
      returnTrackingNumber: row.return_tracking_number || undefined,
      condition: (row.condition as ProductCondition) || undefined,
      isDisposed: Boolean(row.is_disposed),
      requestedAt: row.requested_at.toISOString(),
      processedAt: row.processed_at ? row.processed_at.toISOString() : undefined,
    };
  }
}

