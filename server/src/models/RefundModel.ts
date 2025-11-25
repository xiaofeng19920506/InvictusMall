import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Refund {
  id: string;
  orderId: string;
  paymentIntentId: string;
  refundId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: string;
  refundedBy?: string;
  itemIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRefundRequest {
  orderId: string;
  paymentIntentId: string;
  refundId: string;
  amount: number;
  currency?: string;
  reason?: string;
  status: string;
  refundedBy?: string;
  itemIds?: string[];
}

export class RefundModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async create(refundData: CreateRefundRequest): Promise<Refund> {
    const connection = await this.pool.getConnection();
    try {
      // Try to add item_ids column if it doesn't exist
      try {
        await connection.execute(`
          ALTER TABLE refunds 
          ADD COLUMN item_ids JSON
        `);
      } catch (error: any) {
        // Column already exists or other error, ignore
        if (error.code !== 'ER_DUP_FIELDNAME') {
          console.warn('Could not add item_ids column to refunds table:', error.message);
        }
      }

      const id = uuidv4();
      const currency = refundData.currency || 'usd';
      const itemIdsJson = refundData.itemIds && refundData.itemIds.length > 0 
        ? JSON.stringify(refundData.itemIds) 
        : null;

      await connection.execute(
        `INSERT INTO refunds (
          id, order_id, payment_intent_id, refund_id, amount, currency, reason, status, refunded_by, item_ids
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          refundData.orderId,
          refundData.paymentIntentId,
          refundData.refundId,
          refundData.amount,
          currency,
          refundData.reason || null,
          refundData.status,
          refundData.refundedBy ? refundData.refundedBy : null,
          itemIdsJson,
        ]
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<Refund> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM refunds WHERE id = ?`,
        [id]
      );

      const refunds = rows as any[];
      if (refunds.length === 0) {
        throw new Error(`Refund with id ${id} not found`);
      }

      return this.mapRowToRefund(refunds[0]);
    } finally {
      connection.release();
    }
  }

  async findByOrderId(orderId: string): Promise<Refund[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC`,
        [orderId]
      );

      return (rows as any[]).map(row => this.mapRowToRefund(row));
    } finally {
      connection.release();
    }
  }

  async findByPaymentIntentId(paymentIntentId: string): Promise<Refund[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM refunds WHERE payment_intent_id = ? ORDER BY created_at DESC`,
        [paymentIntentId]
      );

      return (rows as any[]).map(row => this.mapRowToRefund(row));
    } finally {
      connection.release();
    }
  }

  async getTotalRefundedAmount(orderId: string): Promise<number> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT COALESCE(SUM(amount), 0) as total FROM refunds WHERE order_id = ? AND status = 'succeeded'`,
        [orderId]
      );

      const result = rows as any[];
      const total = result[0]?.total;
      // Ensure we return a number, as MySQL SUM can return Decimal or string
      return total ? parseFloat(String(total)) : 0;
    } finally {
      connection.release();
    }
  }

  private mapRowToRefund(row: any): Refund {
    let itemIds: string[] | undefined = undefined;
    if (row.item_ids) {
      try {
        itemIds = typeof row.item_ids === 'string' 
          ? JSON.parse(row.item_ids) 
          : row.item_ids;
      } catch (error) {
        console.warn('Failed to parse item_ids from refund:', error);
      }
    }

    return {
      id: row.id,
      orderId: row.order_id,
      paymentIntentId: row.payment_intent_id,
      refundId: row.refund_id,
      amount: parseFloat(row.amount),
      currency: row.currency || 'usd',
      reason: row.reason || undefined,
      status: row.status,
      refundedBy: row.refunded_by || undefined,
      itemIds: itemIds,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}

