import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST as string,
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool (lazy initialization to avoid crashes if env vars are missing)
let poolInstance: mysql.Pool | null = null;

export const pool: mysql.Pool = new Proxy({} as mysql.Pool, {
  get(_target, prop) {
    if (!poolInstance) {
      try {
        poolInstance = mysql.createPool(dbConfig);
      } catch (error) {
        console.error("Failed to create database pool:", error);
        throw error;
      }
    }
    const value = (poolInstance as any)[prop];
    if (typeof value === "function") {
      return value.bind(poolInstance);
    }
    return value;
  },
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error: any) {
    console.error("Database connection test failed:", {
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
      password: dbConfig.password,
    });

    await tempConnection.execute(
      `CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`
    );
    await tempConnection.end();

    // Create tables
    await createTables();

    // Assign orphaned stores to admin
    await assignOrphanedStoresToAdmin();
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
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
      if (error?.code !== "ER_DUP_FIELDNAME") {
        console.warn("Unable to add is_active column to stores table:", error);
      }
    }

    // Create store_categories table (without foreign key first)
    // First check the stores.id column definition to match it exactly
    try {
      const [storeColumns]: any = await connection.execute(`
        SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'stores'
        AND COLUMN_NAME = 'id'
      `);

      let storeIdType = "VARCHAR(36)";
      let charsetClause = "";

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

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS store_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          store_id ${storeIdType}${charsetClause} NOT NULL,
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
        // If columns are incompatible, try to modify the column type to match
        if (error.code === "ER_FK_INCOMPATIBLE_COLUMNS") {
          // Modify store_id to match stores.id exactly
          await connection.execute(`
            ALTER TABLE store_categories 
            MODIFY COLUMN store_id ${storeIdType}${charsetClause} NOT NULL
          `);
          // Try adding foreign key again
          try {
            await connection.execute(`
              ALTER TABLE store_categories
              ADD CONSTRAINT fk_store_categories_store
              FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
            `);
          } catch (retryError: any) {
            if (
              retryError.code !== "ER_DUP_KEY" &&
              retryError.code !== "ER_FK_DUP_NAME" &&
              retryError.errno !== 1142 &&
              retryError.code !== "ER_TABLEACCESS_DENIED_ERROR"
            ) {
              console.warn(
                "Could not add foreign key to store_categories after modification:",
                retryError.message
              );
            }
            if (
              retryError.errno === 1142 ||
              retryError.code === "ER_TABLEACCESS_DENIED_ERROR"
            ) {
              console.info(
                "Skipping foreign key constraint for store_categories (missing REFERENCES permission)"
              );
            }
          }
        } else if (
          error?.code !== "ER_DUP_KEY" &&
          error?.code !== "ER_FK_DUP_NAME" &&
          error?.errno !== 1142 &&
          error?.code !== "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.warn(
            "Could not add foreign key to store_categories:",
            error.message
          );
        }
        // Log when REFERENCES permission is missing (but don't fail)
        if (
          error?.errno === 1142 ||
          error?.code === "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.info(
            "Skipping foreign key constraint for store_categories (missing REFERENCES permission)"
          );
        }
      }
    } catch (error: any) {
      // If we can't check the stores table, create with default type
      console.warn(
        "Could not check stores.id column type for store_categories, using default:",
        error.message
      );
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS store_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          store_id VARCHAR(36) NOT NULL,
          category VARCHAR(100) NOT NULL,
          INDEX idx_store_id (store_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // Create store_locations table (without foreign key first)
    // First check the stores.id column definition to match it exactly
    try {
      const [storeColumns]: any = await connection.execute(`
        SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'stores'
        AND COLUMN_NAME = 'id'
      `);

      let storeIdType = "VARCHAR(36)";
      let charsetClause = "";

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

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS store_locations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          store_id ${storeIdType}${charsetClause} NOT NULL,
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
        // If columns are incompatible, try to modify the column type to match
        if (error.code === "ER_FK_INCOMPATIBLE_COLUMNS") {
          // Modify store_id to match stores.id exactly
          await connection.execute(`
            ALTER TABLE store_locations 
            MODIFY COLUMN store_id ${storeIdType}${charsetClause} NOT NULL
          `);
          // Try adding foreign key again
          try {
            await connection.execute(`
              ALTER TABLE store_locations
              ADD CONSTRAINT fk_store_locations_store
              FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
            `);
          } catch (retryError: any) {
            if (
              retryError.code !== "ER_DUP_KEY" &&
              retryError.code !== "ER_FK_DUP_NAME" &&
              retryError.errno !== 1142 &&
              retryError.code !== "ER_TABLEACCESS_DENIED_ERROR"
            ) {
              console.warn(
                "Could not add foreign key to store_locations after modification:",
                retryError.message
              );
            }
            if (
              retryError.errno === 1142 ||
              retryError.code === "ER_TABLEACCESS_DENIED_ERROR"
            ) {
              console.info(
                "Skipping foreign key constraint for store_locations (missing REFERENCES permission)"
              );
            }
          }
        } else if (
          error?.code !== "ER_DUP_KEY" &&
          error?.code !== "ER_FK_DUP_NAME" &&
          error?.errno !== 1142 &&
          error?.code !== "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.warn(
            "Could not add foreign key to store_locations:",
            error.message
          );
        }
        // Log when REFERENCES permission is missing (but don't fail)
        if (
          error?.errno === 1142 ||
          error?.code === "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.info(
            "Skipping foreign key constraint for store_locations (missing REFERENCES permission)"
          );
        }
      }
    } catch (error: any) {
      // If we can't check the stores table, create with default type
      console.warn(
        "Could not check stores.id column type for store_locations, using default:",
        error.message
      );
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
                role ENUM('customer') DEFAULT 'customer',
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
      // Silently ignore if foreign key already exists or user lacks REFERENCES permission
      if (
        error?.code !== "ER_DUP_KEY" &&
        error?.code !== "ER_FK_DUP_NAME" &&
        error?.errno !== 1142 &&
        error?.code !== "ER_TABLEACCESS_DENIED_ERROR"
      ) {
        console.warn(
          "Could not add foreign key to verification_tokens:",
          error.message
        );
      }
      // Log when REFERENCES permission is missing (but don't fail)
      if (
        error?.errno === 1142 ||
        error?.code === "ER_TABLEACCESS_DENIED_ERROR"
      ) {
        console.info(
          "Skipping foreign key constraint for verification_tokens (missing REFERENCES permission)"
        );
      }
    }

    // Create staff table for admin app users (without foreign key first)
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
                store_id VARCHAR(36) NULL,
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
    try {
      await connection.execute(`
        ALTER TABLE staff 
        ADD COLUMN store_id VARCHAR(36) NULL
      `);
    } catch (error: any) {
      // Ignore if the column already exists (ER_DUP_FIELDNAME)
      if (error?.code !== "ER_DUP_FIELDNAME") {
        // Column might already exist, continue
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
      if (error?.code !== "ER_DUP_KEYNAME") {
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
      // Ignore if the foreign key already exists or user lacks REFERENCES permission
      if (
        error?.code !== "ER_DUP_KEY" &&
        error?.code !== "ER_FK_DUP_NAME" &&
        error?.errno !== 1142 &&
        error?.code !== "ER_TABLEACCESS_DENIED_ERROR"
      ) {
        console.warn("Could not add foreign key to staff:", error.message);
      }
      // Log when REFERENCES permission is missing (but don't fail)
      if (
        error?.errno === 1142 ||
        error?.code === "ER_TABLEACCESS_DENIED_ERROR"
      ) {
        console.info(
          "Skipping foreign key constraint for staff (missing REFERENCES permission)"
        );
      }
    }

    // Create staff_invitations table (without foreign key first)
    // First check the stores.id column definition to match it exactly
    try {
      const [storeColumns]: any = await connection.execute(`
        SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'stores'
        AND COLUMN_NAME = 'id'
      `);

      let storeIdType = "VARCHAR(36)";
      let charsetClause = "";

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

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS staff_invitations (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          role ENUM('admin', 'owner', 'manager', 'employee') NOT NULL,
          department VARCHAR(100) NULL,
          employee_id VARCHAR(50) NULL,
          store_id ${storeIdType}${charsetClause} NULL,
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
        // If columns are incompatible, try to modify the column type to match
        if (error.code === "ER_FK_INCOMPATIBLE_COLUMNS") {
          // Modify store_id to match stores.id exactly
          await connection.execute(`
            ALTER TABLE staff_invitations 
            MODIFY COLUMN store_id ${storeIdType}${charsetClause} NULL
          `);
          // Try adding foreign key again
          try {
            await connection.execute(`
              ALTER TABLE staff_invitations
              ADD CONSTRAINT fk_staff_invitations_store
              FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
            `);
          } catch (retryError: any) {
            if (
              retryError.code !== "ER_DUP_KEY" &&
              retryError.code !== "ER_FK_DUP_NAME" &&
              retryError.errno !== 1142 &&
              retryError.code !== "ER_TABLEACCESS_DENIED_ERROR"
            ) {
              console.warn(
                "Could not add foreign key to staff_invitations after modification:",
                retryError.message
              );
            }
            if (
              retryError.errno === 1142 ||
              retryError.code === "ER_TABLEACCESS_DENIED_ERROR"
            ) {
              console.info(
                "Skipping foreign key constraint for staff_invitations (missing REFERENCES permission)"
              );
            }
          }
        } else if (
          error?.code !== "ER_DUP_KEY" &&
          error?.code !== "ER_FK_DUP_NAME" &&
          error?.errno !== 1142 &&
          error?.code !== "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.warn(
            "Could not add foreign key to staff_invitations:",
            error.message
          );
        }
        // Log when REFERENCES permission is missing (but don't fail)
        if (
          error?.errno === 1142 ||
          error?.code === "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.info(
            "Skipping foreign key constraint for staff_invitations (missing REFERENCES permission)"
          );
        }
      }
    } catch (error: any) {
      // If we can't check the stores table, create with default type
      console.warn(
        "Could not check stores.id column type for staff_invitations, using default:",
        error.message
      );
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
      if (
        error.code !== "ER_DUP_FIELDNAME" &&
        error.code !== "ER_DUP_KEYNAME"
      ) {
        console.warn(
          "Error adding user columns to activity_logs:",
          error.message
        );
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
      // Silently ignore if foreign key already exists or user lacks REFERENCES permission
      if (
        error?.code !== "ER_DUP_KEY" &&
        error?.code !== "ER_FK_DUP_NAME" &&
        error?.errno !== 1142 &&
        error?.code !== "ER_TABLEACCESS_DENIED_ERROR"
      ) {
        console.warn(
          "Could not add foreign key to shipping_addresses:",
          error.message
        );
      }
      // Log when REFERENCES permission is missing (but don't fail)
      if (
        error?.errno === 1142 ||
        error?.code === "ER_TABLEACCESS_DENIED_ERROR"
      ) {
        console.info(
          "Skipping foreign key constraint for shipping_addresses (missing REFERENCES permission)"
        );
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

      let storeIdType = "VARCHAR(36)";
      let charsetClause = "";

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
        if (error.code !== "ER_DUP_FIELDNAME") {
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
        if (error.code !== "ER_DUP_KEYNAME") {
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
        if (error.code === "ER_FK_INCOMPATIBLE_COLUMNS") {
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
            if (
              retryError.code !== "ER_DUP_KEY" &&
              retryError.code !== "ER_FK_DUP_NAME" &&
              retryError.errno !== 1142 &&
              retryError.code !== "ER_TABLEACCESS_DENIED_ERROR"
            ) {
              throw retryError;
            }
            if (
              retryError.errno === 1142 ||
              retryError.code === "ER_TABLEACCESS_DENIED_ERROR"
            ) {
              console.info(
                "Skipping foreign key constraint for staff_invitations.store_id (missing REFERENCES permission)"
              );
            }
          }
        } else if (
          error.code !== "ER_DUP_KEY" &&
          error.code !== "ER_FK_DUP_NAME" &&
          error.errno !== 1142 &&
          error.code !== "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          throw error;
        } else if (
          error.errno === 1142 ||
          error.code === "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.info(
            "Skipping foreign key constraint for staff_invitations.store_id (missing REFERENCES permission)"
          );
        }
      }
    } catch (error: any) {
      // Column might already exist (ER_DUP_FIELDNAME) or foreign key might exist (ER_DUP_KEYNAME)
      if (
        error.code !== "ER_DUP_FIELDNAME" &&
        error.code !== "ER_DUP_KEYNAME"
      ) {
        console.error("Error adding store_id to staff_invitations:", error);
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

      let storeIdType = "VARCHAR(36)";
      let charsetClause = "";

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
        if (
          error.code !== "ER_DUP_KEY" &&
          error.code !== "ER_FK_DUP_NAME" &&
          error.errno !== 1142 &&
          error.code !== "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.warn(
            "Could not add foreign key to store_transactions:",
            error.message
          );
        }
        // Log when REFERENCES permission is missing (but don't fail)
        if (
          error.errno === 1142 ||
          error.code === "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.info(
            "Skipping foreign key constraint for store_transactions (missing REFERENCES permission)"
          );
        }
      }
    } catch (error: any) {
      // If we can't check the stores table, create with default type
      console.warn(
        "Could not check stores.id column type, using default:",
        error.message
      );
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
    const { OrderModel } = await import("../models/OrderModel");
    const orderModel = new OrderModel();
    await orderModel.createOrdersTable();

    // Initialize StockOperationModel tables
    const { StockOperationModel } = await import("../models/StockOperationModel");
    const stockOperationModel = new StockOperationModel();
    await stockOperationModel.initializeTable();


    // Create products table
    // First check the stores.id column definition to match it exactly
    try {
      const [storeColumns]: any = await connection.execute(`
        SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'stores'
        AND COLUMN_NAME = 'id'
      `);

      let storeIdType = "VARCHAR(36)";
      let charsetClause = "";

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
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(36) PRIMARY KEY,
          store_id ${storeIdType}${charsetClause} NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          image_url VARCHAR(500),
          image_urls JSON,
          stock_quantity INT NOT NULL DEFAULT 0,
          category VARCHAR(100),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_store_id (store_id),
          INDEX idx_category (category),
          INDEX idx_is_active (is_active),
          INDEX idx_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Add image_urls column if it doesn't exist (migration)
      try {
        await connection.execute(`
          ALTER TABLE products 
          ADD COLUMN image_urls JSON NULL AFTER image_url
        `);
        console.log("✅ Added image_urls column to products table");
      } catch (error: any) {
        if (error.code !== "ER_DUP_FIELDNAME") {
          console.warn("Could not add image_urls column:", error.message);
        }
      }

      // Add barcode column if it doesn't exist (migration)
      try {
        await connection.execute(`
          ALTER TABLE products 
          ADD COLUMN barcode VARCHAR(255) NULL AFTER name
        `);
        console.log("✅ Added barcode column to products table");
      } catch (error: any) {
        if (error.code !== "ER_DUP_FIELDNAME") {
          console.warn("Could not add barcode column:", error.message);
        }
      }

      // Add barcode index if it doesn't exist
      try {
        await connection.execute(`
          ALTER TABLE products 
          ADD INDEX idx_barcode (barcode)
        `);
        console.log("✅ Added barcode index to products table");
      } catch (error: any) {
        if (error.code !== "ER_DUP_KEYNAME") {
          console.warn("Could not add barcode index:", error.message);
        }
      }

      // Try to add foreign key separately (may fail if user lacks REFERENCES permission)
      try {
        await connection.execute(`
          ALTER TABLE products
          ADD CONSTRAINT fk_products_store
          FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
        `);
      } catch (error: any) {
        // Foreign key might already exist or user lacks REFERENCES permission, ignore if it does
        if (
          error.code !== "ER_DUP_KEY" &&
          error.code !== "ER_FK_DUP_NAME" &&
          error.errno !== 1142 &&
          error.code !== "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.warn("Could not add foreign key to products:", error.message);
        }
        // Log when REFERENCES permission is missing (but don't fail)
        if (
          error.errno === 1142 ||
          error.code === "ER_TABLEACCESS_DENIED_ERROR"
        ) {
          console.info(
            "Skipping foreign key constraint for products (missing REFERENCES permission)"
          );
        }
      }
    } catch (error: any) {
      // If we can't check the stores table, create with default type
      console.warn(
        "Could not check stores.id column type for products, using default:",
        error.message
      );
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(36) PRIMARY KEY,
          store_id VARCHAR(36) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          image_url VARCHAR(500),
          image_urls JSON,
          stock_quantity INT NOT NULL DEFAULT 0,
          category VARCHAR(100),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_store_id (store_id),
          INDEX idx_category (category),
          INDEX idx_is_active (is_active),
          INDEX idx_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Add image_urls column if it doesn't exist (migration)
      try {
        await connection.execute(`
          ALTER TABLE products 
          ADD COLUMN image_urls JSON NULL AFTER image_url
        `);
        console.log("✅ Added image_urls column to products table");
      } catch (error: any) {
        if (error.code !== "ER_DUP_FIELDNAME") {
          console.warn("Could not add image_urls column:", error.message);
        }
      }

      // Add barcode column if it doesn't exist (migration)
      try {
        await connection.execute(`
          ALTER TABLE products 
          ADD COLUMN barcode VARCHAR(255) NULL AFTER name
        `);
        console.log("✅ Added barcode column to products table");
      } catch (error: any) {
        if (error.code !== "ER_DUP_FIELDNAME") {
          console.warn("Could not add barcode column:", error.message);
        }
      }

      // Add barcode index if it doesn't exist
      try {
        await connection.execute(`
          ALTER TABLE products 
          ADD INDEX idx_barcode (barcode)
        `);
        console.log("✅ Added barcode index to products table");
      } catch (error: any) {
        if (error.code !== "ER_DUP_KEYNAME") {
          console.warn("Could not add barcode index:", error.message);
        }
      }

    }

    // Create categories table for hierarchical categories (3 levels)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT NULL,
        parent_id VARCHAR(36) NULL,
        level INT NOT NULL DEFAULT 1,
        display_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_parent_id (parent_id),
        INDEX idx_level (level),
        INDEX idx_slug (slug),
        INDEX idx_is_active (is_active),
        INDEX idx_display_order (display_order),
        CONSTRAINT chk_max_level CHECK (level <= 3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Try to add foreign key constraint for parent_id (self-referencing)
    try {
      await connection.execute(`
        ALTER TABLE categories
        ADD CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
      `);
    } catch (error: any) {
      // Silently ignore if foreign key already exists or user lacks REFERENCES permission
      if (
        error?.code !== "ER_DUP_KEY" &&
        error?.code !== "ER_FK_DUP_NAME" &&
        error?.errno !== 1142 &&
        error?.code !== "ER_TABLEACCESS_DENIED_ERROR"
      ) {
        console.warn("Could not add foreign key to categories:", error.message);
      }
      if (
        error?.errno === 1142 ||
        error?.code === "ER_TABLEACCESS_DENIED_ERROR"
      ) {
        console.info(
          "Skipping foreign key constraint for categories (missing REFERENCES permission)"
        );
      }
    }

    // Migration: Update all user roles to 'customer' (users can only be customers)
    try {
      // Update any existing 'admin' or 'owner' values to 'customer'
      await connection.execute(`
        UPDATE users 
        SET role = 'customer' 
        WHERE role IN ('admin', 'owner', 'store_owner')
      `);
      console.log("✅ Migrated all user roles to 'customer' in users table");
    } catch (error: any) {
      // Ignore if table doesn't exist or column doesn't exist
      if (error?.code !== "ER_NO_SUCH_TABLE" && error?.code !== "ER_BAD_FIELD_ERROR") {
        console.warn("Could not migrate user roles to customer:", error.message);
      }
    }

    // Modify the ENUM to only allow 'customer' role for users
    try {
      await connection.execute(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('customer') DEFAULT 'customer'
      `);
      console.log("✅ Updated users.role ENUM to only allow 'customer' role");
    } catch (error: any) {
      // Ignore if table doesn't exist or if the change is already applied
      if (error?.code !== "ER_NO_SUCH_TABLE" && error?.code !== "ER_DUP_FIELDNAME") {
        console.warn("Could not modify users.role ENUM:", error.message);
      }
    }

    // ========== Amazon-Style Features: Core Tables ==========
    
    // Create product_reviews table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36),
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        is_verified_purchase BOOLEAN DEFAULT FALSE,
        helpful_count INT DEFAULT 0,
        images JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        INDEX idx_user_id (user_id),
        INDEX idx_rating (rating),
        INDEX idx_created_at (created_at),
        UNIQUE KEY unique_user_product (user_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create review_helpful_votes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS review_helpful_votes (
        id VARCHAR(36) PRIMARY KEY,
        review_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        is_helpful BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_review (user_id, review_id),
        INDEX idx_review_id (review_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create wishlists table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS wishlists (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL DEFAULT 'My Wishlist',
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create wishlist_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id VARCHAR(36) PRIMARY KEY,
        wishlist_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        INDEX idx_wishlist_id (wishlist_id),
        INDEX idx_product_id (product_id),
        UNIQUE KEY unique_wishlist_product (wishlist_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create browse_history table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS browse_history (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_product_id (product_id),
        INDEX idx_viewed_at (viewed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create product_questions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_questions (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        question TEXT NOT NULL,
        helpful_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create product_answers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_answers (
        id VARCHAR(36) PRIMARY KEY,
        question_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        answer TEXT NOT NULL,
        is_seller_answer BOOLEAN DEFAULT FALSE,
        helpful_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_question_id (question_id),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create saved_payment_methods table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS saved_payment_methods (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        stripe_payment_method_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        last4 VARCHAR(4),
        brand VARCHAR(50),
        expiry_month INT,
        expiry_year INT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_stripe_payment_method_id (stripe_payment_method_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create promotions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS promotions (
        id VARCHAR(36) PRIMARY KEY,
        store_id VARCHAR(36),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        min_purchase_amount DECIMAL(10,2),
        max_discount_amount DECIMAL(10,2),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        applicable_to ENUM('all_products', 'category', 'specific_products') DEFAULT 'all_products',
        applicable_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_store_id (store_id),
        INDEX idx_is_active (is_active),
        INDEX idx_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create coupons table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coupons (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        store_id VARCHAR(36),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        min_purchase_amount DECIMAL(10,2),
        max_discount_amount DECIMAL(10,2),
        max_uses INT,
        current_uses INT DEFAULT 0,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        applicable_to ENUM('all_products', 'category', 'specific_products') DEFAULT 'all_products',
        applicable_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_store_id (store_id),
        INDEX idx_is_active (is_active),
        INDEX idx_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create user_coupons table (track which users have used which coupons)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_coupons (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        coupon_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36),
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_coupon_id (coupon_id),
        INDEX idx_order_id (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create order_cancellations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_cancellations (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        reason TEXT,
        status ENUM('pending', 'approved', 'rejected', 'refunded') DEFAULT 'pending',
        refund_amount DECIMAL(10,2),
        cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        INDEX idx_order_id (order_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create order_returns table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_returns (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        order_item_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'received', 'refunded') DEFAULT 'pending',
        refund_amount DECIMAL(10,2),
        return_tracking_number VARCHAR(255),
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        INDEX idx_order_id (order_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create product_recommendations table (for storing recommendation data)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_recommendations (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        product_id VARCHAR(36) NOT NULL,
        recommendation_type ENUM('browsing_history', 'purchase_history', 'similar_users', 'popular', 'new') NOT NULL,
        score DECIMAL(10,4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_product_id (product_id),
        INDEX idx_type (recommendation_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create permissions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS permissions (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_resource (resource),
        INDEX idx_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create role_permissions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id VARCHAR(36) PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        permission_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role_permission (role, permission_id),
        INDEX idx_role (role),
        INDEX idx_permission_id (permission_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Enhance products table with additional Amazon-style fields
    try {
      await connection.execute(`
        ALTER TABLE products
        ADD COLUMN sku VARCHAR(100),
        ADD COLUMN brand VARCHAR(255),
        ADD COLUMN weight DECIMAL(10,2),
        ADD COLUMN dimensions VARCHAR(100),
        ADD COLUMN images JSON,
        ADD COLUMN specifications JSON,
        ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00,
        ADD COLUMN review_count INT DEFAULT 0,
        ADD COLUMN view_count INT DEFAULT 0,
        ADD COLUMN purchase_count INT DEFAULT 0,
        ADD INDEX idx_sku (sku),
        ADD INDEX idx_brand (brand),
        ADD INDEX idx_average_rating (average_rating)
      `);
      console.log("✅ Enhanced products table with Amazon-style fields");
    } catch (error: any) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        console.warn("Could not enhance products table:", error.message);
      }
    }

    console.log("✅ Created all Amazon-style feature tables");
  } finally {
    connection.release();
  }
};

/**
 * Assign orphaned stores to admin users
 * This function finds stores without any owner/admin and assigns them to the first admin found
 */
export const assignOrphanedStoresToAdmin = async (): Promise<void> => {
  const connection = await pool.getConnection();

  try {
    console.log("🔍 Checking for orphaned stores (stores without owner/admin)...");

    // Find stores that don't have any associated owner or admin
    const [orphanedStores] = await connection.execute(`
      SELECT s.id, s.name
      FROM stores s
      LEFT JOIN staff st ON s.id = st.store_id AND st.role IN ('owner', 'admin') AND st.is_active = true
      WHERE st.id IS NULL
    `);

    const stores = orphanedStores as any[];
    console.log(`📊 Found ${stores.length} orphaned stores`);

    if (stores.length === 0) {
      console.log("✅ No orphaned stores found");
      return;
    }

    // Find the first admin user
    const [adminUsers] = await connection.execute(`
      SELECT id, email, first_name, last_name
      FROM staff
      WHERE role = 'admin' AND is_active = true
      ORDER BY created_at ASC
      LIMIT 1
    `);

    const admins = adminUsers as any[];
    if (admins.length === 0) {
      console.warn("⚠️ No admin users found to assign orphaned stores to");
      return;
    }

    const admin = admins[0];
    console.log(`👤 Assigning orphaned stores to admin: ${admin.email} (${admin.id})`);

    // Assign each orphaned store to the admin
    for (const store of stores) {
      console.log(`🏪 Assigning store "${store.name}" (${store.id}) to admin ${admin.email}`);

      // Update the admin's store_id to this store
      await connection.execute(
        `UPDATE staff SET store_id = ? WHERE id = ?`,
        [store.id, admin.id]
      );

      console.log(`✅ Successfully assigned store "${store.name}" to admin ${admin.email}`);
    }

    console.log(`✅ Assigned ${stores.length} orphaned stores to admin ${admin.email}`);
  } catch (error: any) {
    console.error("❌ Error assigning orphaned stores to admin:", error);
  } finally {
    connection.release();
  }
};
