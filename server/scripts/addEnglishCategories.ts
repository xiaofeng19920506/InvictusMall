import { CategoryModel } from '../src/models/CategoryModel';
import '../src/config/database';

interface CategorySeed {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  children?: CategorySeed[];
}

const englishEcommerceCategories: CategorySeed[] = [
  {
    name: 'Fashion & Accessories',
    slug: 'fashion-accessories-en',
    description: 'Fashion clothing, shoes, and accessories',
    displayOrder: 1,
    children: [
      {
        name: "Men's Clothing",
        slug: 'mens-clothing-en',
        children: [
          { name: 'T-Shirts', slug: 'mens-t-shirts-en' },
          { name: 'Shirts', slug: 'mens-shirts-en' },
          { name: 'Pants', slug: 'mens-pants-en' },
          { name: 'Jackets', slug: 'mens-jackets-en' },
          { name: 'Sportswear', slug: 'mens-sportswear-en' },
        ],
      },
      {
        name: "Women's Clothing",
        slug: 'womens-clothing-en',
        children: [
          { name: 'Dresses', slug: 'womens-dresses-en' },
          { name: 'Tops', slug: 'womens-tops-en' },
          { name: 'Pants', slug: 'womens-pants-en' },
          { name: 'Jackets', slug: 'womens-jackets-en' },
          { name: 'Sportswear', slug: 'womens-sportswear-en' },
        ],
      },
      {
        name: 'Shoes',
        slug: 'shoes-en',
        children: [
          { name: 'Sneakers', slug: 'sneakers-en' },
          { name: 'Casual Shoes', slug: 'casual-shoes-en' },
          { name: 'Dress Shoes', slug: 'dress-shoes-en' },
          { name: 'Boots', slug: 'boots-en' },
          { name: 'Sandals', slug: 'sandals-en' },
        ],
      },
      {
        name: 'Accessories',
        slug: 'accessories-en',
        children: [
          { name: 'Bags', slug: 'bags-en' },
          { name: 'Watches', slug: 'watches-en' },
          { name: 'Jewelry', slug: 'jewelry-en' },
          { name: 'Sunglasses', slug: 'sunglasses-en' },
          { name: 'Hats', slug: 'hats-en' },
        ],
      },
    ],
  },
  {
    name: 'Home & Furniture',
    slug: 'home-furniture-en',
    description: 'Furniture, decor, and home essentials',
    displayOrder: 2,
    children: [
      {
        name: 'Furniture',
        slug: 'furniture-en',
        children: [
          { name: 'Sofas', slug: 'sofas-en' },
          { name: 'Beds', slug: 'beds-en' },
          { name: 'Tables', slug: 'tables-en' },
          { name: 'Chairs', slug: 'chairs-en' },
          { name: 'Storage', slug: 'storage-en' },
        ],
      },
      {
        name: 'Home Decor',
        slug: 'decor-en',
        children: [
          { name: 'Wall Decor', slug: 'wall-decor-en' },
          { name: 'Lighting', slug: 'lighting-en' },
          { name: 'Rugs', slug: 'rugs-en' },
          { name: 'Curtains', slug: 'curtains-en' },
          { name: 'Vases', slug: 'vases-en' },
        ],
      },
      {
        name: 'Kitchen',
        slug: 'kitchen-en',
        children: [
          { name: 'Cookware', slug: 'cookware-en' },
          { name: 'Dining Ware', slug: 'dining-ware-en' },
          { name: 'Small Appliances', slug: 'small-appliances-en' },
          { name: 'Kitchen Storage', slug: 'kitchen-storage-en' },
        ],
      },
      {
        name: 'Bedding',
        slug: 'bedding-en',
        children: [
          { name: 'Bed Sheets', slug: 'bed-sheets-en' },
          { name: 'Comforters', slug: 'comforters-en' },
          { name: 'Pillows', slug: 'pillows-en' },
          { name: 'Blankets', slug: 'blankets-en' },
        ],
      },
    ],
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care-en',
    description: 'Cosmetics, skincare, and personal care products',
    displayOrder: 3,
    children: [
      {
        name: 'Skincare',
        slug: 'skincare-en',
        children: [
          { name: 'Cleansers', slug: 'cleansers-en' },
          { name: 'Serums', slug: 'serums-en' },
          { name: 'Moisturizers', slug: 'moisturizers-en' },
          { name: 'Face Masks', slug: 'face-masks-en' },
          { name: 'Sunscreen', slug: 'sunscreen-en' },
        ],
      },
      {
        name: 'Makeup',
        slug: 'makeup-en',
        children: [
          { name: 'Foundation', slug: 'foundation-en' },
          { name: 'Eye Makeup', slug: 'eye-makeup-en' },
          { name: 'Lip Makeup', slug: 'lip-makeup-en' },
          { name: 'Blush', slug: 'blush-en' },
          { name: 'Makeup Tools', slug: 'makeup-tools-en' },
        ],
      },
      {
        name: 'Fragrance',
        slug: 'fragrance-en',
        children: [
          { name: "Women's Fragrance", slug: 'womens-fragrance-en' },
          { name: "Men's Fragrance", slug: 'mens-fragrance-en' },
          { name: 'Unisex Fragrance', slug: 'unisex-fragrance-en' },
        ],
      },
      {
        name: 'Personal Care',
        slug: 'personal-care-en',
        children: [
          { name: 'Hair Care', slug: 'hair-care-en' },
          { name: 'Body Care', slug: 'body-care-en' },
          { name: 'Oral Care', slug: 'oral-care-en' },
          { name: "Men's Grooming", slug: 'mens-grooming-en' },
        ],
      },
    ],
  },
  {
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
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors-en',
    description: 'Sports equipment and outdoor gear',
    displayOrder: 5,
    children: [
      {
        name: 'Sports Equipment',
        slug: 'sports-equipment-en',
        children: [
          { name: 'Fitness Equipment', slug: 'fitness-equipment-en' },
          { name: 'Balls', slug: 'balls-en' },
          { name: 'Yoga', slug: 'yoga-en' },
          { name: 'Running Gear', slug: 'running-gear-en' },
        ],
      },
      {
        name: 'Outdoor Gear',
        slug: 'outdoor-gear-en',
        children: [
          { name: 'Camping Gear', slug: 'camping-gear-en' },
          { name: 'Hiking Gear', slug: 'hiking-gear-en' },
          { name: 'Fishing Gear', slug: 'fishing-gear-en' },
          { name: 'Bicycles', slug: 'bicycles-en' },
        ],
      },
      {
        name: 'Sports Apparel',
        slug: 'sports-apparel-en',
        children: [
          { name: 'Sports T-Shirts', slug: 'sports-t-shirts-en' },
          { name: 'Sports Pants', slug: 'sports-pants-en' },
          { name: 'Athletic Shoes', slug: 'athletic-shoes-en' },
          { name: 'Sports Accessories', slug: 'sports-accessories-en' },
        ],
      },
    ],
  },
  {
    name: 'Books & Media',
    slug: 'books-media-en',
    description: 'Books, ebooks, and media',
    displayOrder: 6,
    children: [
      {
        name: 'Books',
        slug: 'books-en',
        children: [
          { name: 'Fiction', slug: 'fiction-en' },
          { name: 'Non-Fiction', slug: 'non-fiction-en' },
          { name: 'Education', slug: 'education-en' },
          { name: 'Children Books', slug: 'children-books-en' },
          { name: 'Comics', slug: 'comics-en' },
        ],
      },
      {
        name: 'Ebooks',
        slug: 'ebooks-en',
        children: [
          { name: 'Fiction Ebooks', slug: 'fiction-ebooks-en' },
          { name: 'Education Ebooks', slug: 'education-ebooks-en' },
          { name: 'Professional Ebooks', slug: 'professional-ebooks-en' },
        ],
      },
      {
        name: 'Media',
        slug: 'media-en',
        children: [
          { name: 'CDs', slug: 'cds-en' },
          { name: 'DVDs', slug: 'dvds-en' },
          { name: 'Blu-ray', slug: 'blu-ray-en' },
        ],
      },
    ],
  },
  {
    name: 'Automotive',
    slug: 'automotive-en',
    description: 'Car parts and accessories',
    displayOrder: 7,
    children: [
      {
        name: 'Car Parts',
        slug: 'car-parts-en',
        children: [
          { name: 'Tires', slug: 'tires-en' },
          { name: 'Batteries', slug: 'batteries-en' },
          { name: 'Motor Oil', slug: 'motor-oil-en' },
          { name: 'Filters', slug: 'filters-en' },
        ],
      },
      {
        name: 'Car Accessories',
        slug: 'car-accessories-en',
        children: [
          { name: 'Seat Covers', slug: 'seat-covers-en' },
          { name: 'Floor Mats', slug: 'floor-mats-en' },
          { name: 'Steering Wheel Covers', slug: 'steering-wheel-covers-en' },
          { name: 'Car Electronics', slug: 'car-electronics-en' },
        ],
      },
      {
        name: 'Car Care',
        slug: 'car-care-en',
        children: [
          { name: 'Car Wash', slug: 'car-wash-en' },
          { name: 'Car Wax', slug: 'car-wax-en' },
          { name: 'Cleaning Tools', slug: 'cleaning-tools-en' },
        ],
      },
    ],
  },
  {
    name: 'Baby & Kids',
    slug: 'baby-kids-en',
    description: 'Baby and children products',
    displayOrder: 8,
    children: [
      {
        name: 'Baby Products',
        slug: 'baby-products-en',
        children: [
          { name: 'Baby Formula', slug: 'baby-formula-en' },
          { name: 'Diapers', slug: 'diapers-en' },
          { name: 'Baby Clothing', slug: 'baby-clothing-en' },
          { name: 'Strollers', slug: 'strollers-en' },
          { name: 'Car Seats', slug: 'car-seats-en' },
        ],
      },
      {
        name: 'Kids Products',
        slug: 'kids-products-en',
        children: [
          { name: 'Kids Clothing', slug: 'kids-clothing-en' },
          { name: 'Kids Toys', slug: 'kids-toys-en' },
          { name: 'School Supplies', slug: 'school-supplies-en' },
          { name: 'Kids Furniture', slug: 'kids-furniture-en' },
        ],
      },
    ],
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness-en',
    description: 'Health products and medical supplies',
    displayOrder: 9,
    children: [
      {
        name: 'Health Products',
        slug: 'health-products-en',
        children: [
          { name: 'Vitamins', slug: 'vitamins-en' },
          { name: 'Supplements', slug: 'supplements-en' },
          { name: 'Massage Products', slug: 'massage-products-en' },
          { name: 'Fitness Equipment', slug: 'fitness-equipment-health-en' },
        ],
      },
      {
        name: 'Medical Supplies',
        slug: 'medical-supplies-en',
        children: [
          { name: 'Thermometers', slug: 'thermometers-en' },
          { name: 'Blood Pressure Monitors', slug: 'blood-pressure-monitors-en' },
          { name: 'First Aid', slug: 'first-aid-en' },
          { name: 'Masks', slug: 'masks-en' },
        ],
      },
    ],
  },
  {
    name: 'Toys & Games',
    slug: 'toys-games-en',
    description: 'Toys, games, and models',
    displayOrder: 10,
    children: [
      {
        name: 'Toys',
        slug: 'toys-en',
        children: [
          { name: 'Building Blocks', slug: 'building-blocks-en' },
          { name: 'Plush Toys', slug: 'plush-toys-en' },
          { name: 'Remote Control Toys', slug: 'remote-control-toys-en' },
          { name: 'Educational Toys', slug: 'educational-toys-en' },
        ],
      },
      {
        name: 'Games',
        slug: 'games-en',
        children: [
          { name: 'Board Games', slug: 'board-games-en' },
          { name: 'Card Games', slug: 'card-games-en' },
          { name: 'Puzzles', slug: 'puzzles-en' },
          { name: 'Video Games', slug: 'video-games-en' },
        ],
      },
      {
        name: 'Models',
        slug: 'models-en',
        children: [
          { name: 'Model Kits', slug: 'model-kits-en' },
          { name: 'Figures', slug: 'figures-en' },
          { name: 'Collectibles', slug: 'collectibles-en' },
        ],
      },
    ],
  },
];

async function addEnglishCategories() {
  const categoryModel = new CategoryModel();

  try {
    console.log('Starting to add English ecommerce categories...');

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
          console.log(`Category already exists, skipping: ${categoryData.name} (${slug})`);
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

        console.log(`✓ Created category: ${category.name} (Level ${category.level}, Order ${category.displayOrder})`);

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
          console.log(`Category already exists, skipping: ${categoryData.name}`);
        } else {
          console.error(`✗ Failed to create category ${categoryData.name}:`, error.message || error);
        }
      }
    }

    // Create all top-level categories
    for (let i = 0; i < englishEcommerceCategories.length; i++) {
      const categoryData = englishEcommerceCategories[i];
      if (categoryData) {
        await createCategory(categoryData, undefined, 0, categoryData.displayOrder ?? i);
      }
    }

    console.log('\n✓ English ecommerce categories added successfully!');
    
    // Show summary
    const allCategories = await categoryModel.findAll({ includeInactive: false });
    const level1Categories = allCategories.filter(c => c.level === 1);
    console.log(`\nTotal level 1 categories: ${level1Categories.length}`);
    console.log('\nEnglish categories:');
    level1Categories
      .filter(c => c.slug.includes('-en'))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(cat => {
        console.log(`  - ${cat.name} (Order: ${cat.displayOrder})`);
      });
  } catch (error) {
    console.error('✗ Error adding categories:', error);
    throw error;
  }
}

// Run the script if executed directly
if (require.main === module) {
  addEnglishCategories()
    .then(() => {
      console.log('\nScript execution completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nScript execution failed:', error);
      process.exit(1);
    });
}

export { addEnglishCategories };

