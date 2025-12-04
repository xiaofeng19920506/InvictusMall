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

async function cleanupRemainingChineseCategories() {
  const categoryModel = new CategoryModel();

  try {
    console.log('清理剩余的中文分类...\n');

    // Get all categories
    const allCategories = await categoryModel.findAll({ includeInactive: true });
    
    // Find all Chinese categories
    const chineseCategories = allCategories.filter(cat => {
      if (shouldPreserveCategory(cat.name, cat.slug)) {
        return false;
      }
      return containsChinese(cat.name);
    });

    if (chineseCategories.length === 0) {
      console.log('未找到剩余的中文分类。');
      return;
    }

    console.log(`找到 ${chineseCategories.length} 个剩余的中文分类。\n`);

    // Build a map of parent-child relationships
    const childrenMap = new Map<string, typeof chineseCategories>();
    chineseCategories.forEach(cat => {
      if (cat.parentId) {
        if (!childrenMap.has(cat.parentId)) {
          childrenMap.set(cat.parentId, []);
        }
        childrenMap.get(cat.parentId)!.push(cat);
      }
    });

    // Recursive function to delete category and all its children
    async function deleteCategoryAndChildren(categoryId: string, categoryName: string, level: number): Promise<number> {
      let deleted = 0;
      const children = childrenMap.get(categoryId) || [];
      
      // First delete all children
      for (const child of children) {
        deleted += await deleteCategoryAndChildren(child.id, child.name, child.level);
      }

      // Then delete the category itself
      try {
        await categoryModel.delete(categoryId);
        console.log(`  ✓ 已删除: ${categoryName} (Level ${level})`);
        deleted++;
      } catch (error: any) {
        console.error(`  ✗ 删除失败 ${categoryName}:`, error.message || error);
      }

      return deleted;
    }

    // Find root categories (categories without parent or parent is not Chinese)
    const rootCategories = chineseCategories.filter(cat => {
      if (!cat.parentId) {
        return true;
      }
      const parent = allCategories.find(c => c.id === cat.parentId);
      return !parent || !containsChinese(parent.name) || shouldPreserveCategory(parent.name, parent.slug);
    });

    let totalDeleted = 0;
    for (const root of rootCategories) {
      console.log(`\n删除分类树: ${root.name}...`);
      const deleted = await deleteCategoryAndChildren(root.id, root.name, root.level);
      totalDeleted += deleted;
    }

    console.log(`\n清理完成！共删除 ${totalDeleted} 个分类。`);

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
    console.error('✗ 清理时出错:', error);
    throw error;
  }
}

// Run the script if executed directly
if (require.main === module) {
  cleanupRemainingChineseCategories()
    .then(() => {
      console.log('\n脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { cleanupRemainingChineseCategories };

