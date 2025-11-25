import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface StoreTransaction {
  id: string;
  storeId: string;
  transactionType: 'sale' | 'refund' | 'payment' | 'fee' | 'commission';
  amount: number;
  currency: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  paymentMethod?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionDate: Date;
  createdBy?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionRequest {
  storeId: string;
  transactionType: 'sale' | 'refund' | 'payment' | 'fee' | 'commission';
  amount: number;
  currency?: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  paymentMethod?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionDate?: Date;
  createdBy?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTransactionRequest {
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  description?: string;
  metadata?: Record<string, any>;
}

export interface TransactionFilters {
  storeId?: string;
  transactionType?: 'sale' | 'refund' | 'payment' | 'fee' | 'commission';
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  customerId?: string;
  orderId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class TransactionModel {
  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionRequest): Promise<StoreTransaction> {
    const id = uuidv4();
    const now = new Date();
    const transactionDate = data.transactionDate || now;
    const currency = data.currency || 'USD';
    const status = data.status || 'pending';
    const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;

    const query = `
      INSERT INTO store_transactions (
        id, store_id, transaction_type, amount, currency, description,
        customer_id, customer_name, order_id, payment_method, status,
        transaction_date, created_by, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      id,
      data.storeId,
      data.transactionType,
      data.amount,
      currency,
      data.description || null,
      data.customerId || null,
      data.customerName || null,
      data.orderId || null,
      data.paymentMethod || null,
      status,
      transactionDate,
      data.createdBy || null,
      metadataJson,
      now,
      now,
    ]);

    const transaction = await this.getTransactionById(id);
    if (!transaction) throw new Error('Failed to retrieve created transaction');
    return transaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<StoreTransaction | null> {
    const query = `
      SELECT 
        id, store_id, transaction_type, amount, currency, description,
        customer_id, customer_name, order_id, payment_method, status,
        transaction_date, created_by, metadata, created_at, updated_at
      FROM store_transactions
      WHERE id = ?
    `;

    const [rows] = await pool.execute(query, [id]);
    const row = (rows as any[])[0];

    if (!row) return null;

    return this.mapRowToTransaction(row);
  }

  /**
   * Get transactions with filters
   */
  async getTransactions(filters: TransactionFilters = {}): Promise<StoreTransaction[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.storeId) {
      conditions.push('store_id = ?');
      params.push(filters.storeId);
    }
    if (filters.transactionType) {
      conditions.push('transaction_type = ?');
      params.push(filters.transactionType);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.customerId) {
      conditions.push('customer_id = ?');
      params.push(filters.customerId);
    }
    if (filters.orderId) {
      conditions.push('order_id = ?');
      params.push(filters.orderId);
    }
    if (filters.startDate) {
      conditions.push('transaction_date >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('transaction_date <= ?');
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = typeof filters.limit === 'number' ? filters.limit : (filters.limit ? parseInt(String(filters.limit)) : 100);
    const offset = typeof filters.offset === 'number' ? filters.offset : (filters.offset ? parseInt(String(filters.offset)) : 0);

    const query = `
      SELECT 
        id, store_id, transaction_type, amount, currency, description,
        customer_id, customer_name, order_id, payment_method, status,
        transaction_date, created_by, metadata, created_at, updated_at
      FROM store_transactions
      ${whereClause}
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const [rows] = await pool.execute(query, [...params, limit, offset]);
      return (rows as any[]).map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Get transactions by store ID
   */
  async getTransactionsByStoreId(storeId: string, limit: number = 50): Promise<StoreTransaction[]> {
    return this.getTransactions({ storeId, limit });
  }

  /**
   * Update transaction
   */
  async updateTransaction(id: string, data: UpdateTransactionRequest): Promise<StoreTransaction | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description);
    }
    if (data.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(data.metadata ? JSON.stringify(data.metadata) : null);
    }

    if (fields.length === 0) {
      return this.getTransactionById(id);
    }

    fields.push('updated_at = ?');
    params.push(new Date());
    params.push(id);

    const query = `
      UPDATE store_transactions
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    await pool.execute(query, params);
    return this.getTransactionById(id);
  }

  /**
   * Delete transaction (soft delete by status)
   */
  async deleteTransaction(id: string): Promise<void> {
    const query = `
      UPDATE store_transactions
      SET status = 'cancelled', updated_at = ?
      WHERE id = ?
    `;
    await pool.execute(query, [new Date(), id]);
  }

  /**
   * Get transaction statistics for a store
   */
  async getStoreTransactionStats(storeId: string, startDate?: Date, endDate?: Date): Promise<{
    totalSales: number;
    totalRefunds: number;
    totalTransactions: number;
    totalAmount: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const conditions: string[] = ['store_id = ?'];
    const params: any[] = [storeId];

    if (startDate) {
      conditions.push('transaction_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('transaction_date <= ?');
      params.push(endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // First get overall totals
    const totalsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type = 'sale' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN transaction_type = 'refund' AND status = 'completed' THEN ABS(amount) ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_amount
      FROM store_transactions
      ${whereClause}
    `;

    // Then get breakdowns by type and status
    const breakdownQuery = `
      SELECT 
        transaction_type,
        status,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as amount
      FROM store_transactions
      ${whereClause}
      GROUP BY transaction_type, status
    `;

    try {
      const [totalsRows] = await pool.execute(totalsQuery, params);
      const [breakdownRows] = await pool.execute(breakdownQuery, params);
      
      const totals = (totalsRows as any[])[0] || {};
      const breakdowns = (breakdownRows as any[]) || [];

      const stats = {
        totalSales: parseFloat(totals.total_sales || 0) || 0,
        totalRefunds: parseFloat(totals.total_refunds || 0) || 0,
        totalTransactions: parseInt(totals.total_transactions || 0) || 0,
        totalAmount: parseFloat(totals.total_amount || 0) || 0,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      };

      if (breakdowns && breakdowns.length > 0) {
        breakdowns.forEach((row) => {
          const type = row.transaction_type;
          const status = row.status;
          const amount = parseFloat(row.amount || 0) || 0;
          const count = parseInt(row.count || 0) || 0;

          stats.byType[type] = (stats.byType[type] || 0) + amount;
          stats.byStatus[status] = (stats.byStatus[status] || 0) + count;
        });
      }

      return stats;
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      return {
        totalSales: 0,
        totalRefunds: 0,
        totalTransactions: 0,
        totalAmount: 0,
        byType: {},
        byStatus: {},
      };
    }
  }

  /**
   * Map database row to Transaction object
   */
  private mapRowToTransaction(row: any): StoreTransaction {
    return {
      id: row.id,
      storeId: row.store_id,
      transactionType: row.transaction_type,
      amount: parseFloat(row.amount),
      currency: row.currency || 'USD',
      description: row.description,
      customerId: row.customer_id,
      customerName: row.customer_name,
      orderId: row.order_id,
      paymentMethod: row.payment_method,
      status: row.status,
      transactionDate: row.transaction_date,
      createdBy: row.created_by,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

