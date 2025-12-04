import { pool } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Migration script to add:
 * 1. condition field to products table
 * 2. condition and is_disposed fields to order_returns table
 * 3. condition field to store_product_inventory table
 */
async function addProductConditionAndReturnFields() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    logger.info('Starting migration: Adding product condition and return fields');

    // 1. Add condition field to products table
    try {
      await connection.execute(`
        ALTER TABLE products 
        ADD COLUMN condition ENUM('new', 'refurbished', 'open_box', 'used') DEFAULT 'new'
      `);
      logger.info('✓ Added condition field to products table');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.code === '42S21') {
        logger.info('✓ condition field already exists in products table');
      } else {
        throw error;
      }
    }

    // 2. Add condition and is_disposed fields to order_returns table
    try {
      await connection.execute(`
        ALTER TABLE order_returns 
        ADD COLUMN condition ENUM('new', 'refurbished', 'open_box', 'used') NULL
      `);
      logger.info('✓ Added condition field to order_returns table');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.code === '42S21') {
        logger.info('✓ condition field already exists in order_returns table');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE order_returns 
        ADD COLUMN is_disposed BOOLEAN DEFAULT FALSE
      `);
      logger.info('✓ Added is_disposed field to order_returns table');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.code === '42S21') {
        logger.info('✓ is_disposed field already exists in order_returns table');
      } else {
        throw error;
      }
    }

    // 3. Add condition field to store_product_inventory table
    try {
      await connection.execute(`
        ALTER TABLE store_product_inventory 
        ADD COLUMN condition ENUM('new', 'refurbished', 'open_box', 'used') DEFAULT 'new'
      `);
      logger.info('✓ Added condition field to store_product_inventory table');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.code === '42S21') {
        logger.info('✓ condition field already exists in store_product_inventory table');
      } else {
        throw error;
      }
    }

    // 4. Update existing records to have 'new' condition
    await connection.execute(`
      UPDATE products SET condition = 'new' WHERE condition IS NULL
    `);
    await connection.execute(`
      UPDATE store_product_inventory SET condition = 'new' WHERE condition IS NULL
    `);

    await connection.commit();
    logger.info('✓ Migration completed successfully');
  } catch (error: any) {
    await connection.rollback();
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  addProductConditionAndReturnFields()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { addProductConditionAndReturnFields };

