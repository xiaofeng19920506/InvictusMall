import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password', // Updated default password
  database: process.env.DB_NAME || 'invictus_mall',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
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
    console.log('✅ Database schema initialized successfully');
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
        products_count INT NOT NULL DEFAULT 0,
        established_year INT NOT NULL,
        discount VARCHAR(50),
        membership_type ENUM('basic', 'premium', 'platinum') NULL,
        membership_benefits JSON NULL,
        membership_discount_percentage INT NULL,
        membership_priority_support BOOLEAN NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create store_categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS store_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id VARCHAR(36) NOT NULL,
        category VARCHAR(100) NOT NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      )
    `);

    // Create store_locations table
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
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      )
    `);

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

            // Create verification_tokens table
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
                INDEX idx_expires_at (expires_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

    // Create activity_logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('store_created', 'store_updated', 'store_deleted', 'store_verified', 'user_registered', 'user_login') NOT NULL,
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
                MODIFY COLUMN type ENUM('store_created', 'store_updated', 'store_deleted', 'store_verified', 'user_registered', 'user_login') NOT NULL
              `);
            } catch (error) {
              // Table might not exist or already have the correct enum values
              console.log('Activity logs table enum update skipped:', error);
            }

            // Update existing users table to allow null passwords
            try {
              await connection.execute(`
                ALTER TABLE users 
                MODIFY COLUMN password VARCHAR(255) NULL,
                MODIFY COLUMN is_active BOOLEAN DEFAULT false
              `);
            } catch (error) {
              // Table might not exist or already have the correct schema
              console.log('Users table schema update skipped:', error);
            }

    console.log('✅ Database tables created successfully');
  } finally {
    connection.release();
  }
};
