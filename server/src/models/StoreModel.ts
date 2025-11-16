import { pool } from '../config/database';
import { Store, Location, CreateStoreRequest, UpdateStoreRequest } from '../types/store';
import { v4 as uuidv4 } from 'uuid';

export class StoreModel {
  // Get all stores
  static async findAll(): Promise<Store[]> {
    let connection;
    try {
      connection = await pool.getConnection();
      const [stores] = await connection.execute(`
        SELECT 
          s.*,
          COALESCE(GROUP_CONCAT(DISTINCT sc.category), '') as categories,
          COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'streetAddress', sl.street_address,
              'aptNumber', sl.apt_number,
              'city', sl.city,
              'stateProvince', sl.state_province,
              'zipCode', sl.zip_code,
              'country', sl.country
            )
            ),
            JSON_ARRAY()
          ) as locations
        FROM stores s
        LEFT JOIN store_categories sc ON s.id COLLATE utf8mb4_unicode_ci = sc.store_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN store_locations sl ON s.id COLLATE utf8mb4_unicode_ci = sl.store_id COLLATE utf8mb4_unicode_ci
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `);

      const storesArray = stores as any[];
      if (!storesArray || storesArray.length === 0) {
        return [];
      }
      return storesArray.map(this.mapRowToStore);
    } catch (error: any) {
      console.error('Database error in findAll:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      // If table doesn't exist, return empty array instead of throwing
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
        console.warn('Stores table does not exist yet, returning empty array');
        return [];
      }
      // If connection failed, return empty array
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.warn('Database connection failed, returning empty array');
        return [];
      }
      throw error;
    } finally {
      if (connection) {
      connection.release();
      }
    }
  }

  // Get all stores with pagination
  static async findAllWithPagination(options?: { limit?: number; offset?: number }): Promise<{ stores: Store[]; total: number }> {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get total count
      const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM stores`);
      const total = (countResult as any[])[0]?.total || 0;

      let query = `
        SELECT 
          s.*,
          COALESCE(GROUP_CONCAT(DISTINCT sc.category), '') as categories,
          COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'streetAddress', sl.street_address,
              'aptNumber', sl.apt_number,
              'city', sl.city,
              'stateProvince', sl.state_province,
              'zipCode', sl.zip_code,
              'country', sl.country
            )
            ),
            JSON_ARRAY()
          ) as locations
        FROM stores s
        LEFT JOIN store_categories sc ON s.id COLLATE utf8mb4_unicode_ci = sc.store_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN store_locations sl ON s.id COLLATE utf8mb4_unicode_ci = sl.store_id COLLATE utf8mb4_unicode_ci
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `;

      const limitValue = options?.limit !== undefined ? Math.max(0, Math.floor(options.limit)) : undefined;
      const offsetValue = options?.offset !== undefined ? Math.max(0, Math.floor(options.offset)) : undefined;

      if (limitValue !== undefined) {
        query += ` LIMIT ${limitValue}`;
        if (offsetValue !== undefined) {
          query += ` OFFSET ${offsetValue}`;
        }
      }

      const [stores] = await connection.execute(query);

      const storesArray = stores as any[];
      if (!storesArray || storesArray.length === 0) {
        return { stores: [], total };
      }
      return { stores: storesArray.map(this.mapRowToStore), total };
    } catch (error: any) {
      console.error('Database error in findAllWithPagination:', error);
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
        return { stores: [], total: 0 };
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        return { stores: [], total: 0 };
      }
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Get store by ID
  static async findById(id: string): Promise<Store | null> {
    let connection;
    try {
      connection = await pool.getConnection();
      const [stores] = await connection.execute(`
        SELECT 
          s.*,
          COALESCE(GROUP_CONCAT(DISTINCT sc.category), '') as categories,
          COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'streetAddress', sl.street_address,
              'aptNumber', sl.apt_number,
              'city', sl.city,
              'stateProvince', sl.state_province,
              'zipCode', sl.zip_code,
              'country', sl.country
            )
            ),
            JSON_ARRAY()
          ) as locations
        FROM stores s
        LEFT JOIN store_categories sc ON s.id COLLATE utf8mb4_unicode_ci = sc.store_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN store_locations sl ON s.id COLLATE utf8mb4_unicode_ci = sl.store_id COLLATE utf8mb4_unicode_ci
        WHERE s.id = ?
        GROUP BY s.id
      `, [id]);

      const results = stores as any[];
      return results.length > 0 ? this.mapRowToStore(results[0]) : null;
    } catch (error: any) {
      console.error('Database error in findById:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      // If table doesn't exist, return null instead of throwing
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
        console.warn('Stores table does not exist yet, returning null');
        return null;
      }
      // If connection failed, return null
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.warn('Database connection failed, returning null');
        return null;
      }
      throw error;
    } finally {
      if (connection) {
      connection.release();
      }
    }
  }

  // Create new store
  static async create(storeData: CreateStoreRequest): Promise<Store> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const storeId = uuidv4();
      const now = new Date();

      const categories = storeData.category ?? [];
      const rating = storeData.rating ?? 0;
      const reviewCount = storeData.reviewCount ?? 0;
      const imageUrl = storeData.imageUrl ?? "/images/default-store.png";
      const isVerified = storeData.isVerified ?? false;
      const isActive = storeData.isActive ?? true;
      const productsCount = storeData.productsCount ?? 0;
      const discount = storeData.discount ?? null;
      const locations = storeData.location && storeData.location.length > 0
        ? storeData.location
        : null;

      if (!locations) {
        throw new Error("At least one location is required");
      }

      // Insert store
      await connection.execute(`
        INSERT INTO stores (
          id, name, description, rating, review_count, image_url, is_verified, is_active,
          products_count, established_year, discount, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        storeId,
        storeData.name,
        storeData.description,
        rating,
        reviewCount,
        imageUrl,
        isVerified,
        isActive,
        productsCount,
        storeData.establishedYear,
        discount,
        now,
        now
      ]);

      // Insert categories
      if (categories.length > 0) {
        for (const category of categories) {
          await connection.execute(`
            INSERT INTO store_categories (store_id, category) VALUES (?, ?)
          `, [storeId, category]);
        }
      }

      // Insert locations
      for (const location of locations) {
        await connection.execute(`
          INSERT INTO store_locations (
            store_id, street_address, apt_number, city, state_province, zip_code, country
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          storeId,
          location.streetAddress,
          location.aptNumber || null,
          location.city,
          location.stateProvince,
          location.zipCode,
          location.country
        ]);
      }

      await connection.commit();

      // Return the created store
      const createdStore = await this.findById(storeId);
      if (!createdStore) {
        throw new Error('Failed to retrieve created store');
      }
      return createdStore;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update store
  static async update(id: string, updateData: UpdateStoreRequest): Promise<Store | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const now = new Date();

      const name = updateData.name ?? null;
      const description = updateData.description ?? null;
      const rating = updateData.rating ?? null;
      const reviewCount = updateData.reviewCount ?? null;
      const imageUrl = updateData.imageUrl ?? null;
      const isVerified = updateData.isVerified ?? null;
      const isActive = updateData.isActive ?? null;
      const productsCount = updateData.productsCount ?? null;
      const establishedYear = updateData.establishedYear ?? null;
      const discount = updateData.discount ?? null;

      // Update store
      await connection.execute(`
        UPDATE stores SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          rating = COALESCE(?, rating),
          review_count = COALESCE(?, review_count),
          image_url = COALESCE(?, image_url),
          is_verified = COALESCE(?, is_verified),
          is_active = COALESCE(?, is_active),
          products_count = COALESCE(?, products_count),
          established_year = COALESCE(?, established_year),
          discount = COALESCE(?, discount),
          updated_at = ?
        WHERE id = ?
      `, [
        name,
        description,
        rating,
        reviewCount,
        imageUrl,
        isVerified,
        isActive,
        productsCount,
        establishedYear,
        discount,
        now,
        id
      ]);

      // Update categories if provided
      if (updateData.category) {
        await connection.execute(`DELETE FROM store_categories WHERE store_id = ?`, [id]);
        for (const category of updateData.category) {
          await connection.execute(`
            INSERT INTO store_categories (store_id, category) VALUES (?, ?)
          `, [id, category]);
        }
      }

      // Update locations if provided
      if (updateData.location) {
        await connection.execute(`DELETE FROM store_locations WHERE store_id = ?`, [id]);
        for (const location of updateData.location) {
          await connection.execute(`
            INSERT INTO store_locations (
              store_id, street_address, apt_number, city, state_province, zip_code, country
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            id,
            location.streetAddress,
            location.aptNumber || null,
            location.city,
            location.stateProvince,
            location.zipCode,
            location.country
          ]);
        }
      }

      await connection.commit();

      return await this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete store
  static async delete(id: string): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(`DELETE FROM stores WHERE id = ?`, [id]);
      return (result as any).affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  // Search stores
  static async search(query: string): Promise<Store[]> {
    const connection = await pool.getConnection();
    try {
      const searchTerm = `%${query}%`;
      const [stores] = await connection.execute(`
        SELECT DISTINCT
          s.*,
          GROUP_CONCAT(sc.category) as categories,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'streetAddress', sl.street_address,
              'aptNumber', sl.apt_number,
              'city', sl.city,
              'stateProvince', sl.state_province,
              'zipCode', sl.zip_code,
              'country', sl.country
            )
          ) as locations
        FROM stores s
        LEFT JOIN store_categories sc ON s.id COLLATE utf8mb4_unicode_ci = sc.store_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN store_locations sl ON s.id COLLATE utf8mb4_unicode_ci = sl.store_id COLLATE utf8mb4_unicode_ci
        WHERE s.name LIKE ? 
           OR s.description LIKE ?
           OR sc.category LIKE ?
           OR sl.city LIKE ?
           OR sl.state_province LIKE ?
           OR sl.country LIKE ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);

      return (stores as any[]).map(this.mapRowToStore);
    } finally {
      connection.release();
    }
  }

  // Get stores by category
  static async findByCategory(category: string): Promise<Store[]> {
    const connection = await pool.getConnection();
    try {
      const [stores] = await connection.execute(`
        SELECT 
          s.*,
          GROUP_CONCAT(sc.category) as categories,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'streetAddress', sl.street_address,
              'aptNumber', sl.apt_number,
              'city', sl.city,
              'stateProvince', sl.state_province,
              'zipCode', sl.zip_code,
              'country', sl.country
            )
          ) as locations
        FROM stores s
        LEFT JOIN store_categories sc ON s.id COLLATE utf8mb4_unicode_ci = sc.store_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN store_locations sl ON s.id COLLATE utf8mb4_unicode_ci = sl.store_id COLLATE utf8mb4_unicode_ci
        WHERE sc.category = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `, [category]);

      return (stores as any[]).map(this.mapRowToStore);
    } finally {
      connection.release();
    }
  }


  // Get all categories
  static async getCategories(): Promise<string[]> {
    let connection;
    try {
      connection = await pool.getConnection();
      const [categories] = await connection.execute(`
        SELECT DISTINCT category FROM store_categories ORDER BY category
      `);
      const categoriesArray = categories as any[];
      if (!categoriesArray || categoriesArray.length === 0) {
        return [];
      }
      return categoriesArray.map(row => row.category);
    } catch (error: any) {
      console.error('Database error in getCategories:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      // If table doesn't exist, return empty array instead of throwing
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
        console.warn('Store categories table does not exist yet, returning empty array');
        return [];
      }
      // If connection failed, return empty array
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.warn('Database connection failed, returning empty array');
        return [];
      }
      throw error;
    } finally {
      if (connection) {
      connection.release();
      }
    }
  }

  // Map database row to Store object
  private static mapRowToStore(row: any): Store {
    const store: Store = {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.categories ? row.categories.split(',') : [],
      rating: parseFloat(row.rating),
      reviewCount: row.review_count,
      imageUrl: row.image_url,
      isVerified: Boolean(row.is_verified),
      isActive: Boolean(row.is_active),
      location: [],
      productsCount: row.products_count,
      establishedYear: row.established_year,
      discount: row.discount,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    // Parse locations safely
    if (row.locations) {
      try {
        // Handle different types of invalid data
        if (typeof row.locations === 'string') {
          if (row.locations === '[object Object]' || row.locations === '' || !row.locations.startsWith('[')) {
            store.location = [];
          } else {
            store.location = JSON.parse(row.locations);
          }
        } else if (Array.isArray(row.locations)) {
          store.location = row.locations;
        } else {
          store.location = [];
        }
      } catch (error) {
        console.error('Error parsing locations:', error);
        store.location = [];
      }
    }


    return store;
  }

  // Get the last modified timestamp of stores (for ETag generation)
  static async getLastModifiedTimestamp(): Promise<string> {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(`
        SELECT MAX(updated_at) as last_modified
        FROM stores
      `);
      const lastModified = (result as any[])[0]?.last_modified;
      return lastModified ? new Date(lastModified).getTime().toString() : '0';
    } catch (error: any) {
      console.error('Error getting last modified timestamp:', error);
      // Return current timestamp as fallback
      return Date.now().toString();
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}
