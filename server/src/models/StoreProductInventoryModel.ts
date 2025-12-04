import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface StoreProductInventory {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrUpdateInventoryRequest {
  productId: string;
  storeId: string;
  quantity: number;
}

export class StoreProductInventoryModel {
  private pool = pool;

  /**
   * Create or update inventory for a product in a store
   */
  async upsertInventory(data: CreateOrUpdateInventoryRequest): Promise<StoreProductInventory> {
    const connection = await this.pool.getConnection();
    try {
      const now = new Date();

      // Check if inventory record exists
      const [existing] = await connection.execute(
        `SELECT id FROM store_product_inventory 
         WHERE product_id = ? AND store_id = ?`,
        [data.productId, data.storeId]
      );

      const existingRows = existing as any[];

      if (existingRows && existingRows.length > 0) {
        // Update existing inventory
        const id = existingRows[0].id;
        await connection.execute(
          `UPDATE store_product_inventory 
           SET quantity = ?, updated_at = ?
           WHERE id = ?`,
          [data.quantity, now, id]
        );
        return this.getInventoryById(id);
      } else {
        // Create new inventory record
        const id = uuidv4();
        await connection.execute(
          `INSERT INTO store_product_inventory (
            id, product_id, store_id, quantity, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, data.productId, data.storeId, data.quantity, now, now]
        );
        return this.getInventoryById(id);
      }
    } catch (error: any) {
      logger.error('[StoreProductInventoryModel] Error upserting inventory', {
        error: error.message,
        data,
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Increment or decrement inventory quantity
   */
  async updateQuantity(
    productId: string,
    storeId: string,
    quantityChange: number
  ): Promise<StoreProductInventory> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      const now = new Date();

      // Check if inventory record exists
      const [existing] = await connection.execute(
        `SELECT id, quantity FROM store_product_inventory 
         WHERE product_id = ? AND store_id = ?
         FOR UPDATE`,
        [productId, storeId]
      );

      const existingRows = existing as any[];

      if (existingRows && existingRows.length > 0) {
        // Update existing inventory
        const id = existingRows[0].id;
        const currentQuantity = existingRows[0].quantity || 0;
        const newQuantity = Math.max(0, currentQuantity + quantityChange);

        await connection.execute(
          `UPDATE store_product_inventory 
           SET quantity = ?, updated_at = ?
           WHERE id = ?`,
          [newQuantity, now, id]
        );

        await connection.commit();
        return this.getInventoryById(id);
      } else {
        // Create new inventory record if it doesn't exist
        if (quantityChange < 0) {
          throw new Error('Cannot decrement inventory that does not exist');
        }

        const id = uuidv4();
        await connection.execute(
          `INSERT INTO store_product_inventory (
            id, product_id, store_id, quantity, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, productId, storeId, quantityChange, now, now]
        );

        await connection.commit();
        return this.getInventoryById(id);
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get inventory by ID
   */
  async getInventoryById(id: string): Promise<StoreProductInventory> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM store_product_inventory WHERE id = ?`,
        [id]
      );
      const inventories = rows as any[];
      if (!inventories || inventories.length === 0) {
        throw new Error('Inventory not found');
      }
      return this.mapRowToInventory(inventories[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Get inventory for a product in a specific store
   */
  async getInventoryByProductAndStore(
    productId: string,
    storeId: string
  ): Promise<StoreProductInventory | null> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM store_product_inventory 
         WHERE product_id = ? AND store_id = ?`,
        [productId, storeId]
      );
      const inventories = rows as any[];
      if (!inventories || inventories.length === 0) {
        return null;
      }
      return this.mapRowToInventory(inventories[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Get all inventory records for a product across all stores
   */
  async getInventoryByProduct(productId: string): Promise<StoreProductInventory[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM store_product_inventory 
         WHERE product_id = ?
         ORDER BY store_id`,
        [productId]
      );
      const inventories = rows as any[];
      return inventories.map(row => this.mapRowToInventory(row));
    } finally {
      connection.release();
    }
  }

  /**
   * Get all inventory records for a store
   */
  async getInventoryByStore(storeId: string): Promise<StoreProductInventory[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM store_product_inventory 
         WHERE store_id = ?
         ORDER BY product_id`,
        [storeId]
      );
      const inventories = rows as any[];
      return inventories.map(row => this.mapRowToInventory(row));
    } finally {
      connection.release();
    }
  }

  /**
   * Delete inventory record
   */
  async deleteInventory(id: string): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(
        `DELETE FROM store_product_inventory WHERE id = ?`,
        [id]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Delete inventory for a product in a store
   */
  async deleteInventoryByProductAndStore(
    productId: string,
    storeId: string
  ): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(
        `DELETE FROM store_product_inventory 
         WHERE product_id = ? AND store_id = ?`,
        [productId, storeId]
      );
    } finally {
      connection.release();
    }
  }

  private mapRowToInventory(row: any): StoreProductInventory {
    return {
      id: row.id,
      productId: row.product_id,
      storeId: row.store_id,
      quantity: parseInt(row.quantity, 10),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

