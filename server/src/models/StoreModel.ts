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
        LEFT JOIN store_categories sc ON s.id = sc.store_id
        LEFT JOIN store_locations sl ON s.id = sl.store_id
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
        LEFT JOIN store_categories sc ON s.id = sc.store_id
        LEFT JOIN store_locations sl ON s.id = sl.store_id
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

      // Insert store
      await connection.execute(`
        INSERT INTO stores (
          id, name, description, rating, review_count, image_url, is_verified,
          products_count, established_year, discount, membership_type,
          membership_benefits, membership_discount_percentage, membership_priority_support,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        storeId,
        storeData.name,
        storeData.description,
        storeData.rating,
        storeData.reviewCount,
        storeData.imageUrl,
        storeData.isVerified,
        storeData.productsCount,
        storeData.establishedYear,
        storeData.discount || null,
        storeData.membership?.type || null,
        storeData.membership ? JSON.stringify(storeData.membership.benefits) : null,
        storeData.membership?.discountPercentage || null,
        storeData.membership?.prioritySupport || null,
        now,
        now
      ]);

      // Insert categories
      for (const category of storeData.category) {
        await connection.execute(`
          INSERT INTO store_categories (store_id, category) VALUES (?, ?)
        `, [storeId, category]);
      }

      // Insert locations
      for (const location of storeData.location) {
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

      // Update store
      await connection.execute(`
        UPDATE stores SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          rating = COALESCE(?, rating),
          review_count = COALESCE(?, review_count),
          image_url = COALESCE(?, image_url),
          is_verified = COALESCE(?, is_verified),
          products_count = COALESCE(?, products_count),
          established_year = COALESCE(?, established_year),
          discount = COALESCE(?, discount),
          membership_type = COALESCE(?, membership_type),
          membership_benefits = COALESCE(?, membership_benefits),
          membership_discount_percentage = COALESCE(?, membership_discount_percentage),
          membership_priority_support = COALESCE(?, membership_priority_support),
          updated_at = ?
        WHERE id = ?
      `, [
        updateData.name,
        updateData.description,
        updateData.rating,
        updateData.reviewCount,
        updateData.imageUrl,
        updateData.isVerified,
        updateData.productsCount,
        updateData.establishedYear,
        updateData.discount,
        updateData.membership?.type,
        updateData.membership ? JSON.stringify(updateData.membership.benefits) : null,
        updateData.membership?.discountPercentage,
        updateData.membership?.prioritySupport,
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
        LEFT JOIN store_categories sc ON s.id = sc.store_id
        LEFT JOIN store_locations sl ON s.id = sl.store_id
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
        LEFT JOIN store_categories sc ON s.id = sc.store_id
        LEFT JOIN store_locations sl ON s.id = sl.store_id
        WHERE sc.category = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `, [category]);

      return (stores as any[]).map(this.mapRowToStore);
    } finally {
      connection.release();
    }
  }

  // Get stores by membership type
  static async findByMembershipType(membershipType: string): Promise<Store[]> {
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
        LEFT JOIN store_categories sc ON s.id = sc.store_id
        LEFT JOIN store_locations sl ON s.id = sl.store_id
        WHERE s.membership_type = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `, [membershipType]);

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

    // Add membership if it exists
    if (row.membership_type) {
      store.membership = {
        type: row.membership_type,
        benefits: [],
        discountPercentage: row.membership_discount_percentage,
        prioritySupport: Boolean(row.membership_priority_support)
      };

      // Parse membership benefits safely
      if (row.membership_benefits) {
        try {
          // Handle different types of invalid data
          if (typeof row.membership_benefits === 'string') {
            if (row.membership_benefits === '[object Object]' || row.membership_benefits === '' || !row.membership_benefits.startsWith('[')) {
              store.membership.benefits = [];
            } else {
              store.membership.benefits = JSON.parse(row.membership_benefits);
            }
          } else if (Array.isArray(row.membership_benefits)) {
            store.membership.benefits = row.membership_benefits;
          } else {
            store.membership.benefits = [];
          }
        } catch (error) {
          console.error('Error parsing membership benefits:', error);
          store.membership.benefits = [];
        }
      }
    }

    return store;
  }
}
