import { pool } from '../config/database';
import { logger } from '../utils/logger';

async function addProductReviewReplyFields() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    logger.info('Starting database migration: addProductReviewReplyFields');

    // Add reply columns to product_reviews table
    const columnsToAdd = [
      { name: 'reply', type: 'TEXT NULL' },
      { name: 'reply_by', type: 'VARCHAR(36) NULL' },
      { name: 'reply_at', type: 'TIMESTAMP NULL' },
    ];

    for (const column of columnsToAdd) {
      try {
        await connection.execute(`
          ALTER TABLE product_reviews
          ADD COLUMN ${column.name} ${column.type}
        `);
        logger.info(`Added '${column.name}' column to 'product_reviews' table.`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          logger.info(`Column '${column.name}' already exists in 'product_reviews' table, skipping.`);
        } else {
          throw error;
        }
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
  addProductReviewReplyFields()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { addProductReviewReplyFields };

