import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST as string,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error: any) {
    console.error('Database connection test failed:', {
      code: error.code,
      errno: error.errno,
      message: error.message,
      fatal: error.fatal,
    });
    return false;
  }
};

// Initialize database schema
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Create database if it doesn't exist
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConnection.end();

    // Create tables
    await createTables();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const createTables = async (): Promise<void> => {
  const connection = await pool.getConnection();

  try {
    // Create stores table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stores (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
        review_count INT NOT NULL DEFAULT 0,
        image_url VARCHAR(500) NOT NULL,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        products_count INT NOT NULL DEFAULT 0,
        established_year INT NOT NULL,
        discount VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Ensure legacy tables also include the is_active column
    try {
      await connection.execute(`
        ALTER TABLE stores
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
      `);
    } catch (error: any) {
      // Ignore if the column already exists (ER_DUP_FIELDNAME)
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        console.warn('Unable to add is_active column to stores table:', error);
      }
    }

    // Create store_categories table (without foreign key first)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS store_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id VARCHAR(36) NOT NULL,
        category VARCHAR(100) NOT NULL,
        INDEX idx_store_id (store_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Try to add foreign key constraint (may fail if user lacks REFERENCES permission)
    try {
      await connection.execute(`
        ALTER TABLE store_categories
        ADD CONSTRAINT fk_store_categories_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      `);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEY' && error?.code !== 'ER_FK_DUP_NAME' && error?.errno !== 1142) {
        console.warn('Could not add foreign key to store_categories:', error.message);
      }
    }

    // Create store_locations table (without foreign key first)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS store_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id VARCHAR(36) NOT NULL,
        street_address VARCHAR(255) NOT NULL,
        apt_number VARCHAR(50),
        city VARCHAR(100) NOT NULL,
        state_province VARCHAR(100) NOT NULL,
        zip_code VARCHAR(20) NOT NULL,
        country VARCHAR(100) NOT NULL,
        INDEX idx_store_id (store_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Try to add foreign key constraint (may fail if user lacks REFERENCES permission)
    try {
      await connection.execute(`
        ALTER TABLE store_locations
        ADD CONSTRAINT fk_store_locations_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      `);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEY' && error?.code !== 'ER_FK_DUP_NAME' && error?.errno !== 1142) {
        console.warn('Could not add foreign key to store_locations:', error.message);
      }
    }

    // Create users table
    await connection.execute(`
              CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                role ENUM('customer', 'admin', 'store_owner') DEFAULT 'customer',
                is_active BOOLEAN DEFAULT false,
                email_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP NULL,
                INDEX idx_email (email),
                INDEX idx_role (role),
                INDEX idx_active (is_active)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

    // Create verification_tokens table (without foreign key first)
    await connection.execute(`
              CREATE TABLE IF NOT EXISTS verification_tokens (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                type ENUM('email_verification', 'password_reset') NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_token (token),
                INDEX idx_type (type),
                INDEX idx_expires_at (expires_at)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

    // Try to add foreign key constraint (may fail if user lacks REFERENCES permission)
    try {
      await connection.execute(`
        ALTER TABLE verification_tokens
        ADD CONSTRAINT fk_verification_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEY' && error?.code !== 'ER_FK_DUP_NAME' && error?.errno !== 1142) {
        console.warn('Could not add foreign key to verification_tokens:', error.message);
      }
    }

    // Create staff table for admin app users (without foreign key first)
    // First check the stores.id column definition to match it exactly for store_id
    let staffStoreIdType = 'VARCHAR(36)';
    let staffStoreIdCharset = '';
    
    try {
      const [storeColumns]: any = await connection.execute(`
        SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'stores'
        AND COLUMN_NAME = 'id'
      `);
      
      if (storeColumns && storeColumns.length > 0) {
        const storeIdCol = storeColumns[0];
        staffStoreIdType = storeIdCol.COLUMN_TYPE;
        if (storeIdCol.CHARACTER_SET_NAME) {
          staffStoreIdCharset = ` CHARACTER SET ${storeIdCol.CHARACTER_SET_NAME}`;
          if (storeIdCol.COLLATION_NAME) {
            staffStoreIdCharset += ` COLLATE ${storeIdCol.COLLATION_NAME}`;
          }
        }
      }
    } catch (error: any) {
      console.warn('Could not check stores.id column type for staff table, using default:', error.message);
    }

    await connection.execute(`
              CREATE TABLE IF NOT EXISTS staff (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                role ENUM('admin', 'owner', 'manager', 'employee') DEFAULT 'employee',
                department VARCHAR(100) NULL,
                employee_id VARCHAR(50) UNIQUE NULL,
                store_id ${staffStoreIdType}${staffStoreIdCharset} NULL,
                is_active BOOLEAN DEFAULT true,
                email_verified BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP NULL,
                created_by VARCHAR(36) NULL,
                INDEX idx_email (email),
                INDEX idx_role (role),
                INDEX idx_active (is_active),
                INDEX idx_employee_id (employee_id),
                INDEX idx_department (department),
                INDEX idx_store_id (store_id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

    // Add store_id column to existing staff table if it doesn't exist
    // Use the same type as stores.id for compatibility
    try {
      await connection.execute(`
        ALTER TABLE staff 
        ADD COLUMN store_id ${staffStoreIdType}${staffStoreIdCharset} NULL
      `);
    } catch (error: any) {
      // Ignore if the column already exists (ER_DUP_FIELDNAME)
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        // Column might already exist, continue
      } else {
        // If column exists but type might be wrong, try to modify it
        try {
          await connection.execute(`
            ALTER TABLE staff 
            MODIFY COLUMN store_id ${staffStoreIdType}${staffStoreIdCharset} NULL
          `);
        } catch (modifyError: any) {
          // Ignore modification errors
        }
      }
    }

    // Add index for store_id if it doesn't exist
    try {
      await connection.execute(`
        ALTER TABLE staff 
        ADD INDEX idx_store_id (store_id)
      `);
    } catch (error: any) {
      // Ignore if the index already exists
      if (error?.code !== 'ER_DUP_KEYNAME') {
        // Index might already exist, continue
      }
    }

    // Try to add foreign key for store_id (may fail if user lacks REFERENCES permission)
    try {
      await connection.execute(`
        ALTER TABLE staff 
        ADD CONSTRAINT fk_staff_store 
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
      `);
    } catch (error: any) {
      // If columns are incompatible, try to modify the column type to match
      if (error.code === 'ER_FK_INCOMPATIBLE_COLUMNS') {
        try {
          // Modify store_id to match stores.id exactly
          await connection.execute(`
            ALTER TABLE staff 
            MODIFY COLUMN store_id ${staffStoreIdType}${staffStoreIdCharset} NULL
          `);
          // Try adding foreign key again
          try {
            await connection.execute(`
              ALTER TABLE staff 
              ADD CONSTRAINT fk_staff_store 
              FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
            `);
          } catch (retryError: any) {
            if (retryError.code !== 'ER_DUP_KEY' && retryError.code !== 'ER_FK_DUP_NAME' && retryError.errno !== 1142) {
              console.warn('Could not add foreign key to staff after modifying column:', retryError.message);
            }
          }
        } catch (modifyError: any) {
          console.warn('Could not modify staff.store_id column type:', modifyError.message);
        }
      } else if (error?.code !== 'ER_DUP_KEY' && error?.code !== 'ER_FK_DUP_NAME' && error?.errno !== 1142) {
        console.warn('Could not add foreign key to staff:', error.message);
      }
    }

    // Create staff_invitations table (without foreign key first)
    await connection.execute(`
              CREATE TABLE IF NOT EXISTS staff_invitations (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                role ENUM('admin', 'owner', 'manager', 'employee') NOT NULL,
                department VARCHAR(100) NULL,
                employee_id VARCHAR(50) NULL,
                store_id VARCHAR(36) NULL,
                token VARCHAR(36) UNIQUE NOT NULL,
                invited_by VARCHAR(36) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_token (token),
                INDEX idx_expires_at (expires_at),
                INDEX idx_is_used (is_used),
                INDEX idx_store_id (store_id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

    // Try to add foreign key constraint (may fail if user lacks REFERENCES permission)
    try {
      await connection.execute(`
        ALTER TABLE staff_invitations
        ADD CONSTRAINT fk_staff_invitations_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
      `);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEY' && error?.code !== 'ER_FK_DUP_NAME' && error?.errno !== 1142) {
        console.warn('Could not add foreign key to staff_invitations:', error.message);
      }
    }

    // Create activity_logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('store_created', 'store_updated', 'store_deleted', 'store_verified', 'user_registered', 'user_login', 'password_reset_requested', 'password_reset_completed', 'password_changed', 'staff_registered', 'staff_invited', 'staff_login', 'profile_updated', 'avatar_uploaded', 'order_created') NOT NULL,
        message TEXT NOT NULL,
        store_name VARCHAR(255) NULL,
        store_id VARCHAR(36) NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_store_id (store_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Update existing activity_logs table to include new enum values
    try {
      await connection.execute(`
                ALTER TABLE activity_logs 
                MODIFY COLUMN type ENUM('store_created', 'store_updated', 'store_deleted', 'store_verified', 'user_registered', 'user_login', 'password_reset_requested', 'password_reset_completed', 'password_changed', 'staff_registered', 'staff_invited', 'staff_login', 'profile_updated', 'avatar_uploaded', 'order_created') NOT NULL
              `);
    } catch (error) {
      // Table might not exist or already have the correct enum values
    }

    // Add user_id and user_name columns to activity_logs table if they don't exist
    try {
      await connection.execute(`
        ALTER TABLE activity_logs 
        ADD COLUMN user_id VARCHAR(36) NULL,
        ADD COLUMN user_name VARCHAR(255) NULL,
        ADD INDEX idx_user_id (user_id)
      `);
    } catch (error: any) {
      // Column might already exist
      if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_DUP_KEYNAME') {
        console.warn('Error adding user columns to activity_logs:', error.message);
      }
    }

    // Update existing users table to allow null passwords and add avatar field
    try {
      await connection.execute(`
                ALTER TABLE users 
                MODIFY COLUMN password VARCHAR(255) NULL,
                MODIFY COLUMN is_active BOOLEAN DEFAULT false
              `);
    } catch (error) {
      // Table might not exist or already have the correct schema
    }

    // Add avatar column to users table if it doesn't exist
    try {
      await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN avatar VARCHAR(500) NULL
              `);
    } catch (error: any) {
      // Column might already exist
    }

    // Create shipping_addresses table (without foreign key first)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS shipping_addresses (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        label VARCHAR(100) NULL,
        full_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        street_address VARCHAR(255) NOT NULL,
        apt_number VARCHAR(50) NULL,
        city VARCHAR(100) NOT NULL,
        state_province VARCHAR(100) NOT NULL,
        zip_code VARCHAR(20) NOT NULL,
        country VARCHAR(100) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_is_default (is_default)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Try to add foreign key constraint (may fail if user lacks REFERENCES permission)
    try {
      await connection.execute(`
        ALTER TABLE shipping_addresses
        ADD CONSTRAINT fk_shipping_addresses_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEY' && error?.code !== 'ER_FK_DUP_NAME' && error?.errno !== 1142) {
        console.warn('Could not add foreign key to shipping_addresses:', error.message);
      }
    }

    // Add label column to existing shipping_addresses table if it doesn't exist
    try {
      await connection.execute(`
        ALTER TABLE shipping_addresses 
        ADD COLUMN label VARCHAR(100) NULL
      `);
    } catch (error: any) {
      // Column might already exist
    }

    // Add store_id column to existing staff_invitations table if it doesn't exist
    try {
      // First, check if the column exists and get stores.id column definition
      const [storeColumns]: any = await connection.execute(`
        SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'stores'
        AND COLUMN_NAME = 'id'
      `);
      
      let storeIdType = 'VARCHAR(36)';
      let charsetClause = '';
      
      if (storeColumns && storeColumns.length > 0) {
        const storeIdCol = storeColumns[0];
        // Use the same type as stores.id
        storeIdType = storeIdCol.COLUMN_TYPE;
        if (storeIdCol.CHARACTER_SET_NAME) {
          charsetClause = ` CHARACTER SET ${storeIdCol.CHARACTER_SET_NAME}`;
          if (storeIdCol.COLLATION_NAME) {
            charsetClause += ` COLLATE ${storeIdCol.COLLATION_NAME}`;
          }
        }
      }
      
      // Add column if it doesn't exist
      try {
        await connection.execute(`
          ALTER TABLE staff_invitations 
          ADD COLUMN store_id ${storeIdType}${charsetClause} NULL
        `);
      } catch (error: any) {
        if (error.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
      
      // Add index if it doesn't exist
      try {
        await connection.execute(`
          ALTER TABLE staff_invitations 
          ADD INDEX idx_store_id (store_id)
        `);
      } catch (error: any) {
        if (error.code !== 'ER_DUP_KEYNAME') {
          throw error;
        }
      }
      
      // Try to add foreign key if it doesn't exist (may fail if user lacks REFERENCES permission)
      try {
        await connection.execute(`
          ALTER TABLE staff_invitations 
          ADD CONSTRAINT fk_staff_invitations_store_id
          FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
        `);
      } catch (error: any) {
        // If columns are incompatible, try to modify the column type to match
        if (error.code === 'ER_FK_INCOMPATIBLE_COLUMNS') {
          // Modify store_id to match stores.id exactly
          await connection.execute(`
            ALTER TABLE staff_invitations 
            MODIFY COLUMN store_id ${storeIdType}${charsetClause} NULL
          `);
          // Try adding foreign key again
          try {
            await connection.execute(`
              ALTER TABLE staff_invitations 
              ADD CONSTRAINT fk_staff_invitations_store_id
              FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
            `);
          } catch (retryError: any) {
            if (retryError.code !== 'ER_DUP_KEY' && retryError.code !== 'ER_FK_DUP_NAME' && retryError.errno !== 1142) {
              throw retryError;
            }
          }
        } else if (error.code !== 'ER_DUP_KEY' && error.code !== 'ER_FK_DUP_NAME' && error.errno !== 1142) {
          throw error;
        }
      }
    } catch (error: any) {
      // Column might already exist (ER_DUP_FIELDNAME) or foreign key might exist (ER_DUP_KEYNAME)
      if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_DUP_KEYNAME') {
        console.error('Error adding store_id to staff_invitations:', error);
      }
    }

    // Create store_transactions table
    // First check the stores.id column definition to match it exactly
    try {
      const [storeColumns]: any = await connection.execute(`
        SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'stores'
        AND COLUMN_NAME = 'id'
      `);
      
      let storeIdType = 'VARCHAR(36)';
      let charsetClause = '';
      
      if (storeColumns && storeColumns.length > 0) {
        const storeIdCol = storeColumns[0];
        storeIdType = storeIdCol.COLUMN_TYPE;
        if (storeIdCol.CHARACTER_SET_NAME) {
          charsetClause = ` CHARACTER SET ${storeIdCol.CHARACTER_SET_NAME}`;
          if (storeIdCol.COLLATION_NAME) {
            charsetClause += ` COLLATE ${storeIdCol.COLLATION_NAME}`;
          }
        }
      }
      
      // Create table without foreign key first
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS store_transactions (
          id VARCHAR(36) PRIMARY KEY,
          store_id ${storeIdType}${charsetClause} NOT NULL,
          transaction_type ENUM('sale', 'refund', 'payment', 'fee', 'commission') NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD',
          description TEXT,
          customer_id VARCHAR(36) NULL,
          customer_name VARCHAR(255) NULL,
          order_id VARCHAR(36) NULL,
          payment_method VARCHAR(50) NULL,
          status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
          transaction_date TIMESTAMP NOT NULL,
          created_by VARCHAR(36) NULL,
          metadata JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_store_id (store_id),
          INDEX idx_transaction_type (transaction_type),
          INDEX idx_status (status),
          INDEX idx_transaction_date (transaction_date),
          INDEX idx_customer_id (customer_id),
          INDEX idx_order_id (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Try to add foreign key separately (may fail if user lacks REFERENCES permission)
      try {
        await connection.execute(`
          ALTER TABLE store_transactions
          ADD CONSTRAINT fk_store_transactions_store
          FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
        `);
      } catch (error: any) {
        // Foreign key might already exist or user lacks REFERENCES permission, ignore if it does
        if (error.code !== 'ER_DUP_KEY' && error.code !== 'ER_FK_DUP_NAME' && error.errno !== 1142) {
          console.warn('Could not add foreign key to store_transactions:', error.message);
        }
      }
    } catch (error: any) {
      // If we can't check the stores table, create with default type
      console.warn('Could not check stores.id column type, using default:', error.message);
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS store_transactions (
          id VARCHAR(36) PRIMARY KEY,
          store_id VARCHAR(36) NOT NULL,
          transaction_type ENUM('sale', 'refund', 'payment', 'fee', 'commission') NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD',
          description TEXT,
          customer_id VARCHAR(36) NULL,
          customer_name VARCHAR(255) NULL,
          order_id VARCHAR(36) NULL,
          payment_method VARCHAR(50) NULL,
          status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
          transaction_date TIMESTAMP NOT NULL,
          created_by VARCHAR(36) NULL,
          metadata JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_store_id (store_id),
          INDEX idx_transaction_type (transaction_type),
          INDEX idx_status (status),
          INDEX idx_transaction_date (transaction_date),
          INDEX idx_customer_id (customer_id),
          INDEX idx_order_id (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // Initialize OrderModel tables
    const { OrderModel } = await import('../models/OrderModel');
    const orderModel = new OrderModel();
    await orderModel.createOrdersTable();

  } finally {
    connection.release();
  }
};



