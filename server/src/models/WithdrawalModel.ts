import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Withdrawal {
  id: string;
  storeId: string;
  storeName?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankName: string;
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  processedBy?: string;
  processedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWithdrawalRequest {
  storeId: string;
  amount: number;
  currency?: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankName: string;
  requestedBy: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateWithdrawalRequest {
  status?: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  approvedBy?: string;
  processedBy?: string;
  rejectionReason?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface WithdrawalFilters {
  storeId?: string;
  status?: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  requestedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface StoreBalance {
  storeId: string;
  storeName: string;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  availableBalance: number;
  platformCommission: number;
  currency: string;
}

export class WithdrawalModel {
  /**
   * Create withdrawal table
   */
  async createWithdrawalsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(36) PRIMARY KEY,
        store_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        status ENUM('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
        bank_account_name VARCHAR(255) NOT NULL,
        bank_account_number VARCHAR(255) NOT NULL,
        bank_routing_number VARCHAR(50) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        requested_by VARCHAR(36) NOT NULL,
        requested_at DATETIME NOT NULL,
        approved_by VARCHAR(36) NULL,
        approved_at DATETIME NULL,
        processed_by VARCHAR(36) NULL,
        processed_at DATETIME NULL,
        rejection_reason TEXT NULL,
        notes TEXT NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_store_id (store_id),
        INDEX idx_status (status),
        INDEX idx_requested_at (requested_at),
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(query);
  }

  /**
   * Create a new withdrawal request
   */
  async createWithdrawal(data: CreateWithdrawalRequest): Promise<Withdrawal> {
    const id = uuidv4();
    const now = new Date();
    const currency = data.currency || 'USD';
    const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;

    const query = `
      INSERT INTO withdrawals (
        id, store_id, amount, currency, status,
        bank_account_name, bank_account_number, bank_routing_number, bank_name,
        requested_by, requested_at, notes, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      id,
      data.storeId,
      data.amount,
      currency,
      data.bankAccountName,
      data.bankAccountNumber,
      data.bankRoutingNumber,
      data.bankName,
      data.requestedBy,
      now,
      data.notes || null,
      metadataJson,
      now,
      now,
    ]);

    const withdrawal = await this.getWithdrawalById(id);
    if (!withdrawal) throw new Error('Failed to retrieve created withdrawal');
    return withdrawal;
  }

  /**
   * Get withdrawal by ID
   */
  async getWithdrawalById(id: string): Promise<Withdrawal | null> {
    const query = `
      SELECT 
        w.*,
        s.name as store_name
      FROM withdrawals w
      LEFT JOIN stores s ON w.store_id = s.id
      WHERE w.id = ?
    `;

    const [rows] = await pool.execute(query, [id]);
    const row = (rows as any[])[0];

    if (!row) return null;

    return this.mapRowToWithdrawal(row);
  }

  /**
   * Get withdrawals with filters
   */
  async getWithdrawals(filters: WithdrawalFilters = {}): Promise<Withdrawal[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.storeId) {
      conditions.push('w.store_id = ?');
      params.push(filters.storeId);
    }
    if (filters.status) {
      conditions.push('w.status = ?');
      params.push(filters.status);
    }
    if (filters.requestedBy) {
      conditions.push('w.requested_by = ?');
      params.push(filters.requestedBy);
    }
    if (filters.startDate) {
      conditions.push('w.requested_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('w.requested_at <= ?');
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Ensure limit and offset are always valid numbers
    let limit: number;
    if (typeof filters.limit === 'number' && !isNaN(filters.limit) && filters.limit > 0) {
      limit = filters.limit;
    } else if (filters.limit) {
      const parsed = parseInt(String(filters.limit), 10);
      limit = !isNaN(parsed) && parsed > 0 ? parsed : 100;
    } else {
      limit = 100;
    }
    
    let offset: number;
    if (typeof filters.offset === 'number' && !isNaN(filters.offset) && filters.offset >= 0) {
      offset = filters.offset;
    } else if (filters.offset) {
      const parsed = parseInt(String(filters.offset), 10);
      offset = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    } else {
      offset = 0;
    }

    // Use direct number interpolation for LIMIT and OFFSET to avoid mysql2 parameter issues
    // This is safe because limit and offset are already validated as numbers
    const query = `
      SELECT 
        w.*,
        s.name as store_name
      FROM withdrawals w
      LEFT JOIN stores s ON w.store_id = s.id
      ${whereClause}
      ORDER BY w.requested_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    try {
      console.log(`[WithdrawalModel] Executing query:`, {
        query: query.replace(/\s+/g, ' ').trim(),
        params: params,
        paramsCount: params.length,
        limit,
        offset,
        filters,
      });
      
      const [rows] = await pool.execute(query, params);
      const rowsArray = rows as any[];
      console.log(`[WithdrawalModel] Raw rows from database:`, {
        count: rowsArray.length,
        firstRow: rowsArray.length > 0 ? rowsArray[0] : null,
      });
      
      const withdrawals = rowsArray.map(row => this.mapRowToWithdrawal(row));
      const firstWithdrawal = withdrawals.length > 0 ? withdrawals[0] : null;
      console.log(`[WithdrawalModel] Mapped withdrawals:`, {
        count: withdrawals.length,
        firstWithdrawal: firstWithdrawal ? {
          id: firstWithdrawal.id,
          storeId: firstWithdrawal.storeId,
          amount: firstWithdrawal.amount,
          status: firstWithdrawal.status,
        } : null,
      });
      
      return withdrawals;
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      return [];
    }
  }

  /**
   * Get withdrawals by store ID
   */
  async getWithdrawalsByStoreId(storeId: string, limit: number = 50): Promise<Withdrawal[]> {
    return this.getWithdrawals({ storeId, limit });
  }

  /**
   * Update withdrawal
   */
  async updateWithdrawal(id: string, data: UpdateWithdrawalRequest): Promise<Withdrawal | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }
    if (data.approvedBy !== undefined) {
      fields.push('approved_by = ?');
      params.push(data.approvedBy);
      if (data.status === 'approved' || data.status === 'processing' || data.status === 'completed') {
        fields.push('approved_at = ?');
        params.push(new Date());
      }
    }
    if (data.processedBy !== undefined) {
      fields.push('processed_by = ?');
      params.push(data.processedBy);
      if (data.status === 'completed') {
        fields.push('processed_at = ?');
        params.push(new Date());
      }
    }
    if (data.rejectionReason !== undefined) {
      fields.push('rejection_reason = ?');
      params.push(data.rejectionReason);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      params.push(data.notes);
    }
    if (data.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(data.metadata ? JSON.stringify(data.metadata) : null);
    }

    if (fields.length === 0) {
      return this.getWithdrawalById(id);
    }

    fields.push('updated_at = ?');
    params.push(new Date());
    params.push(id);

    const query = `
      UPDATE withdrawals
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    await pool.execute(query, params);
    return this.getWithdrawalById(id);
  }

  /**
   * Calculate store balance
   */
  async getStoreBalance(storeId: string, platformCommissionRate: number = 0.1): Promise<StoreBalance> {
    // Get store name
    const [storeRows] = await pool.execute(
      'SELECT name FROM stores WHERE id = ?',
      [storeId]
    );
    const storeName = (storeRows as any[])[0]?.name || 'Unknown Store';

    // Calculate total earnings from completed orders
    const [earningsRows] = await pool.execute(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_earnings
      FROM orders
      WHERE store_id = ? 
        AND status IN ('delivered', 'shipped')
        AND payment_intent_id IS NOT NULL
    `, [storeId]);

    const totalEarnings = parseFloat((earningsRows as any[])[0]?.total_earnings || 0);

    // Calculate platform commission
    const platformCommission = totalEarnings * platformCommissionRate;

    // Calculate total withdrawn (completed withdrawals)
    const [withdrawnRows] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) as total_withdrawn
      FROM withdrawals
      WHERE store_id = ? AND status = 'completed'
    `, [storeId]);

    const totalWithdrawn = parseFloat((withdrawnRows as any[])[0]?.total_withdrawn || 0);

    // Calculate pending withdrawals
    const [pendingRows] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) as pending_withdrawals
      FROM withdrawals
      WHERE store_id = ? AND status IN ('pending', 'approved', 'processing')
    `, [storeId]);

    const pendingWithdrawals = parseFloat((pendingRows as any[])[0]?.pending_withdrawals || 0);

    // Calculate available balance
    const availableBalance = totalEarnings - platformCommission - totalWithdrawn - pendingWithdrawals;

    return {
      storeId,
      storeName,
      totalEarnings,
      totalWithdrawn,
      pendingWithdrawals,
      availableBalance: Math.max(0, availableBalance), // Don't allow negative balance
      platformCommission,
      currency: 'USD',
    };
  }

  /**
   * Map database row to Withdrawal object
   */
  private mapRowToWithdrawal(row: any): Withdrawal {
    return {
      id: row.id,
      storeId: row.store_id,
      storeName: row.store_name,
      amount: parseFloat(row.amount),
      currency: row.currency || 'USD',
      status: row.status,
      bankAccountName: row.bank_account_name,
      bankAccountNumber: row.bank_account_number,
      bankRoutingNumber: row.bank_routing_number,
      bankName: row.bank_name,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      processedBy: row.processed_by,
      processedAt: row.processed_at,
      rejectionReason: row.rejection_reason,
      notes: row.notes,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

