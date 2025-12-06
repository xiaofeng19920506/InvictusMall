import { pool } from '../config/database';
import { logger } from '../utils/logger';

async function addProductFinalSaleField() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    logger.info('Starting database migration: addProductFinalSaleField');

    // Add 'is_final_sale' to products table
    // Default to TRUE (all products are final sale unless specified otherwise)
    try {
      await connection.execute(`
        ALTER TABLE products
        ADD COLUMN is_final_sale BOOLEAN NOT NULL DEFAULT TRUE
      `);
      logger.info("Added 'is_final_sale' column to 'products' table with default value TRUE.");
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.code === '42S21') {
        logger.info("'is_final_sale' column already exists in 'products' table.");
      } else {
        throw error;
      }
    }

    await connection.commit();
    logger.info('Database migration completed successfully.');
  } catch (error: any) {
    await connection.rollback();
    logger.error('Database migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  addProductFinalSaleField()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default addProductFinalSaleField;

