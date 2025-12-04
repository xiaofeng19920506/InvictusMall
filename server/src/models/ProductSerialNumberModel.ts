import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface ProductSerialNumber {
  id: string;
  productId: string;
  storeId: string;
  serialNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSerialNumberRequest {
  productId: string;
  storeId: string;
  serialNumber: string;
}

export class ProductSerialNumberModel {
  private pool = pool;

  /**
   * Add a serial number to a product in a store
   */
  async addSerialNumber(data: CreateSerialNumberRequest): Promise<ProductSerialNumber> {
    const connection = await this.pool.getConnection();
    try {
      const id = uuidv4();
      const now = new Date();

      await connection.execute(
        `INSERT INTO product_serial_numbers (
          id, product_id, store_id, serial_number, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          updated_at = ?`,
        [id, data.productId, data.storeId, data.serialNumber, now, now, now]
      );

      return this.getSerialNumberById(id);
    } catch (error: any) {
      logger.error('[ProductSerialNumberModel] Error adding serial number', {
        error: error.message,
        data,
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get serial number by ID
   */
  async getSerialNumberById(id: string): Promise<ProductSerialNumber> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM product_serial_numbers WHERE id = ?`,
        [id]
      );
      const serialNumbers = rows as any[];
      if (!serialNumbers || serialNumbers.length === 0) {
        throw new Error('Serial number not found');
      }
      return this.mapRowToSerialNumber(serialNumbers[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Get all serial numbers for a product in a store
   */
  async getSerialNumbersByProductAndStore(
    productId: string,
    storeId: string
  ): Promise<ProductSerialNumber[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM product_serial_numbers 
         WHERE product_id = ? AND store_id = ?
         ORDER BY created_at ASC`,
        [productId, storeId]
      );
      const serialNumbers = rows as any[];
      return serialNumbers.map(row => this.mapRowToSerialNumber(row));
    } finally {
      connection.release();
    }
  }

  /**
   * Get all serial numbers for a product across all stores
   */
  async getSerialNumbersByProduct(productId: string): Promise<ProductSerialNumber[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM product_serial_numbers 
         WHERE product_id = ?
         ORDER BY store_id, created_at ASC`,
        [productId]
      );
      const serialNumbers = rows as any[];
      return serialNumbers.map(row => this.mapRowToSerialNumber(row));
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a serial number
   */
  async deleteSerialNumber(id: string): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(
        `DELETE FROM product_serial_numbers WHERE id = ?`,
        [id]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Delete all serial numbers for a product in a store
   */
  async deleteSerialNumbersByProductAndStore(
    productId: string,
    storeId: string
  ): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(
        `DELETE FROM product_serial_numbers 
         WHERE product_id = ? AND store_id = ?`,
        [productId, storeId]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Add multiple serial numbers at once
   */
  async addSerialNumbers(serialNumbers: CreateSerialNumberRequest[]): Promise<ProductSerialNumber[]> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const now = new Date();
      const results: ProductSerialNumber[] = [];

      for (const data of serialNumbers) {
        const id = uuidv4();
        await connection.execute(
          `INSERT INTO product_serial_numbers (
            id, product_id, store_id, serial_number, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            updated_at = ?`,
          [id, data.productId, data.storeId, data.serialNumber, now, now, now]
        );
        const serialNumber = await this.getSerialNumberById(id);
        results.push(serialNumber);
      }

      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private mapRowToSerialNumber(row: any): ProductSerialNumber {
    return {
      id: row.id,
      productId: row.product_id,
      storeId: row.store_id,
      serialNumber: row.serial_number,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

