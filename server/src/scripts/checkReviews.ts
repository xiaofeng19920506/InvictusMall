import { pool } from '../config/database';
import { logger } from '../utils/logger';

async function checkReviews() {
  const connection = await pool.getConnection();
  try {
    console.log('🔍 Checking product_reviews table...\n');

    // Get all reviews
    const [reviews] = await connection.execute(`
      SELECT 
        pr.id,
        pr.product_id,
        pr.user_id,
        pr.order_id,
        pr.rating,
        pr.title,
        pr.comment,
        pr.is_verified_purchase,
        pr.helpful_count,
        pr.images,
        pr.created_at,
        pr.updated_at,
        p.name as product_name,
        p.store_id,
        s.name as store_name,
        u.first_name,
        u.last_name,
        u.email
      FROM product_reviews pr
      LEFT JOIN products p ON pr.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN users u ON pr.user_id = u.id
      ORDER BY pr.created_at DESC
    `);

    const reviewsList = reviews as any[];
    console.log(`📊 Total reviews found: ${reviewsList.length}\n`);

    if (reviewsList.length === 0) {
      console.log('❌ No reviews found in database');
      return;
    }

    // Display each review
    reviewsList.forEach((review, index) => {
      console.log(`\n--- Review ${index + 1} ---`);
      console.log(`ID: ${review.id}`);
      console.log(`Product ID: ${review.product_id}`);
      console.log(`Product Name: ${review.product_name || 'N/A'}`);
      console.log(`Store ID: ${review.store_id || 'N/A'}`);
      console.log(`Store Name: ${review.store_name || 'N/A'}`);
      console.log(`User ID: ${review.user_id}`);
      console.log(`User: ${review.first_name || ''} ${review.last_name || ''} (${review.email || 'N/A'})`);
      console.log(`Order ID: ${review.order_id || 'N/A'}`);
      console.log(`Rating: ${review.rating}/5`);
      console.log(`Title: ${review.title || 'N/A'}`);
      console.log(`Comment: ${review.comment || 'N/A'}`);
      console.log(`Verified Purchase: ${review.is_verified_purchase ? 'Yes' : 'No'}`);
      console.log(`Helpful Count: ${review.helpful_count}`);
      console.log(`Images: ${review.images ? JSON.parse(review.images).length : 0} image(s)`);
      console.log(`Created At: ${review.created_at}`);
      console.log(`Updated At: ${review.updated_at}`);
    });

    // Check product review stats
    console.log('\n\n📈 Product Review Statistics:');
    const [stats] = await connection.execute(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.store_id,
        s.name as store_name,
        COUNT(pr.id) as review_count,
        AVG(pr.rating) as average_rating,
        p.average_rating as product_average_rating,
        p.review_count as product_review_count
      FROM products p
      LEFT JOIN product_reviews pr ON p.id = pr.product_id
      LEFT JOIN stores s ON p.store_id = s.id
      GROUP BY p.id, p.name, p.store_id, s.name, p.average_rating, p.review_count
      ORDER BY review_count DESC
    `);

    const statsList = stats as any[];
    statsList.forEach((stat) => {
      console.log(`\nProduct: ${stat.product_name} (${stat.product_id})`);
      console.log(`  Store: ${stat.store_name || 'N/A'} (${stat.store_id || 'N/A'})`);
      console.log(`  Actual Review Count: ${stat.review_count}`);
      console.log(`  Product Review Count (stored): ${stat.product_review_count || 0}`);
      console.log(`  Actual Average Rating: ${parseFloat(stat.average_rating || 0).toFixed(2)}`);
      console.log(`  Product Average Rating (stored): ${parseFloat(stat.product_average_rating || 0).toFixed(2)}`);
    });

    // Check store review stats
    console.log('\n\n🏪 Store Review Statistics:');
    const [storeStats] = await connection.execute(`
      SELECT 
        s.id as store_id,
        s.name as store_name,
        s.rating as store_rating,
        s.review_count as store_review_count,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(pr.id) as total_reviews,
        AVG(pr.rating) as average_rating
      FROM stores s
      LEFT JOIN products p ON s.id = p.store_id
      LEFT JOIN product_reviews pr ON p.id = pr.product_id
      GROUP BY s.id, s.name, s.rating, s.review_count
      HAVING total_reviews > 0 OR store_review_count > 0
      ORDER BY total_reviews DESC
    `);

    const storeStatsList = storeStats as any[];
    storeStatsList.forEach((stat) => {
      console.log(`\nStore: ${stat.store_name} (${stat.store_id})`);
      console.log(`  Products: ${stat.product_count}`);
      console.log(`  Actual Total Reviews: ${stat.total_reviews}`);
      console.log(`  Store Review Count (stored): ${stat.store_review_count || 0}`);
      console.log(`  Actual Average Rating: ${parseFloat(stat.average_rating || 0).toFixed(2)}`);
      console.log(`  Store Rating (stored): ${parseFloat(stat.store_rating || 0).toFixed(2)}`);
    });

  } catch (error: any) {
    logger.error('Error checking reviews:', error);
    console.error('Error:', error);
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  checkReviews()
    .then(() => {
      console.log('\n✅ Review check completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Review check failed:', err);
      process.exit(1);
    });
}

