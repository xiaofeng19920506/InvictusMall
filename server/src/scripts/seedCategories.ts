import { CategoryModel } from '../models/CategoryModel';

interface CategorySeed {
  name: string;
  slug: string;
  description?: string;
  children?: CategorySeed[];
}

const categoriesData: CategorySeed[] = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    children: [
      {
        name: 'Computers & Laptops',
        slug: 'computers-laptops',
        description: 'Desktop computers, laptops, and accessories',
        children: [
          { name: 'Laptops', slug: 'laptops' },
          { name: 'Desktops', slug: 'desktops' },
          { name: 'Computer Accessories', slug: 'computer-accessories' },
          { name: 'Monitors', slug: 'monitors' },
          { name: 'Keyboards & Mice', slug: 'keyboards-mice' },
        ],
      },
      {
        name: 'Mobile Phones & Accessories',
        slug: 'mobile-phones-accessories',
        description: 'Smartphones and mobile accessories',
        children: [
          { name: 'Smartphones', slug: 'smartphones' },
          { name: 'Phone Cases', slug: 'phone-cases' },
          { name: 'Chargers & Cables', slug: 'chargers-cables' },
          { name: 'Screen Protectors', slug: 'screen-protectors' },
          { name: 'Phone Accessories', slug: 'phone-accessories' },
        ],
      },
      {
        name: 'Audio & Headphones',
        slug: 'audio-headphones',
        description: 'Audio equipment and headphones',
        children: [
          { name: 'Headphones', slug: 'headphones' },
          { name: 'Speakers', slug: 'speakers' },
          { name: 'Earbuds', slug: 'earbuds' },
          { name: 'Audio Accessories', slug: 'audio-accessories' },
        ],
      },
      {
        name: 'Gaming',
        slug: 'gaming',
        description: 'Gaming consoles and accessories',
        children: [
          { name: 'Gaming Consoles', slug: 'gaming-consoles' },
          { name: 'Gaming Accessories', slug: 'gaming-accessories' },
          { name: 'Video Games', slug: 'video-games' },
        ],
      },
    ],
  },
  {
    name: 'Pet Supplies',
    slug: 'pet-supplies',
    description: 'Everything for your pets',
    children: [
      {
        name: 'Dogs',
        slug: 'dogs',
        description: 'Products for dogs',
        children: [
          { name: 'Dog Food', slug: 'dog-food' },
          { name: 'Dog Toys', slug: 'dog-toys' },
          { name: 'Dog Accessories', slug: 'dog-accessories' },
          { name: 'Dog Grooming', slug: 'dog-grooming' },
          { name: 'Dog Beds', slug: 'dog-beds' },
        ],
      },
      {
        name: 'Cats',
        slug: 'cats',
        description: 'Products for cats',
        children: [
          { name: 'Cat Food', slug: 'cat-food' },
          { name: 'Cat Toys', slug: 'cat-toys' },
          { name: 'Cat Litter', slug: 'cat-litter' },
          { name: 'Cat Accessories', slug: 'cat-accessories' },
          { name: 'Cat Furniture', slug: 'cat-furniture' },
        ],
      },
      {
        name: 'Fish & Aquarium',
        slug: 'fish-aquarium',
        description: 'Aquarium supplies and fish food',
        children: [
          { name: 'Aquariums', slug: 'aquariums' },
          { name: 'Fish Food', slug: 'fish-food' },
          { name: 'Aquarium Filters', slug: 'aquarium-filters' },
          { name: 'Aquarium Decorations', slug: 'aquarium-decorations' },
        ],
      },
      {
        name: 'Birds',
        slug: 'birds',
        description: 'Products for birds',
        children: [
          { name: 'Bird Food', slug: 'bird-food' },
          { name: 'Bird Cages', slug: 'bird-cages' },
          { name: 'Bird Toys', slug: 'bird-toys' },
          { name: 'Bird Accessories', slug: 'bird-accessories' },
        ],
      },
      {
        name: 'Small Animals',
        slug: 'small-animals',
        description: 'Products for small pets',
        children: [
          { name: 'Small Animal Food', slug: 'small-animal-food' },
          { name: 'Small Animal Cages', slug: 'small-animal-cages' },
          { name: 'Small Animal Accessories', slug: 'small-animal-accessories' },
        ],
      },
    ],
  },
];

async function seedCategories() {
  const categoryModel = new CategoryModel();

  try {
    console.log('Starting category seeding...');

    // Check if categories already exist
    const existingCategories = await categoryModel.findAll({ includeInactive: true });
    if (existingCategories.length > 0) {
      console.log(`Found ${existingCategories.length} existing categories. Skipping seed.`);
      console.log('If you want to re-seed, please clear the categories table first.');
      return;
    }

    // Helper function to calculate level
    function calculateLevel(parentId?: string | null, parentLevel: number = 0): number {
      if (!parentId) {
        return 1;
      }
      return parentLevel + 1;
    }

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
        const level = calculateLevel(parentId, parentLevel);
        const slug = categoryData.slug || generateSlug(categoryData.name);

        const category = await categoryModel.create({
          name: categoryData.name,
          slug,
          description: categoryData.description,
          parentId,
          displayOrder,
          isActive: true,
        });

        console.log(`Created category: ${category.name} (Level ${category.level})`);

        // Create children if they exist
        if (categoryData.children && categoryData.children.length > 0) {
          for (let i = 0; i < categoryData.children.length; i++) {
            const child = categoryData.children[i];
            if (child) {
              await createCategory(child, category.id, level, i);
            }
          }
        }
      } catch (error) {
        console.error(`Error creating category ${categoryData.name}:`, error);
        throw error;
      }
    }

    // Create all top-level categories
    for (let i = 0; i < categoriesData.length; i++) {
      const categoryData = categoriesData[i];
      if (categoryData) {
        await createCategory(categoryData, undefined, 0, i);
      }
    }

    console.log('Category seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding categories:', error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedCategories()
    .then(() => {
      console.log('Seeding finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedCategories };

