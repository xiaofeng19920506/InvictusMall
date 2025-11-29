import { pool } from '../config/database';

/**
 * Migration script to add serial_number column to products table
 */
async function addSerialNumberColumn() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Adding serial_number column to products table...');
    
    await connection.execute(`
      ALTER TABLE products 
      ADD COLUMN serial_number VARCHAR(255) NULL AFTER barcode
    `);
    
    console.log('✅ Successfully added serial_number column to products table');
  } catch (error: any) {
    // MySQL doesn't support IF NOT EXISTS for ADD COLUMN, so we check error code
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  serial_number column already exists, skipping...');
    } else {
      console.error('❌ Error adding serial_number column:', error.message);
      throw error;
    }
  } finally {
    connection.release();
    process.exit(0);
  }
}

// Run the migration
addSerialNumberColumn().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

