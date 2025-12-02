import { CategoryModel } from '../src/models/CategoryModel';
import { pool } from '../src/config/database';

async function updateHomeCategory() {
  const categoryModel = new CategoryModel();
  const connection = await pool.getConnection();

  try {
    console.log('更新 Home & Furniture 分类...\n');

    // Find "Home & Furniture" category
    const allCategories = await categoryModel.findAll({ includeInactive: true });
    const homeCategory = allCategories.find(cat => cat.name === 'Home & Furniture');

    if (!homeCategory) {
      console.log('未找到 "Home & Furniture" 分类。');
      return;
    }

    console.log(`找到分类: ${homeCategory.name} (ID: ${homeCategory.id})\n`);

    // Find "Furniture" subcategory
    const furnitureCategory = allCategories.find(cat => 
      cat.name === 'Furniture' && cat.parentId === homeCategory.id
    );

    // Build parent-child map to find all children of Furniture
    const childrenMap = new Map<string, typeof allCategories>();
    allCategories.forEach(cat => {
      if (cat.parentId) {
        if (!childrenMap.has(cat.parentId)) {
          childrenMap.set(cat.parentId, []);
        }
        childrenMap.get(cat.parentId)!.push(cat);
      }
    });

    // Collect all Furniture category IDs to delete (including children)
    const idsToDelete = new Set<string>();
    if (furnitureCategory) {
      function collectCategoryIds(categoryId: string) {
        if (idsToDelete.has(categoryId)) {
          return;
        }
        idsToDelete.add(categoryId);

        const children = childrenMap.get(categoryId) || [];
        children.forEach((child: any) => {
          collectCategoryIds(child.id);
        });
      }
      collectCategoryIds(furnitureCategory.id);
    }

    await connection.beginTransaction();

    try {
      // 1. Delete Furniture category and all its children
      if (idsToDelete.size > 0) {
        console.log(`删除 "Furniture" 分类及其 ${idsToDelete.size - 1} 个子分类...`);
        const idsArray = Array.from(idsToDelete);
        const placeholders = idsArray.map(() => '?').join(',');

        const [result] = await connection.execute(
          `DELETE FROM categories WHERE id IN (${placeholders})`,
          idsArray
        ) as any[];

        console.log(`  ✓ 已删除 ${result.affectedRows} 个分类\n`);
      } else {
        console.log('未找到 "Furniture" 子分类。\n');
      }

      // 2. Update "Home & Furniture" to "Home Improvement"
      console.log('将 "Home & Furniture" 重命名为 "Home Improvement"...');
      const newSlug = 'home-improvement';
      
      await connection.execute(
        `UPDATE categories SET name = ?, slug = ?, updated_at = NOW() WHERE id = ?`,
        ['Home Improvement', newSlug, homeCategory.id]
      );

      console.log('  ✓ 重命名完成\n');

      await connection.commit();

      // Show updated category structure
      const updatedCategories = await categoryModel.findAll({ includeInactive: false });
      const updatedHomeCategory = updatedCategories.find(cat => cat.id === homeCategory.id);
      const homeChildren = updatedCategories.filter(cat => cat.parentId === homeCategory.id);

      console.log('更新后的分类结构:');
      console.log(`  - ${updatedHomeCategory?.name} (Level ${updatedHomeCategory?.level})`);
      homeChildren.forEach(child => {
        console.log(`    - ${child.name} (Level ${child.level})`);
      });

      // Show all level 1 categories
      const level1Categories = updatedCategories.filter(c => c.level === 1);
      console.log(`\n所有一级分类 (共 ${level1Categories.length} 个):`);
      level1Categories
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .forEach(cat => {
          console.log(`  - ${cat.name} (Order: ${cat.displayOrder})`);
        });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('✗ 更新时出错:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the script if executed directly
if (require.main === module) {
  updateHomeCategory()
    .then(() => {
      console.log('\n脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { updateHomeCategory };

