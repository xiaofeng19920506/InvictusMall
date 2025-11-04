import { StaffModel } from "../src/models/StaffModel";
import { testConnection, initializeDatabase } from "../src/config/database";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

async function createAdminAccount() {
  try {
    console.log("🚀 Starting admin account creation...");

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error("❌ Database connection failed. Please check your database configuration.");
      process.exit(1);
    }

    console.log("✅ Database connection successful");

    // Initialize database (ensure tables exist)
    await initializeDatabase();
    console.log("✅ Database initialized");

    // Create staff model instance
    const staffModel = new StaffModel();

    // Check if admin already exists
    const existingStaff = await staffModel.getStaffByEmail(
      "aaronliu05061992@gmail.com"
    );
    if (existingStaff) {
      console.log("⚠️ Admin account already exists with this email.");
      console.log(`   ID: ${existingStaff.id}`);
      console.log(`   Email: ${existingStaff.email}`);
      console.log(`   Role: ${existingStaff.role}`);
      console.log(`   Name: ${existingStaff.firstName} ${existingStaff.lastName}`);
      process.exit(0);
    }

    // Create admin account
    const adminData = {
      email: "aaronliu05061992@gmail.com",
      password: "Liu1141..",
      firstName: "Aaron",
      lastName: "Liu",
      phoneNumber: "1234567890", // Default phone number, can be updated later
      role: "admin" as const,
      department: "Administration",
      employeeId: "ADMIN001",
    };

    console.log("📝 Creating admin account...");
    const admin = await staffModel.createStaff(adminData);

    console.log("✅ Admin account created successfully!");
    console.log("\n📋 Account Details:");
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Department: ${admin.department}`);
    console.log(`   Employee ID: ${admin.employeeId}`);
    console.log(`   Active: ${admin.isActive}`);
    console.log(`   Email Verified: ${admin.emailVerified}`);
    console.log("\n🔐 Login Credentials:");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminData.password}`);
    console.log("\n⚠️  Please save these credentials securely!");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error creating admin account:", error);
    if (error.code === "ER_DUP_ENTRY") {
      console.error(
        "   Email already exists. Please use a different email or check existing accounts."
      );
    }
    process.exit(1);
  }
}

// Run the script
createAdminAccount();

