import { CategoryModel } from '../src/models/CategoryModel';
import { pool } from '../src/config/database';

/**
 * Categories to delete by name
 */
const categoriesToDelete = [
  'Food & Beverages',
  'Sports & Outdoors',
  'Books & Media',
  'Baby & Kids',
  'Health & Wellness',
  'Toys & Games',
];

async function deleteSpecificCategories() {
  const categoryModel = new CategoryModel();
  const connection = await pool.getConnection();

  try {
    console.log('开始删除指定的分类...\n');

    // Get all categories
    const allCategories = await categoryModel.findAll({ includeInactive: true });

    // Find categories to delete
    const categoriesToDeleteList = allCategories.filter(cat =>
      categoriesToDelete.includes(cat.name)
    );

    if (categoriesToDeleteList.length === 0) {
      console.log('未找到要删除的分类。');
      return;
    }

    console.log(`找到 ${categoriesToDeleteList.length} 个分类需要删除:\n`);
    categoriesToDeleteList.forEach(cat => {
      console.log(`  - ${cat.name} (Level ${cat.level}, Order ${cat.displayOrder})`);
    });

    // Build parent-child map to find all children
    const childrenMap = new Map<string, typeof allCategories>();
    allCategories.forEach(cat => {
      if (cat.parentId) {
        if (!childrenMap.has(cat.parentId)) {
          childrenMap.set(cat.parentId, []);
        }
        childrenMap.get(cat.parentId)!.push(cat);
      }
    });

    // Recursive function to collect all category IDs to delete (including children)
    function collectCategoryIds(categoryId: string, collected: Set<string>) {
      if (collected.has(categoryId)) {
        return;
      }
      collected.add(categoryId);

      const children = childrenMap.get(categoryId) || [];
      children.forEach((child: any) => {
        collectCategoryIds(child.id, collected);
      });
    }

    // Collect all category IDs to delete
    const idsToDelete = new Set<string>();
    categoriesToDeleteList.forEach(cat => {
      collectCategoryIds(cat.id, idsToDelete);
    });

    console.log(`\n准备删除 ${idsToDelete.size} 个分类（包括所有子分类）...\n`);

    // Delete all categories in one transaction
    await connection.beginTransaction();

    try {
      // Delete in batches to avoid issues
      const idsArray = Array.from(idsToDelete);
      const batchSize = 50;
      let totalDeleted = 0;

      for (let i = 0; i < idsArray.length; i += batchSize) {
        const batch = idsArray.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');

        const [result] = await connection.execute(
          `DELETE FROM categories WHERE id IN (${placeholders})`,
          batch
        ) as any[];

        totalDeleted += result.affectedRows;
        console.log(`  删除批次 ${Math.floor(i / batchSize) + 1}: ${result.affectedRows} 个分类`);
      }

      await connection.commit();
      console.log(`\n✓ 成功删除 ${totalDeleted} 个分类！`);

      // Show remaining level 1 categories
      const remainingCategories = await categoryModel.findAll({ includeInactive: false });
      const level1Categories = remainingCategories.filter(c => c.level === 1);

      console.log(`\n剩余 ${level1Categories.length} 个一级分类:`);
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
    console.error('✗ 删除时出错:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the script if executed directly
if (require.main === module) {
  deleteSpecificCategories()
    .then(() => {
      console.log('\n脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { deleteSpecificCategories };

