import { pool } from '../config/database';
import { Product, CreateProductRequest, UpdateProductRequest } from '../types/product';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class ProductModel {
  // Map database row to Product object
  private static mapRowToProduct(row: any): Product {
    // Parse image_urls JSON if it exists, otherwise fall back to image_url
    let imageUrls: string[] | undefined;
    let imageUrl: string | undefined;
    
    if (row.image_urls) {
      try {
        // If it's already an array (from JSON column), use it directly
        if (Array.isArray(row.image_urls)) {
          imageUrls = row.image_urls;
        } else if (typeof row.image_urls === 'string') {
          // If it's a JSON string, parse it
          imageUrls = JSON.parse(row.image_urls);
        }
        // Set imageUrl to first image for backward compatibility
        imageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : undefined;
      } catch (e) {
        // If parsing fails, fall back to image_url
        imageUrl = row.image_url || undefined;
      }
    } else if (row.image_url) {
      // Legacy: single image_url
      imageUrl = row.image_url;
      imageUrls = [row.image_url];
    }

    return {
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      description: row.description || undefined,
      price: parseFloat(row.price),
      imageUrl, // For backward compatibility
      imageUrls, // New multi-image support
      stockQuantity: parseInt(row.stock_quantity, 10),
      category: row.category || undefined,
      barcode: row.barcode || undefined,
      serialNumber: row.serial_number || undefined,
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

  // Get all products for a store with pagination
  static async findByStoreIdWithPagination(
    storeId: string,
    options?: { isActive?: boolean; limit?: number; offset?: number }
  ): Promise<{ products: Product[]; total: number }> {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Build WHERE clause for count
      let whereClause = `WHERE store_id = ?`;
      const params: any[] = [storeId];

      if (options?.isActive !== undefined) {
        whereClause += ` AND is_active = ?`;
        params.push(options.isActive);
      }

      // Get total count
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM products ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0]?.total || 0;

      // Get products with pagination
      let query = `SELECT * FROM products ${whereClause} ORDER BY created_at DESC`;
      
      const limitValue = options?.limit !== undefined ? Math.max(0, Math.floor(options.limit)) : undefined;
      const offsetValue = options?.offset !== undefined ? Math.max(0, Math.floor(options.offset)) : undefined;

      if (limitValue !== undefined) {
        query += ` LIMIT ${limitValue}`;
        if (offsetValue !== undefined) {
          query += ` OFFSET ${offsetValue}`;
        }
      }

      const [rows] = await connection.execute(query, params);
      const products = rows as any[];
      
      if (!products || products.length === 0) {
        return { products: [], total };
      }
      
      return { products: products.map(this.mapRowToProduct), total };
    } catch (error: any) {
      console.error('Database error in findByStoreIdWithPagination:', error);
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
      logger.debug('[ProductModel] Finding product by ID', { productId: id });
      connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT * FROM products WHERE id = ?`,
        [id]
      );
      
      const products = rows as any[];
      if (!products || products.length === 0) {
        logger.debug('[ProductModel] Product not found', { productId: id });
        return null;
      }
      
      const product = this.mapRowToProduct(products[0]);
      logger.debug('[ProductModel] Product found', {
        productId: product.id,
        name: product.name,
        stockQuantity: product.stockQuantity,
        rawStockQuantity: products[0].stock_quantity,
        storeId: product.storeId,
      });
      return product;
    } catch (error: any) {
      logger.error('[ProductModel] Database error in findById', {
        productId: id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Get product by barcode
  static async findByBarcode(barcode: string): Promise<Product | null> {
    let connection;
    try {
      console.log(`[ProductModel] 🔍 Searching for product with barcode: ${barcode}`);
      connection = await pool.getConnection();
      const [rows] = await connection.execute(
        `SELECT * FROM products WHERE barcode = ? AND is_active = TRUE LIMIT 1`,
        [barcode]
      );
      
      const products = rows as any[];
      if (!products || products.length === 0) {
        console.log(`[ProductModel] ❌ No product found with barcode: ${barcode}`);
        return null;
      }
      
      console.log(`[ProductModel] ✅ Product found: ${products[0].name} (ID: ${products[0].id})`);
      return this.mapRowToProduct(products[0]);
    } catch (error: any) {
      console.error('[ProductModel] Database error in findByBarcode:', error);
      console.error('[ProductModel] Error details:', {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState,
      });
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

      logger.debug('[ProductModel] Creating product in database', {
        productId,
        storeId: productData.storeId,
        name: productData.name,
        stockQuantity,
        barcode: productData.barcode,
        serialNumber: productData.serialNumber,
      });

      // Handle imageUrls: prefer imageUrls over imageUrl
      const imageUrls = productData.imageUrls || (productData.imageUrl ? [productData.imageUrl] : []);
      const imageUrlsJson = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;
      const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null; // Keep for backward compatibility

      const [insertResult] = await connection.execute(
        `INSERT INTO products (
          id, store_id, name, description, price, image_url, image_urls,
          stock_quantity, category, barcode, serial_number, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          productData.storeId,
          productData.name,
          productData.description || null,
          productData.price,
          imageUrl, // Backward compatibility
          imageUrlsJson, // New JSON column
          stockQuantity,
          productData.category || null,
          productData.barcode || null,
          productData.serialNumber || null,
          isActive,
          now,
          now,
        ]
      );

      const insertAffectedRows = (insertResult as any).affectedRows;
      logger.debug('[ProductModel] Product inserted', {
        productId,
        affectedRows: insertAffectedRows,
        insertedStockQuantity: stockQuantity,
      });

      // Update store's products_count
      const [updateResult] = await connection.execute(
        `UPDATE stores 
         SET products_count = products_count + 1 
         WHERE id = ?`,
        [productData.storeId]
      );

      const updateAffectedRows = (updateResult as any).affectedRows;
      logger.debug('[ProductModel] Store products_count updated', {
        storeId: productData.storeId,
        affectedRows: updateAffectedRows,
      });

      await connection.commit();
      logger.info('[ProductModel] Transaction committed successfully', { productId });

      const createdProduct = await this.findById(productId) as Promise<Product>;
      logger.info('[ProductModel] Product retrieved after creation', {
        productId,
        name: (createdProduct as any).name,
        stockQuantity: (createdProduct as any).stockQuantity,
      });
      return createdProduct;
    } catch (error: any) {
      logger.error('[ProductModel] Error creating product, rolling back transaction', {
        error: error.message,
        stack: error.stack,
        productData: {
          storeId: productData.storeId,
          name: productData.name,
          stockQuantity: productData.stockQuantity,
        },
      });
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
      // Handle imageUrls: prefer imageUrls over imageUrl
      if (productData.imageUrls !== undefined) {
        const imageUrls = productData.imageUrls;
        const imageUrlsJson = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;
        const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
        
        updates.push('image_urls = ?');
        params.push(imageUrlsJson);
        updates.push('image_url = ?'); // Keep for backward compatibility
        params.push(imageUrl);
      } else if (productData.imageUrl !== undefined) {
        // Legacy: single imageUrl
        const imageUrl = productData.imageUrl || null;
        updates.push('image_url = ?');
        params.push(imageUrl);
        updates.push('image_urls = ?');
        params.push(imageUrl ? JSON.stringify([imageUrl]) : null);
      }
      if (productData.stockQuantity !== undefined) {
        updates.push('stock_quantity = ?');
        params.push(productData.stockQuantity);
      }
      if (productData.category !== undefined) {
        updates.push('category = ?');
        params.push(productData.category || null);
      }
      if (productData.barcode !== undefined) {
        updates.push('barcode = ?');
        params.push(productData.barcode || null);
      }
      if (productData.serialNumber !== undefined) {
        updates.push('serial_number = ?');
        params.push(productData.serialNumber || null);
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

  // Get the last modified timestamp of products (for ETag generation)
  static async getLastModifiedTimestamp(storeId?: string): Promise<string> {
    let connection;
    try {
      connection = await pool.getConnection();
      let query = `SELECT MAX(updated_at) as last_modified FROM products`;
      const params: any[] = [];
      
      if (storeId) {
        query += ` WHERE store_id = ?`;
        params.push(storeId);
      }
      
      const [result] = await connection.execute(query, params);
      const lastModified = (result as any[])[0]?.last_modified;
      return lastModified ? new Date(lastModified).getTime().toString() : '0';
    } catch (error: any) {
      console.error('Error getting last modified timestamp for products:', error);
      return Date.now().toString();
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

