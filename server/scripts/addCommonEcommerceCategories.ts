import { CategoryModel } from '../src/models/CategoryModel';
import '../src/config/database';

interface CategorySeed {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  children?: CategorySeed[];
}

const commonEcommerceCategories: CategorySeed[] = [
  {
    name: '服装与配饰',
    slug: 'fashion-accessories',
    description: '时尚服装、鞋类、配饰',
    displayOrder: 1,
    children: [
      {
        name: '男装',
        slug: 'mens-clothing',
        children: [
          { name: 'T恤', slug: 'mens-t-shirts' },
          { name: '衬衫', slug: 'mens-shirts' },
          { name: '裤子', slug: 'mens-pants' },
          { name: '外套', slug: 'mens-jackets' },
          { name: '运动装', slug: 'mens-sportswear' },
        ],
      },
      {
        name: '女装',
        slug: 'womens-clothing',
        children: [
          { name: '连衣裙', slug: 'womens-dresses' },
          { name: '上衣', slug: 'womens-tops' },
          { name: '裤子', slug: 'womens-pants' },
          { name: '外套', slug: 'womens-jackets' },
          { name: '运动装', slug: 'womens-sportswear' },
        ],
      },
      {
        name: '鞋类',
        slug: 'shoes',
        children: [
          { name: '运动鞋', slug: 'sneakers' },
          { name: '休闲鞋', slug: 'casual-shoes' },
          { name: '正装鞋', slug: 'dress-shoes' },
          { name: '靴子', slug: 'boots' },
          { name: '凉鞋', slug: 'sandals' },
        ],
      },
      {
        name: '配饰',
        slug: 'accessories',
        children: [
          { name: '包包', slug: 'bags' },
          { name: '手表', slug: 'watches' },
          { name: '珠宝', slug: 'jewelry' },
          { name: '太阳镜', slug: 'sunglasses' },
          { name: '帽子', slug: 'hats' },
        ],
      },
    ],
  },
  {
    name: '家居与家具',
    slug: 'home-furniture',
    description: '家具、装饰、家居用品',
    displayOrder: 2,
    children: [
      {
        name: '家具',
        slug: 'furniture',
        children: [
          { name: '沙发', slug: 'sofas' },
          { name: '床', slug: 'beds' },
          { name: '桌子', slug: 'tables' },
          { name: '椅子', slug: 'chairs' },
          { name: '储物柜', slug: 'storage' },
        ],
      },
      {
        name: '装饰',
        slug: 'decor',
        children: [
          { name: '墙饰', slug: 'wall-decor' },
          { name: '灯具', slug: 'lighting' },
          { name: '地毯', slug: 'rugs' },
          { name: '窗帘', slug: 'curtains' },
          { name: '花瓶', slug: 'vases' },
        ],
      },
      {
        name: '厨房用品',
        slug: 'kitchen',
        children: [
          { name: '厨具', slug: 'cookware' },
          { name: '餐具', slug: 'dining-ware' },
          { name: '小家电', slug: 'small-appliances' },
          { name: '收纳', slug: 'kitchen-storage' },
        ],
      },
      {
        name: '床上用品',
        slug: 'bedding',
        children: [
          { name: '床单', slug: 'bed-sheets' },
          { name: '被子', slug: 'comforters' },
          { name: '枕头', slug: 'pillows' },
          { name: '毯子', slug: 'blankets' },
        ],
      },
    ],
  },
  {
    name: '美妆与个护',
    slug: 'beauty-personal-care',
    description: '化妆品、护肤品、个人护理',
    displayOrder: 3,
    children: [
      {
        name: '护肤',
        slug: 'skincare',
        children: [
          { name: '洁面', slug: 'cleansers' },
          { name: '精华', slug: 'serums' },
          { name: '面霜', slug: 'moisturizers' },
          { name: '面膜', slug: 'face-masks' },
          { name: '防晒', slug: 'sunscreen' },
        ],
      },
      {
        name: '彩妆',
        slug: 'makeup',
        children: [
          { name: '底妆', slug: 'foundation' },
          { name: '眼妆', slug: 'eye-makeup' },
          { name: '唇妆', slug: 'lip-makeup' },
          { name: '腮红', slug: 'blush' },
          { name: '化妆工具', slug: 'makeup-tools' },
        ],
      },
      {
        name: '香水',
        slug: 'fragrance',
        children: [
          { name: '女香', slug: 'womens-fragrance' },
          { name: '男香', slug: 'mens-fragrance' },
          { name: '中性香', slug: 'unisex-fragrance' },
        ],
      },
      {
        name: '个人护理',
        slug: 'personal-care',
        children: [
          { name: '洗发护发', slug: 'hair-care' },
          { name: '身体护理', slug: 'body-care' },
          { name: '口腔护理', slug: 'oral-care' },
          { name: '男士护理', slug: 'mens-grooming' },
        ],
      },
    ],
  },
  {
    name: '食品与饮料',
    slug: 'food-beverages',
    description: '食品、饮料、零食',
    displayOrder: 4,
    children: [
      {
        name: '零食',
        slug: 'snacks',
        children: [
          { name: '薯片', slug: 'chips' },
          { name: '坚果', slug: 'nuts' },
          { name: '糖果', slug: 'candy' },
          { name: '巧克力', slug: 'chocolate' },
        ],
      },
      {
        name: '饮料',
        slug: 'beverages',
        children: [
          { name: '软饮料', slug: 'soft-drinks' },
          { name: '茶', slug: 'tea' },
          { name: '咖啡', slug: 'coffee' },
          { name: '果汁', slug: 'juice' },
        ],
      },
      {
        name: '生鲜',
        slug: 'fresh-food',
        children: [
          { name: '水果', slug: 'fruits' },
          { name: '蔬菜', slug: 'vegetables' },
          { name: '肉类', slug: 'meat' },
          { name: '海鲜', slug: 'seafood' },
        ],
      },
      {
        name: '调料',
        slug: 'condiments',
        children: [
          { name: '酱油', slug: 'soy-sauce' },
          { name: '醋', slug: 'vinegar' },
          { name: '香料', slug: 'spices' },
          { name: '酱料', slug: 'sauces' },
        ],
      },
    ],
  },
  {
    name: '运动与户外',
    slug: 'sports-outdoors',
    description: '运动装备、户外用品',
    displayOrder: 5,
    children: [
      {
        name: '运动装备',
        slug: 'sports-equipment',
        children: [
          { name: '健身器材', slug: 'fitness-equipment' },
          { name: '球类', slug: 'balls' },
          { name: '瑜伽用品', slug: 'yoga' },
          { name: '跑步装备', slug: 'running-gear' },
        ],
      },
      {
        name: '户外用品',
        slug: 'outdoor-gear',
        children: [
          { name: '露营装备', slug: 'camping-gear' },
          { name: '登山装备', slug: 'hiking-gear' },
          { name: '钓鱼用品', slug: 'fishing-gear' },
          { name: '自行车', slug: 'bicycles' },
        ],
      },
      {
        name: '运动服装',
        slug: 'sports-apparel',
        children: [
          { name: '运动T恤', slug: 'sports-t-shirts' },
          { name: '运动裤', slug: 'sports-pants' },
          { name: '运动鞋', slug: 'athletic-shoes' },
          { name: '运动配饰', slug: 'sports-accessories' },
        ],
      },
    ],
  },
  {
    name: '图书与媒体',
    slug: 'books-media',
    description: '图书、电子书、音像制品',
    displayOrder: 6,
    children: [
      {
        name: '图书',
        slug: 'books',
        children: [
          { name: '小说', slug: 'fiction' },
          { name: '非小说', slug: 'non-fiction' },
          { name: '教育', slug: 'education' },
          { name: '儿童图书', slug: 'children-books' },
          { name: '漫画', slug: 'comics' },
        ],
      },
      {
        name: '电子书',
        slug: 'ebooks',
        children: [
          { name: '小说电子书', slug: 'fiction-ebooks' },
          { name: '教育电子书', slug: 'education-ebooks' },
          { name: '专业电子书', slug: 'professional-ebooks' },
        ],
      },
      {
        name: '音像制品',
        slug: 'media',
        children: [
          { name: 'CD', slug: 'cds' },
          { name: 'DVD', slug: 'dvds' },
          { name: '蓝光', slug: 'blu-ray' },
        ],
      },
    ],
  },
  {
    name: '汽车用品',
    slug: 'automotive',
    description: '汽车配件、保养用品',
    displayOrder: 7,
    children: [
      {
        name: '汽车配件',
        slug: 'car-parts',
        children: [
          { name: '轮胎', slug: 'tires' },
          { name: '电池', slug: 'batteries' },
          { name: '机油', slug: 'motor-oil' },
          { name: '滤清器', slug: 'filters' },
        ],
      },
      {
        name: '汽车装饰',
        slug: 'car-accessories',
        children: [
          { name: '座垫', slug: 'seat-covers' },
          { name: '脚垫', slug: 'floor-mats' },
          { name: '方向盘套', slug: 'steering-wheel-covers' },
          { name: '车载用品', slug: 'car-electronics' },
        ],
      },
      {
        name: '保养用品',
        slug: 'car-care',
        children: [
          { name: '洗车用品', slug: 'car-wash' },
          { name: '打蜡用品', slug: 'car-wax' },
          { name: '清洁工具', slug: 'cleaning-tools' },
        ],
      },
    ],
  },
  {
    name: '母婴用品',
    slug: 'baby-kids',
    description: '婴儿用品、儿童用品',
    displayOrder: 8,
    children: [
      {
        name: '婴儿用品',
        slug: 'baby-products',
        children: [
          { name: '奶粉', slug: 'baby-formula' },
          { name: '尿布', slug: 'diapers' },
          { name: '婴儿服装', slug: 'baby-clothing' },
          { name: '婴儿车', slug: 'strollers' },
          { name: '安全座椅', slug: 'car-seats' },
        ],
      },
      {
        name: '儿童用品',
        slug: 'kids-products',
        children: [
          { name: '儿童服装', slug: 'kids-clothing' },
          { name: '儿童玩具', slug: 'kids-toys' },
          { name: '学习用品', slug: 'school-supplies' },
          { name: '儿童家具', slug: 'kids-furniture' },
        ],
      },
    ],
  },
  {
    name: '健康与医疗',
    slug: 'health-wellness',
    description: '健康产品、医疗用品',
    displayOrder: 9,
    children: [
      {
        name: '健康产品',
        slug: 'health-products',
        children: [
          { name: '维生素', slug: 'vitamins' },
          { name: '保健品', slug: 'supplements' },
          { name: '按摩用品', slug: 'massage-products' },
          { name: '健身器材', slug: 'fitness-equipment-health' },
        ],
      },
      {
        name: '医疗用品',
        slug: 'medical-supplies',
        children: [
          { name: '体温计', slug: 'thermometers' },
          { name: '血压计', slug: 'blood-pressure-monitors' },
          { name: '急救用品', slug: 'first-aid' },
          { name: '口罩', slug: 'masks' },
        ],
      },
    ],
  },
  {
    name: '玩具与游戏',
    slug: 'toys-games',
    description: '玩具、游戏、模型',
    displayOrder: 10,
    children: [
      {
        name: '玩具',
        slug: 'toys',
        children: [
          { name: '积木', slug: 'building-blocks' },
          { name: '毛绒玩具', slug: 'plush-toys' },
          { name: '遥控玩具', slug: 'remote-control-toys' },
          { name: '益智玩具', slug: 'educational-toys' },
        ],
      },
      {
        name: '游戏',
        slug: 'games',
        children: [
          { name: '桌游', slug: 'board-games' },
          { name: '卡牌游戏', slug: 'card-games' },
          { name: '拼图', slug: 'puzzles' },
          { name: '电子游戏', slug: 'video-games' },
        ],
      },
      {
        name: '模型',
        slug: 'models',
        children: [
          { name: '模型玩具', slug: 'model-kits' },
          { name: '手办', slug: 'figures' },
          { name: '收藏品', slug: 'collectibles' },
        ],
      },
    ],
  },
];

async function addCommonEcommerceCategories() {
  const categoryModel = new CategoryModel();

  try {
    console.log('开始添加常见电商分类...');

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

    // Create all top-level categories
    for (let i = 0; i < commonEcommerceCategories.length; i++) {
      const categoryData = commonEcommerceCategories[i];
      if (categoryData) {
        await createCategory(categoryData, undefined, 0, categoryData.displayOrder ?? i);
      }
    }

    console.log('\n✓ 常见电商分类添加完成！');
    
    // Show summary
    const allCategories = await categoryModel.findAll({ includeInactive: false });
    const level1Categories = allCategories.filter(c => c.level === 1);
    console.log(`\n当前共有 ${level1Categories.length} 个一级分类:`);
    level1Categories
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(cat => {
        console.log(`  - ${cat.name} (Order: ${cat.displayOrder})`);
      });
  } catch (error) {
    console.error('✗ 添加分类时出错:', error);
    throw error;
  }
}

// Run the script if executed directly
if (require.main === module) {
  addCommonEcommerceCategories()
    .then(() => {
      console.log('\n脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { addCommonEcommerceCategories };

