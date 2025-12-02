import { CategoryModel } from '../src/models/CategoryModel';
import '../src/config/database';

interface CategorySeed {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  children?: CategorySeed[];
}

const foodBeverageCategory: CategorySeed = {
  name: 'Food & Beverages',
  slug: 'food-beverages-en',
  description: 'Food, drinks, and snacks',
  displayOrder: 4,
  children: [
    {
      name: 'Snacks',
      slug: 'snacks-en',
      children: [
        { name: 'Chips', slug: 'chips-en' },
        { name: 'Nuts', slug: 'nuts-en' },
        { name: 'Candy', slug: 'candy-en' },
        { name: 'Chocolate', slug: 'chocolate-en' },
      ],
    },
    {
      name: 'Beverages',
      slug: 'beverages-en',
      children: [
        { name: 'Soft Drinks', slug: 'soft-drinks-en' },
        { name: 'Tea', slug: 'tea-en' },
        { name: 'Coffee', slug: 'coffee-en' },
        { name: 'Juice', slug: 'juice-en' },
      ],
    },
    {
      name: 'Fresh Food',
      slug: 'fresh-food-en',
      children: [
        { name: 'Fruits', slug: 'fruits-en' },
        { name: 'Vegetables', slug: 'vegetables-en' },
        { name: 'Meat', slug: 'meat-en' },
        { name: 'Seafood', slug: 'seafood-en' },
      ],
    },
    {
      name: 'Condiments',
      slug: 'condiments-en',
      children: [
        { name: 'Soy Sauce', slug: 'soy-sauce-en' },
        { name: 'Vinegar', slug: 'vinegar-en' },
        { name: 'Spices', slug: 'spices-en' },
        { name: 'Sauces', slug: 'sauces-en' },
      ],
    },
  ],
};

async function addFoodBeverageCategory() {
  const categoryModel = new CategoryModel();

  try {
    console.log('添加 Food & Beverages 分类...\n');

    // Helper function to generate slug
    function generateSlug(name: string): string {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Helper function to create category recursively
    async function createCategory(
      categoryData: CategorySeed,
      parentId?: string,
      parentLevel: number = 0,
      displayOrder: number = 0
    ): Promise<void> {
      try {
        // Check if category already exists by slug
        const slug = categoryData.slug || generateSlug(categoryData.name);
        const existing = await categoryModel.findBySlug(slug);

        if (existing) {
          console.log(`分类已存在，跳过: ${categoryData.name} (${slug})`);
          // Use existing category ID for children
          if (categoryData.children && categoryData.children.length > 0) {
            for (let i = 0; i < categoryData.children.length; i++) {
              const child = categoryData.children[i];
              if (child) {
                await createCategory(child, existing.id, existing.level, i);
              }
            }
          }
          return;
        }

        const level = parentId ? parentLevel + 1 : 1;

        const category = await categoryModel.create({
          name: categoryData.name,
          slug,
          description: categoryData.description,
          parentId,
          displayOrder: categoryData.displayOrder ?? displayOrder,
          isActive: true,
        });

        console.log(`✓ 创建分类: ${category.name} (Level ${category.level}, Order ${category.displayOrder})`);

        // Create children if they exist
        if (categoryData.children && categoryData.children.length > 0) {
          for (let i = 0; i < categoryData.children.length; i++) {
            const child = categoryData.children[i];
            if (child) {
              await createCategory(child, category.id, level, i);
            }
          }
        }
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`分类已存在，跳过: ${categoryData.name}`);
        } else {
          console.error(`✗ 创建分类失败 ${categoryData.name}:`, error.message || error);
        }
      }
    }

    // Create the Food & Beverages category
    await createCategory(foodBeverageCategory, undefined, 0, foodBeverageCategory.displayOrder ?? 4);

    console.log('\n✓ Food & Beverages 分类添加完成！');

    // Show summary
    const allCategories = await categoryModel.findAll({ includeInactive: false });
    const level1Categories = allCategories.filter(c => c.level === 1);
    console.log(`\n当前共有 ${level1Categories.length} 个一级分类:`);
    level1Categories
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(cat => {
        console.log(`  - ${cat.name} (Order: ${cat.displayOrder})`);
      });

    // Show Food & Beverages structure
    const foodCategory = allCategories.find(c => c.name === 'Food & Beverages');
    if (foodCategory) {
      const foodChildren = allCategories.filter(c => c.parentId === foodCategory.id);
      console.log(`\nFood & Beverages 分类结构:`);
      console.log(`  - ${foodCategory.name} (Level ${foodCategory.level})`);
      foodChildren.forEach(child => {
        const grandChildren = allCategories.filter(c => c.parentId === child.id);
        console.log(`    - ${child.name} (Level ${child.level}, ${grandChildren.length} 个子分类)`);
      });
    }
  } catch (error) {
    console.error('✗ 添加分类时出错:', error);
    throw error;
  }
}

// Run the script if executed directly
if (require.main === module) {
  addFoodBeverageCategory()
    .then(() => {
      console.log('\n脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { addFoodBeverageCategory };

