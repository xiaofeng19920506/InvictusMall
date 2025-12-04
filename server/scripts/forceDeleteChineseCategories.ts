import { pool } from '../src/config/database';

/**
 * Check if a string contains Chinese characters
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

async function forceDeleteChineseCategories() {
  const connection = await pool.getConnection();

  try {
    console.log('强制删除所有中文分类...\n');

    // First, get all categories with Chinese names
    const [chineseCategories] = await connection.execute(`
      SELECT id, name, slug, level, parent_id
      FROM categories
      WHERE name REGEXP '[\\u4e00-\\u9fa5]'
        AND slug NOT LIKE '%-en%'
        AND name NOT IN ('Electronics', 'Pet Supplies')
    `) as any[];

    if (chineseCategories.length === 0) {
      console.log('未找到中文分类。');
      return;
    }

    console.log(`找到 ${chineseCategories.length} 个中文分类。\n`);

    // Build parent-child map
    const categoryMap = new Map<string, any>();
    const childrenMap = new Map<string, any[]>();
    
    chineseCategories.forEach((cat: any) => {
      categoryMap.set(cat.id, cat);
      if (cat.parent_id) {
        if (!childrenMap.has(cat.parent_id)) {
          childrenMap.set(cat.parent_id, []);
        }
        childrenMap.get(cat.parent_id)!.push(cat);
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
    chineseCategories.forEach((cat: any) => {
      // Only process root categories (those without Chinese parent)
      const parent = cat.parent_id ? categoryMap.get(cat.parent_id) : null;
      if (!parent || !containsChinese(parent.name)) {
        collectCategoryIds(cat.id, idsToDelete);
      }
    });

    console.log(`准备删除 ${idsToDelete.size} 个分类（包括子分类）...\n`);

    // Delete all categories in one transaction
    await connection.beginTransaction();

    try {
      // Delete in batches to avoid issues
      const idsArray = Array.from(idsToDelete);
      const batchSize = 50;

      for (let i = 0; i < idsArray.length; i += batchSize) {
        const batch = idsArray.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        
        const [result] = await connection.execute(
          `DELETE FROM categories WHERE id IN (${placeholders})`,
          batch
        ) as any[];

        console.log(`  删除批次 ${Math.floor(i / batchSize) + 1}: ${result.affectedRows} 个分类`);
      }

      await connection.commit();
      console.log(`\n✓ 成功删除 ${idsToDelete.size} 个中文分类！`);

      // Show remaining categories
      const [remaining] = await connection.execute(`
        SELECT name, level, display_order
        FROM categories
        WHERE level = 1 AND is_active = TRUE
        ORDER BY display_order ASC, name ASC
      `) as any[];

      console.log(`\n剩余 ${remaining.length} 个一级分类:`);
      remaining.forEach((cat: any) => {
        console.log(`  - ${cat.name} (Order: ${cat.display_order})`);
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
  forceDeleteChineseCategories()
    .then(() => {
      console.log('\n脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { forceDeleteChineseCategories };

