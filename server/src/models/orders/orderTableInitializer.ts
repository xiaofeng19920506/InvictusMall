import { Pool } from 'mysql2/promise';

export class OrderTableInitializer {
  constructor(private pool: Pool) {}

  async createOrdersTable(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      // Create orders table
      const ordersTableQuery = `
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          store_id VARCHAR(36) NOT NULL,
          store_name VARCHAR(255) NOT NULL,
          total_amount DECIMAL(10, 2) NOT NULL,
          status ENUM('pending_payment', 'pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
          shipping_street_address VARCHAR(255) NOT NULL,
          shipping_apt_number VARCHAR(50) NULL,
          shipping_city VARCHAR(100) NOT NULL,
          shipping_state_province VARCHAR(100) NOT NULL,
          shipping_zip_code VARCHAR(20) NOT NULL,
          shipping_country VARCHAR(100) NOT NULL,
          payment_method VARCHAR(100) NOT NULL,
          stripe_session_id VARCHAR(255) NULL,
          order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          shipped_date TIMESTAMP NULL,
          delivered_date TIMESTAMP NULL,
          tracking_number VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_store_id (store_id),
          INDEX idx_status (status),
          INDEX idx_order_date (order_date),
          INDEX idx_stripe_session (stripe_session_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;

      await connection.execute(ordersTableQuery);

      try {
        await connection.execute(
          `ALTER TABLE orders MODIFY COLUMN status ENUM('pending_payment', 'pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending'`
        );
      } catch (error: any) {
        // Ignore if status column already updated
      }

      try {
        await connection.execute(
          `ALTER TABLE orders ADD COLUMN stripe_session_id VARCHAR(255) NULL`
        );
      } catch (error: any) {
        // Ignore if column already exists
      }

      try {
        await connection.execute(
          `ALTER TABLE orders MODIFY COLUMN payment_method VARCHAR(100) NOT NULL`
        );
      } catch (error: any) {
        // Ignore if column already updated
      }

      try {
        await connection.execute(
          `ALTER TABLE orders ADD INDEX idx_stripe_session (stripe_session_id)`
        );
      } catch (error: any) {
        // Ignore if index already exists
      }

      // Add guest order support columns
      try {
        await connection.execute(
          `ALTER TABLE orders MODIFY COLUMN user_id VARCHAR(36) NULL`
        );
      } catch (error: any) {
        // Ignore if column already updated
      }

      try {
        await connection.execute(
          `ALTER TABLE orders ADD COLUMN guest_email VARCHAR(255) NULL`
        );
      } catch (error: any) {
        // Ignore if column already exists
      }

      try {
        await connection.execute(
          `ALTER TABLE orders ADD COLUMN guest_full_name VARCHAR(255) NULL`
        );
      } catch (error: any) {
        // Ignore if column already exists
      }

      try {
        await connection.execute(
          `ALTER TABLE orders ADD COLUMN guest_phone_number VARCHAR(50) NULL`
        );
      } catch (error: any) {
        // Ignore if column already exists
      }

      try {
        await connection.execute(
          `ALTER TABLE orders ADD INDEX idx_guest_email (guest_email)`
        );
      } catch (error: any) {
        // Ignore if index already exists
      }

      // Add payment_intent_id column for Payment Intents API
      try {
        await connection.execute(
          `ALTER TABLE orders ADD COLUMN payment_intent_id VARCHAR(255) NULL`
        );
      } catch (error: any) {
        // Ignore if column already exists
      }

      try {
        await connection.execute(
          `ALTER TABLE orders ADD INDEX idx_payment_intent (payment_intent_id)`
        );
      } catch (error: any) {
        // Ignore if index already exists
      }

      // Create refunds table for tracking refunds
      const refundsTableQuery = `
        CREATE TABLE IF NOT EXISTS refunds (
          id VARCHAR(36) PRIMARY KEY,
          order_id VARCHAR(36) NOT NULL,
          payment_intent_id VARCHAR(255) NOT NULL,
          refund_id VARCHAR(255) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'usd',
          reason VARCHAR(255) NULL,
          status VARCHAR(50) NOT NULL,
          refunded_by VARCHAR(36) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_order_id (order_id),
          INDEX idx_payment_intent_id (payment_intent_id),
          INDEX idx_refund_id (refund_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;

      await connection.execute(refundsTableQuery);

      // Create order_items table (without foreign key first)
      const orderItemsTableQuery = `
        CREATE TABLE IF NOT EXISTS order_items (
          id VARCHAR(36) PRIMARY KEY,
          order_id VARCHAR(36) NOT NULL,
          product_id VARCHAR(36) NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          product_image VARCHAR(500) NULL,
          quantity INT NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          subtotal DECIMAL(10, 2) NOT NULL,
          is_reservation BOOLEAN DEFAULT FALSE,
          reservation_date DATE NULL,
          reservation_time TIME NULL,
          reservation_notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_order_id (order_id),
          INDEX idx_product_id (product_id),
          INDEX idx_is_reservation (is_reservation),
          INDEX idx_reservation_date_time (reservation_date, reservation_time, product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;

      await connection.execute(orderItemsTableQuery);

      // Add reservation columns to existing order_items table if they don't exist
      try {
        await connection.execute(`
          ALTER TABLE order_items 
          ADD COLUMN is_reservation BOOLEAN DEFAULT FALSE,
          ADD COLUMN reservation_date DATE NULL,
          ADD COLUMN reservation_time TIME NULL,
          ADD COLUMN reservation_notes TEXT NULL
        `);
      } catch (error: any) {
        // Ignore if columns already exist
        if (error?.code !== 'ER_DUP_FIELDNAME') {
          console.warn('Error adding reservation columns to order_items:', error.message);
        }
      }

      // Add indexes for reservations if they don't exist
      try {
        await connection.execute(`
          ALTER TABLE order_items 
          ADD INDEX idx_is_reservation (is_reservation),
          ADD INDEX idx_reservation_date_time (reservation_date, reservation_time, product_id)
        `);
      } catch (error: any) {
        // Ignore if indexes already exist
        if (error?.code !== 'ER_DUP_KEYNAME') {
          console.warn('Error adding reservation indexes to order_items:', error.message);
        }
      }

      // Try to add foreign key constraint (may fail if user lacks REFERENCES permission)
      try {
        await connection.execute(`
          ALTER TABLE order_items
          ADD CONSTRAINT fk_order_items_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        `);
      } catch (error: any) {
        // Silently ignore if foreign key already exists or user lacks REFERENCES permission
        if (
          error?.code !== 'ER_DUP_KEY' &&
          error?.code !== 'ER_FK_DUP_NAME' &&
          error?.errno !== 1142 &&
          error?.code !== 'ER_TABLEACCESS_DENIED_ERROR'
        ) {
          console.warn('Could not add foreign key to order_items:', error.message);
        }
        // Log when REFERENCES permission is missing (but don't fail)
        if (error?.errno === 1142 || error?.code === 'ER_TABLEACCESS_DENIED_ERROR') {
          console.info('Skipping foreign key constraint for order_items (missing REFERENCES permission)');
        }
      }
    } finally {
      connection.release();
    }
  }
}

