import { initializeDatabase } from '../src/config/database';
import { StaffModel } from '../src/models/StaffModel';
import { pool } from '../src/config/database';

async function createAdminStaff() {
  try {
    // Initialize database schema first
    await initializeDatabase();

    const staffModel = new StaffModel();
    
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