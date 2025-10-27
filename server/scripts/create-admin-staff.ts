import { initializeDatabase } from '../src/config/database';
import { StaffModel } from '../src/models/StaffModel';
import { pool } from '../src/config/database';

async function createAdminStaff() {
  try {
    // Initialize database schema first
    console.log('🔄 Initializing database schema...');
    await initializeDatabase();
    console.log('✅ Database schema initialized');

    const staffModel = new StaffModel();
    
    // Check if admin already exists
    const existingAdmin = await staffModel.getStaffByEmail('admin@invictusmall.com');
    if (existingAdmin) {
      console.log('✅ Admin staff member already exists');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
      return;
    }

    // Create admin staff member
    console.log('🔄 Creating admin staff member...');
    const adminStaff = await staffModel.createStaff({
      email: 'admin@invictusmall.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '1234567890',
      role: 'admin',
      department: 'IT',
      employeeId: 'ADMIN001'
    });

    console.log('✅ Admin staff member created successfully');
    console.log(`ID: ${adminStaff.id}`);
    console.log(`Email: ${adminStaff.email}`);
    console.log(`Role: ${adminStaff.role}`);
    console.log(`Password: admin123`);
    
  } catch (error) {
    console.error('❌ Failed to create admin staff member:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminStaff();