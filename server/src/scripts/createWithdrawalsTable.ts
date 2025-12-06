import { pool } from '../config/database';
import { logger } from '../utils/logger';

async function createWithdrawalsTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    logger.info('Creating withdrawals table...');

    await connection.execute(`
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
    `);

    logger.info('✓ Withdrawals table created successfully');
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === '42S01') {
      logger.info('✓ Withdrawals table already exists');
    } else {
      logger.error('Error creating withdrawals table:', error);
      throw error;
    }
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run if called directly
if (require.main === module) {
  createWithdrawalsTable()
    .then(() => {
      logger.info('Withdrawals table creation completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Failed to create withdrawals table:', error);
      process.exit(1);
    });
}

export { createWithdrawalsTable };

