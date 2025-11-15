import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { StaffModel } from '../src/models/StaffModel';
import { initializeDatabase } from '../src/config/database';

async function createAdminAccount() {
  try {
    console.log('🚀 Starting admin account creation...');
    
    // Initialize database connection
    await initializeDatabase();
    console.log('✅ Database initialized');

    const staffModel = new StaffModel();
    
    const email = 'aaronliu05061992@gmail.com';
    const password = 'Liu1141..';
    const firstName = 'Aaron';
    const lastName = 'Liu';
    const phoneNumber = '1234567890'; // You can change this if needed
    const role = 'admin';

    // Check if admin already exists
    try {
      const existingStaff = await staffModel.getStaffByEmail(email);
      if (existingStaff) {
        console.log('⚠️  Admin account already exists with email:', email);
        console.log('   ID:', existingStaff.id);
        console.log('   Role:', existingStaff.role);
        console.log('   Active:', existingStaff.isActive);
        return;
      }
    } catch (error: any) {
      // If staff doesn't exist, continue with creation
      if (error.message && !error.message.includes('not found')) {
        throw error;
      }
    }

    // Create admin account
    console.log('📝 Creating admin account...');
    const admin = await staffModel.createStaff({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role,
      department: 'Administration',
    });

    console.log('✅ Admin account created successfully!');
    console.log('\n📋 Account Details:');
    console.log('   Email:', admin.email);
    console.log('   Name:', `${admin.firstName} ${admin.lastName}`);
    console.log('   Role:', admin.role);
    console.log('   ID:', admin.id);
    console.log('   Active:', admin.isActive);
    console.log('   Email Verified:', admin.emailVerified);
    console.log('\n✨ You can now login to the admin app with these credentials!');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating admin account:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createAdminAccount();

