const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkWithdrawals() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'invictus_mall',
  });

  try {
    // Check if withdrawals table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'withdrawals'
    `, [process.env.DB_NAME || 'invictus_mall']);
    
    if (tables.length === 0) {
      console.log('❌ Withdrawals table does not exist');
      return;
    }
    
    console.log('✅ Withdrawals table exists');
    
    // Get all withdrawals
    const [withdrawals] = await connection.execute(`
      SELECT 
        w.id,
        w.store_id,
        s.name as store_name,
        w.amount,
        w.status,
        w.bank_name,
        w.requested_by,
        w.requested_at,
        w.created_at
      FROM withdrawals w
      LEFT JOIN stores s ON w.store_id = s.id
      ORDER BY w.created_at DESC
    `);
    
    console.log(`\n📊 Total withdrawals: ${withdrawals.length}`);
    
    if (withdrawals.length > 0) {
      console.log('\n📋 Withdrawals list:');
      withdrawals.forEach((w, i) => {
        console.log(`\n${i + 1}. ID: ${w.id}`);
        console.log(`   Store: ${w.store_name || w.store_id}`);
        console.log(`   Amount: $${w.amount}`);
        console.log(`   Status: ${w.status}`);
        console.log(`   Bank: ${w.bank_name}`);
        console.log(`   Requested by: ${w.requested_by}`);
        console.log(`   Requested at: ${w.requested_at}`);
        console.log(`   Created at: ${w.created_at}`);
      });
    } else {
      console.log('\n⚠️  No withdrawals found in database');
    }
    
    // Check stores
    const [stores] = await connection.execute('SELECT id, name FROM stores LIMIT 10');
    console.log(`\n🏪 Stores (first 10): ${stores.length}`);
    stores.forEach(s => console.log(`   - ${s.name} (${s.id})`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkWithdrawals();
