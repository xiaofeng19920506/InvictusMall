import { ProductReviewModel } from '../models/ProductReviewModel';
import { logger } from '../utils/logger';

async function fixStoreReviewStats() {
  try {
    console.log('🔧 Fixing store review statistics...\n');

    const reviewModel = new ProductReviewModel();

    // Get all products with reviews
    const { pool } = await import('../config/database');
    const connection = await pool.getConnection();
    
    try {
      const [products] = await connection.execute(`
        SELECT DISTINCT p.id, p.store_id, p.name, s.name as store_name
        FROM products p
        INNER JOIN product_reviews pr ON p.id = pr.product_id
        LEFT JOIN stores s ON p.store_id = s.id
      `);

      const productsList = products as any[];
      console.log(`Found ${productsList.length} products with reviews\n`);

      // Update store stats for each product
      for (const product of productsList) {
        console.log(`Updating store stats for product: ${product.name} (${product.id})`);
        console.log(`  Store: ${product.store_name} (${product.store_id})`);
        
        try {
          await reviewModel.updateStoreReviewStats(product.id);
          console.log(`  ✅ Updated store stats\n`);
        } catch (error: any) {
          console.error(`  ❌ Error updating store stats:`, error.message);
        }
      }

      // Verify the update
      console.log('\n📊 Verifying store statistics...\n');
      const [storeStats] = await connection.execute(`
        SELECT 
          s.id,
          s.name,
          s.rating,
          s.review_count,
          COUNT(DISTINCT p.id) as product_count,
          COUNT(pr.id) as actual_review_count,
          AVG(pr.rating) as actual_average_rating
        FROM stores s
        LEFT JOIN products p ON s.id = p.store_id
        LEFT JOIN product_reviews pr ON p.id = pr.product_id
        GROUP BY s.id, s.name, s.rating, s.review_count
        HAVING actual_review_count > 0 OR review_count > 0
      `);

      const statsList = storeStats as any[];
      statsList.forEach((stat) => {
        console.log(`Store: ${stat.name} (${stat.id})`);
        console.log(`  Stored Review Count: ${stat.review_count}`);
        console.log(`  Actual Review Count: ${stat.actual_review_count}`);
        console.log(`  Stored Rating: ${parseFloat(stat.rating || 0).toFixed(2)}`);
        console.log(`  Actual Average Rating: ${parseFloat(stat.actual_average_rating || 0).toFixed(2)}`);
        console.log('');
      });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    logger.error('Error fixing store review stats:', error);
    console.error('Error:', error);
  }
}

if (require.main === module) {
  fixStoreReviewStats()
    .then(() => {
      console.log('\n✅ Store review stats fix completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Store review stats fix failed:', err);
      process.exit(1);
    });
}

