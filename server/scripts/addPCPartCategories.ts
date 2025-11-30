/**
 * Script to add PC Part subcategories (Level 4)
 * Adds comprehensive PC component categories under "Computer Parts"
 * 
 * Usage: npx ts-node server/scripts/addPCPartCategories.ts
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { dbConfig } from "../src/config/database";
import { CategoryModel } from "../src/models/CategoryModel";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const pcPartCategories = [
  "CPU / Processors",
  "Motherboards",
  "Graphics Cards / GPUs",
  "RAM / Memory",
  "Storage (SSD / HDD)",
  "Power Supplies",
  "Computer Cases",
  "Cooling Solutions",
  "Network Cards",
  "Sound Cards",
  "Optical Drives",
  "Cables & Adapters",
];

async function addPCPartCategories() {
  let connection: mysql.Connection | null = null;
  const categoryModel = new CategoryModel();

  try {
    console.log("🔌 Connecting to database...");
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });
    console.log("✅ Connected to database\n");

    // Find "Computer Parts" category
    console.log("📦 Step 1: Finding 'Computer Parts' category...");
    const [categories] = (await connection.execute(
      "SELECT id, name, parent_id, level FROM categories WHERE name = ?",
      ["Computer Parts"]
    )) as any[];

    if (!categories || categories.length === 0) {
      throw new Error("'Computer Parts' category not found. Please create it first.");
    }

    const computerPartsCategory = categories[0];
    console.log(
      `✅ Found 'Computer Parts' category: ${computerPartsCategory.name} (ID: ${computerPartsCategory.id}, Level: ${computerPartsCategory.level})\n`
    );

    if (computerPartsCategory.level !== 3) {
      throw new Error(
        `'Computer Parts' is at level ${computerPartsCategory.level}, but expected level 3. Cannot add level 4 categories.`
      );
    }

    // Check existing subcategories
    console.log("📋 Step 2: Checking existing subcategories...");
    const [existingSubcategories] = (await connection.execute(
      "SELECT id, name FROM categories WHERE parent_id = ?",
      [computerPartsCategory.id]
    )) as any[];

    const existingNames = (existingSubcategories || []).map((cat: any) =>
      cat.name.toLowerCase()
    );
    console.log(
      `Found ${existingSubcategories.length} existing subcategories\n`
    );

    // Add new categories
    console.log("➕ Step 3: Adding PC Part subcategories...\n");
    let addedCount = 0;
    let skippedCount = 0;

    for (const categoryName of pcPartCategories) {
      // Check if category already exists
      if (existingNames.includes(categoryName.toLowerCase())) {
        console.log(`⏭️  Skipping "${categoryName}" - already exists`);
        skippedCount++;
        continue;
      }

      try {
        const newCategory = await categoryModel.create({
          name: categoryName,
          slug: categoryName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[\/\(\)]/g, "")
            .replace(/\//g, "-"),
          description: `${categoryName} for desktop computers`,
          parentId: computerPartsCategory.id,
          isActive: true,
        });

        console.log(
          `✅ Added: "${categoryName}" (ID: ${newCategory.id}, Level: ${newCategory.level})`
        );
        addedCount++;
      } catch (error: any) {
        console.error(
          `❌ Failed to add "${categoryName}": ${error.message}`
        );
      }
    }

    console.log("\n📊 Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total categories to add: ${pcPartCategories.length}`);
    console.log(`✅ Added: ${addedCount}`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Verify final count
    const [finalSubcategories] = (await connection.execute(
      "SELECT COUNT(*) as count FROM categories WHERE parent_id = ?",
      [computerPartsCategory.id]
    )) as any[];

    console.log(
      `📦 Total subcategories under "Computer Parts": ${finalSubcategories[0].count}\n`
    );

    return addedCount > 0;
  } catch (error: any) {
    console.error("\n❌ Error adding PC Part categories:");
    console.error(error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the script
addPCPartCategories()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

