/**
 * Script to force delete old CPU and GPU categories by ID or slug
 * This script will delete categories even if they have slightly different names
 * 
 * Usage: npx ts-node server/scripts/forceDeleteOldCategories.ts
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { dbConfig } from "../src/config/database";
import { CategoryModel } from "../src/models/CategoryModel";

dotenv.config();

// Known IDs from previous queries
const knownOldCategoryIds = [
  "7dbbd7a4-109a-47aa-81a7-fa50de359452", // CPU (from earlier query)
  "a1fd429b-fb10-4ba2-9df9-66e2b10bb467", // GPU (already deleted, but keeping for reference)
];

async function forceDeleteOldCategories() {
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

    // Find Computer Parts category
    console.log("📦 Step 1: Finding 'Computer Parts' category...");
    const [computerParts] = (await connection.execute(
      "SELECT id, name FROM categories WHERE name = ?",
      ["Computer Parts"]
    )) as any[];

    if (!computerParts || computerParts.length === 0) {
      throw new Error("'Computer Parts' category not found.");
    }

    const computerPartsId = computerParts[0].id;
    console.log(`✅ Found 'Computer Parts' category (ID: ${computerPartsId})\n`);

    // Find all categories under Computer Parts that match old patterns
    console.log("🔍 Step 2: Finding old test categories...");
    const [allCategories] = (await connection.execute(
      `SELECT id, name, slug, parent_id, level 
       FROM categories 
       WHERE parent_id = ? 
       AND (
         name = 'CPU' 
         OR name = 'GPU' 
         OR slug = 'cpu' 
         OR slug = 'graphic cards'
         OR slug = 'graphics cards'
         OR (name LIKE 'CPU%' AND name != 'CPU / Processors')
         OR (name LIKE '%GPU%' AND name != 'Graphics Cards / GPUs')
       )
       ORDER BY name`,
      [computerPartsId]
    )) as any[];

    if (!allCategories || allCategories.length === 0) {
      console.log("ℹ️  No old test categories found to delete.\n");
      
      // Also check by known IDs
      console.log("🔍 Step 3: Checking known old category IDs...\n");
      for (const id of knownOldCategoryIds) {
        const [category] = (await connection.execute(
          "SELECT id, name, slug FROM categories WHERE id = ?",
          [id]
        )) as any[];
        
        if (category && category.length > 0) {
          console.log(`Found category by ID: ${category[0].name} (${category[0].slug})`);
          allCategories.push(category[0]);
        }
      }
      
      if (allCategories.length === 0) {
        console.log("✅ No old categories found. Database is clean!\n");
        return true;
      }
    }

    console.log(`Found ${allCategories.length} old category(ies) to delete:\n`);
    allCategories.forEach((cat: any) => {
      console.log(`  - ${cat.name} (ID: ${cat.id}, Slug: ${cat.slug})`);
    });
    console.log();

    // Delete each category
    console.log("🗑️  Step 4: Deleting old categories...\n");
    let deletedCount = 0;
    let errorCount = 0;

    for (const category of allCategories) {
      try {
        // Check for children
        const [children] = (await connection.execute(
          "SELECT COUNT(*) as count FROM categories WHERE parent_id = ?",
          [category.id]
        )) as any[];

        if (children[0].count > 0) {
          console.log(
            `⚠️  Skipping "${category.name}" - has ${children[0].count} child category(ies)`
          );
          continue;
        }

        // Check for products
        const [products] = (await connection.execute(
          "SELECT COUNT(*) as count FROM products WHERE category = ?",
          [category.name]
        )) as any[];

        if (products[0].count > 0) {
          console.log(
            `⚠️  Skipping "${category.name}" - has ${products[0].count} product(s) associated`
          );
          continue;
        }

        // Delete the category
        console.log(`🗑️  Deleting "${category.name}" (${category.slug})...`);
        await categoryModel.delete(category.id);
        console.log(`✅ Successfully deleted "${category.name}"\n`);
        deletedCount++;
      } catch (error: any) {
        console.error(`❌ Failed to delete "${category.name}": ${error.message}\n`);
        errorCount++;
      }
    }

    console.log("📊 Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total found: ${allCategories.length}`);
    console.log(`✅ Deleted: ${deletedCount}`);
    console.log(`⚠️  Skipped: ${allCategories.length - deletedCount - errorCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return deletedCount > 0 || allCategories.length === 0;
  } catch (error: any) {
    console.error("\n❌ Error deleting old categories:");
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
forceDeleteOldCategories()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

