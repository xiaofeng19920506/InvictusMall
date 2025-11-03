import { StaffModel } from '../src/models/StaffModel.js';
import { pool } from '../src/config/database.js';

async function createAdminStaff() {
  const staffModel = new StaffModel();
  
  try {
    // Check if admin already exists
    const existingAdmin = await staffModel.getStaffByEmail('admin@invictusmall.com');
    if (existingAdmin) {
      return;
    }

    // Create admin staff member
    await staffModel.createStaff({
      email: 'admin@invictusmall.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '1234567890',
      role: 'admin',
      department: 'IT',
      employeeId: 'ADMIN001'
    });
    
  } catch (error) {
    console.error('Failed to create admin staff member:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminStaff();
