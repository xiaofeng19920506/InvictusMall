import { pool } from '../config/database';
import { Product, CreateProductRequest, UpdateProductRequest } from '../types/product';
import { v4 as uuidv4 } from 'uuid';

export class ProductModel {
  // Map database row to Product object
  private static mapRowToProduct(row: any): Product {
    return {
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      description: row.description || undefined,
      price: parseFloat(row.price),
      imageUrl: row.image_url || undefined,
      stockQuantity: parseInt(row.stock_quantity, 10),
      category: row.category || undefined,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Get all products for a store
  static async findByStoreId(storeId: string, options?: { isActive?: boolean }): Promise<Product[]> {
    let connection;
    try {
      connection = await pool.getConnection();
      let query = `
        SELECT * FROM products
        WHERE store_id = ?
      `;
      const params: any[] = [storeId];

      if (options?.isActive !== undefined) {
        query += ` AND is_active = ?`;
        params.push(options.isActive);
      }

      query += ` ORDER BY created_at DESC`;

      const [rows] = await connection.execute(query, params);
      const products = rows as any[];
      
      if (!products || products.length === 0) {
        return [];
      }
      
      return products.map(this.mapRowToProduct);
    } catch (error: any) {
      console.error('Database error in findByStoreId:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Get product by ID
  static async findById(id: string): Promise<Product | null> {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT * FROM products WHERE id = ?`,
        [id]
      );
      
      const products = rows as any[];
      if (!products || products.length === 0) {
        return null;
      }
      
      return this.mapRowToProduct(products[0]);
    } catch (error: any) {
      console.error('Database error in findById:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Create new product
  static async create(productData: CreateProductRequest): Promise<Product> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const productId = uuidv4();
      const now = new Date();
      const stockQuantity = productData.stockQuantity ?? 0;
      const isActive = productData.isActive ?? true;

      await connection.execute(
        `INSERT INTO products (
          id, store_id, name, description, price, image_url,
          stock_quantity, category, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          productData.storeId,
          productData.name,
          productData.description || null,
          productData.price,
          productData.imageUrl || null,
          stockQuantity,
          productData.category || null,
          isActive,
          now,
          now,
        ]
      );

      // Update store's products_count
      await connection.execute(
        `UPDATE stores 
         SET products_count = products_count + 1 
         WHERE id = ?`,
        [productData.storeId]
      );

      await connection.commit();
      return this.findById(productId) as Promise<Product>;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update product
  static async update(id: string, productData: UpdateProductRequest): Promise<Product> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const now = new Date();
      const updates: string[] = [];
      const params: any[] = [];

      if (productData.name !== undefined) {
        updates.push('name = ?');
        params.push(productData.name);
      }
      if (productData.description !== undefined) {
        updates.push('description = ?');
        params.push(productData.description || null);
      }
      if (productData.price !== undefined) {
        updates.push('price = ?');
        params.push(productData.price);
      }
      if (productData.imageUrl !== undefined) {
        updates.push('image_url = ?');
        params.push(productData.imageUrl || null);
      }
      if (productData.stockQuantity !== undefined) {
        updates.push('stock_quantity = ?');
        params.push(productData.stockQuantity);
      }
      if (productData.category !== undefined) {
        updates.push('category = ?');
        params.push(productData.category || null);
      }
      if (productData.isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(productData.isActive);
      }

      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);

      await connection.execute(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      await connection.commit();
      return this.findById(id) as Promise<Product>;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete product
  static async delete(id: string): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get store_id before deleting to update products_count
      const product = await this.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      await connection.execute(`DELETE FROM products WHERE id = ?`, [id]);

      // Update store's products_count
      await connection.execute(
        `UPDATE stores 
         SET products_count = GREATEST(products_count - 1, 0)
         WHERE id = ?`,
        [product.storeId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Check if product belongs to store
  static async belongsToStore(productId: string, storeId: string): Promise<boolean> {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT id FROM products WHERE id = ? AND store_id = ?`,
        [productId, storeId]
      );
      
      const products = rows as any[];
      return products.length > 0;
    } catch (error: any) {
      console.error('Database error in belongsToStore:', error);
      return false;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

