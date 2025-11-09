import { initializeDatabase } from '../src/config/database';
import { StaffModel } from '../src/models/StaffModel';
import { pool } from '../src/config/database';

async function createAdminStaff() {
  try {
    // Initialize database schema first
    await initializeDatabase();

    const staffModel = new StaffModel();
    
    // Check if admin already exists
    const existingAdmin = await staffModel.getStaffByEmail('aaronliu05061992@gmail.com');
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin staff member
    await staffModel.createStaff({
      email: 'aaronliu05061992@gmail.com',
      password: 'Liu1141..',
      firstName: 'Aaron',
      lastName: 'Liu',
      phoneNumber: '1234567890',
      role: 'admin',
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