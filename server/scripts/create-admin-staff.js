import { StaffModel } from '../src/models/StaffModel.js';
import { pool } from '../src/config/database.js';

async function createAdminStaff() {
  const staffModel = new StaffModel();
  
  try {
    // Check if admin already exists
    const existingAdmin = await staffModel.getStaffByEmail('admin@invictusmall.com');
    if (existingAdmin) {
      console.log('✅ Admin staff member already exists');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
      return;
    }

    // Create admin staff member
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
