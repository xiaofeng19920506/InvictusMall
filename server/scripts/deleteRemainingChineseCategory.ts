import { pool } from '../src/config/database';

async function deleteRemainingChineseCategory() {
  const connection = await pool.getConnection();

  try {
    console.log('删除残留的中文分类...\n');

    // Find the remaining Chinese category
    const [categories] = await connection.execute(`
      SELECT id, name, slug, level, parent_id
      FROM categories
      WHERE name LIKE '%图书%' OR name LIKE '%媒体%' OR name LIKE '%音像%'
    `) as any[];

    if (categories.length === 0) {
      console.log('未找到残留的中文分类。');
      return;
    }

    console.log(`找到 ${categories.length} 个残留的中文分类:`);
    categories.forEach((cat: any) => {
      console.log(`  - ${cat.name} (ID: ${cat.id}, Level: ${cat.level})`);
    });

    // Delete all found categories
    await connection.beginTransaction();

    try {
      const ids = categories.map((c: any) => c.id);
      const placeholders = ids.map(() => '?').join(',');

      const [result] = await connection.execute(
        `DELETE FROM categories WHERE id IN (${placeholders})`,
        ids
      ) as any[];

      await connection.commit();
      console.log(`\n✓ 成功删除 ${result.affectedRows} 个分类！`);

      // Show remaining level 1 categories
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
  deleteRemainingChineseCategory()
    .then(() => {
      console.log('\n脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export { deleteRemainingChineseCategory };

