/**
 * Script to delete test categories (CPU and GPU) from Computer Parts
 * 
 * Usage: npx ts-node server/scripts/deleteTestCategories.ts
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { dbConfig } from "../src/config/database";
import { CategoryModel } from "../src/models/CategoryModel";

dotenv.config();

const categoriesToDelete = ["CPU", "GPU"];

async function deleteTestCategories() {
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

    // Find categories to delete (by name or slug)
    console.log("🔍 Step 2: Finding test categories to delete...");
    const [categories] = (await connection.execute(
      `SELECT id, name, slug, parent_id FROM categories WHERE 
        (name IN (?, ?) OR slug IN ('cpu', 'graphic cards', 'graphics cards'))
        AND parent_id = ?`,
      [...categoriesToDelete, computerPartsId]
    )) as any[];

    if (!categories || categories.length === 0) {
      console.log("ℹ️  No test categories found to delete.\n");
      return true;
    }

    console.log(`Found ${categories.length} category(ies) to delete:\n`);
    categories.forEach((cat: any) => {
      console.log(`  - ${cat.name} (ID: ${cat.id})`);
    });
    console.log();

    // Check for children and products
    console.log("🔍 Step 3: Checking for dependencies...\n");
    for (const category of categories) {
      // Check for child categories
      const [children] = (await connection.execute(
        "SELECT COUNT(*) as count FROM categories WHERE parent_id = ?",
        [category.id]
      )) as any[];

      const childCount = children[0].count;
      if (childCount > 0) {
        console.log(
          `⚠️  Warning: "${category.name}" has ${childCount} child category(ies). Cannot delete.`
        );
        continue;
      }

      // Check for products (products table uses category name, not category_id)
      const [products] = (await connection.execute(
        "SELECT COUNT(*) as count FROM products WHERE category = ?",
        [category.name]
      )) as any[];

      const productCount = products[0].count;
      if (productCount > 0) {
        console.log(
          `⚠️  Warning: "${category.name}" has ${productCount} product(s) associated. Cannot delete.`
        );
        continue;
      }

      // Delete the category
      try {
        console.log(`🗑️  Deleting "${category.name}"...`);
        await categoryModel.delete(category.id);
        console.log(`✅ Successfully deleted "${category.name}"\n`);
      } catch (error: any) {
        console.error(`❌ Failed to delete "${category.name}": ${error.message}\n`);
      }
    }

    console.log("✅ Process completed!\n");
    return true;
  } catch (error: any) {
    console.error("\n❌ Error deleting test categories:");
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
deleteTestCategories()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

