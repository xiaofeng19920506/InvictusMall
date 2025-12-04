import { pool } from '../src/config/database';
import { logger } from '../src/utils/logger';

/**
 * Script to clean up system logs in the database
 * Marks cleanup-related logs as 'system' type and sets userName to 'System'
 */
async function cleanupSystemLogs() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('🧹 Starting system logs cleanup...');
    
    // First, update the ENUM to include 'system' and 'order_status_updated' if not already present
    console.log('📝 Updating activity_logs table schema...');
    try {
      await connection.execute(`
        ALTER TABLE activity_logs 
        MODIFY COLUMN type ENUM('store_created', 'store_updated', 'store_deleted', 'store_verified', 'user_registered', 'user_login', 'password_reset_requested', 'password_reset_completed', 'password_changed', 'staff_registered', 'staff_invited', 'staff_login', 'profile_updated', 'avatar_uploaded', 'order_created', 'order_status_updated', 'system') NOT NULL
      `);
      console.log('✅ Database schema updated successfully');
    } catch (error: any) {
      // If the enum already has these values, that's fine
      if (error.code !== 'ER_DUP_FIELDNAME' && !error.message.includes('Duplicate')) {
        console.warn('⚠️  Schema update warning (may already be updated):', error.message);
      } else {
        console.log('✅ Schema already up to date');
      }
    }
    
    // Update logs with cleanup-related messages to 'system' type
    const cleanupMessages = [
      'Expired verification tokens and staff invitations cleaned up',
      'Cleaned up',
      'cleanup',
      'automatically cancelled',
      'Low stock alert',
      'cleanup failed',
    ];
    
    let totalUpdated = 0;
    
    // Update logs that match cleanup patterns
    for (const messagePattern of cleanupMessages) {
      const [result] = await connection.execute(
        `UPDATE activity_logs 
         SET type = 'system', user_name = 'System'
         WHERE message LIKE ? 
         AND (type != 'system' OR user_name IS NULL OR user_name != 'System')`,
        [`%${messagePattern}%`]
      );
      
      const affectedRows = (result as any).affectedRows || 0;
      totalUpdated += affectedRows;
      
      if (affectedRows > 0) {
        console.log(`✅ Updated ${affectedRows} log(s) matching pattern: "${messagePattern}"`);
      }
    }
    
    // Update logs with type 'user_registered' that have no user_name (likely system actions)
    const [result2] = await connection.execute(
      `UPDATE activity_logs 
       SET type = 'system', user_name = 'System'
       WHERE type = 'user_registered' 
       AND (user_name IS NULL OR user_name = '')
       AND (message LIKE '%cleanup%' OR message LIKE '%cleaned up%' OR message LIKE '%automatically%')`
    );
    
    const affectedRows2 = (result2 as any).affectedRows || 0;
    totalUpdated += affectedRows2;
    
    if (affectedRows2 > 0) {
      console.log(`✅ Updated ${affectedRows2} log(s) with type 'user_registered' that are system actions`);
    }
    
    // Update logs with type 'order_created' that are cleanup-related
    const [result3] = await connection.execute(
      `UPDATE activity_logs 
       SET type = 'system', user_name = 'System'
       WHERE type = 'order_created' 
       AND (user_name IS NULL OR user_name = '')
       AND (message LIKE '%automatically cancelled%' OR message LIKE '%cleanup%')`
    );
    
    const affectedRows3 = (result3 as any).affectedRows || 0;
    totalUpdated += affectedRows3;
    
    if (affectedRows3 > 0) {
      console.log(`✅ Updated ${affectedRows3} log(s) with type 'order_created' that are system actions`);
    }
    
    // Update logs with type 'store_updated' that are system alerts
    const [result4] = await connection.execute(
      `UPDATE activity_logs 
       SET type = 'system', user_name = 'System'
       WHERE type = 'store_updated' 
       AND (user_name IS NULL OR user_name = '')
       AND message LIKE '%Low stock alert%'`
    );
    
    const affectedRows4 = (result4 as any).affectedRows || 0;
    totalUpdated += affectedRows4;
    
    if (affectedRows4 > 0) {
      console.log(`✅ Updated ${affectedRows4} log(s) with type 'store_updated' that are system alerts`);
    }
    
    await connection.commit();
    
    console.log(`\n✅ System logs cleanup completed! Total logs updated: ${totalUpdated}`);
    logger.info(`System logs cleanup completed: ${totalUpdated} logs updated`);
    
  } catch (error: any) {
    await connection.rollback();
    console.error('❌ Error during system logs cleanup:', error);
    logger.error('Failed to cleanup system logs', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupSystemLogs()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { cleanupSystemLogs };

