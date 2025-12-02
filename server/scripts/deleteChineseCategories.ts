import { CategoryModel } from '../src/models/CategoryModel';
import { pool } from '../src/config/database';

/**
 * Check if a string contains Chinese characters
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * Check if a category should be preserved (not deleted)
 * Preserve: Electronics, Pet Supplies, and English categories (slug contains -en)
 */
function shouldPreserveCategory(name: string, slug: string): boolean {
  const preserveNames = ['Electronics', 'Pet Supplies'];
  if (preserveNames.includes(name)) {
    return true;
  }
  // Preserve English categories (slug contains -en)
  if (slug.includes('-en')) {
    return true;
  }
  return false;
}

async function deleteChineseCategories() {
  const categoryModel = new CategoryModel();

  try {
    console.log('开始删除中文分类...\n');

    // Get all categories
    const allCategories = await categoryModel.findAll({ includeInactive: true });
    
    // Find all Chinese categories (categories with Chinese characters in name)
    const chineseCategories = allCategories.filter(cat => {
      // Skip if should be preserved
      if (shouldPreserveCategory(cat.name, cat.slug)) {
        return false;
      }
      // Check if name contains Chinese characters
      return containsChinese(cat.name);
    });

    if (chineseCategories.length === 0) {
      console.log('未找到中文分类。');
      return;
    }

    console.log(`找到 ${chineseCategories.length} 个中文分类需要删除。\n`);

    // Group categories by level (delete from deepest level first to avoid foreign key issues)
    const categoriesByLevel = new Map<number, typeof chineseCategories>();
    chineseCategories.forEach(cat => {
      const level = cat.level;
      if (!categoriesByLevel.has(level)) {
        categoriesByLevel.set(level, []);
      }
      categoriesByLevel.get(level)!.push(cat);
    });

    // Get all levels sorted in descending order (deepest first)
    const levels = Array.from(categoriesByLevel.keys()).sort((a, b) => b - a);

    let deletedCount = 0;
    let errorCount = 0;

    // Delete from deepest level to top level
    for (const level of levels) {
      const categoriesAtLevel = categoriesByLevel.get(level)!;
      console.log(`\n删除 Level ${level} 的分类 (${categoriesAtLevel.length} 个)...`);

      for (const category of categoriesAtLevel) {
        try {
          // Check if category has children (should not happen if we delete from bottom up, but just in case)
          const allCats = await categoryModel.findAll({ includeInactive: true });
          const hasChildren = allCats.some(c => c.parentId === category.id);
          
          if (hasChildren) {
            console.log(`  ⚠ 跳过 ${category.name} (ID: ${category.id}) - 仍有子分类`);
            continue;
          }

          await categoryModel.delete(category.id);
          console.log(`  ✓ 已删除: ${category.name} (Level ${category.level})`);
          deletedCount++;
        } catch (error: any) {
          if (error.message?.includes('children')) {
            console.log(`  ⚠ 跳过 ${category.name} (ID: ${category.id}) - 仍有子分类`);
          } else {
            console.error(`  ✗ 删除失败 ${category.name}:`, error.message || error);
            errorCount++;
          }
        }
      }
    }

    console.log(`\n删除完成！`);
    console.log(`  - 成功删除: ${deletedCount} 个分类`);
    if (errorCount > 0) {
      console.log(`  - 失败: ${errorCount} 个分类`);
    }

    // Show remaining categories
    const remainingCategories = await categoryModel.findAll({ includeInactive: false });
    const level1Categories = remainingCategories.filter(c => c.level === 1);
    console.log(`\n剩余 ${level1Categories.length} 个一级分类:`);
    level1Categories
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(cat => {
        console.log(`  - ${cat.name} (Order: ${cat.displayOrder})`);
      });
  } catch (error) {
    console.error('✗ 删除中文分类时出错:', error);
    throw error;
  }
}

// Run the script if executed directly
if (require.main === module) {
  deleteChineseCategories()
    .then(() => {
      console.log('\n脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { deleteChineseCategories };

