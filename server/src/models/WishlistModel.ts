import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Wishlist {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
}

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  addedAt: Date;
  notes?: string;
  // Joined product data
  product?: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    storeId: string;
    storeName?: string;
  };
}

export interface CreateWishlistRequest {
  userId: string;
  name?: string;
  isPublic?: boolean;
}

export class WishlistModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async create(data: CreateWishlistRequest): Promise<Wishlist> {
    const id = uuidv4();
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(`
        INSERT INTO wishlists (id, user_id, name, is_public)
        VALUES (?, ?, ?, ?)
      `, [
        id,
        data.userId,
        data.name || 'My Wishlist',
        data.isPublic || false
      ]);

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<Wishlist> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          w.*,
          COUNT(wi.id) as item_count
        FROM wishlists w
        LEFT JOIN wishlist_items wi ON w.id = wi.wishlist_id
        WHERE w.id = ?
        GROUP BY w.id
      `, [id]);

      const wishlists = rows as any[];
      if (wishlists.length === 0) {
        throw new Error('Wishlist not found');
      }

      return this.mapRowToWishlist(wishlists[0]);
    } finally {
      connection.release();
    }
  }

  async findByUserId(userId: string): Promise<Wishlist[]> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          w.*,
          COUNT(wi.id) as item_count
        FROM wishlists w
        LEFT JOIN wishlist_items wi ON w.id = wi.wishlist_id
        WHERE w.user_id = ?
        GROUP BY w.id
        ORDER BY w.created_at DESC
      `, [userId]);

      return (rows as any[]).map(this.mapRowToWishlist);
    } finally {
      connection.release();
    }
  }

  async update(id: string, updates: { name?: string; isPublic?: boolean }): Promise<Wishlist> {
    const connection = await this.pool.getConnection();
    
    try {
      const updatesList: string[] = [];
      const params: any[] = [];

      if (updates.name !== undefined) {
        updatesList.push('name = ?');
        params.push(updates.name);
      }

      if (updates.isPublic !== undefined) {
        updatesList.push('is_public = ?');
        params.push(updates.isPublic);
      }

      if (updatesList.length > 0) {
        params.push(id);
        await connection.execute(`
          UPDATE wishlists
          SET ${updatesList.join(', ')}
          WHERE id = ?
        `, params);
      }

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  async delete(id: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute('DELETE FROM wishlists WHERE id = ?', [id]);
    } finally {
      connection.release();
    }
  }

  async addItem(wishlistId: string, productId: string, notes?: string): Promise<WishlistItem> {
    const id = uuidv4();
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(`
        INSERT INTO wishlist_items (id, wishlist_id, product_id, notes)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE notes = COALESCE(?, notes)
      `, [id, wishlistId, productId, notes || null, notes || null]);

      return await this.findItemById(id);
    } finally {
      connection.release();
    }
  }

  async removeItem(wishlistId: string, productId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(`
        DELETE FROM wishlist_items
        WHERE wishlist_id = ? AND product_id = ?
      `, [wishlistId, productId]);
    } finally {
      connection.release();
    }
  }

  async getItems(wishlistId: string): Promise<WishlistItem[]> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          wi.*,
          p.name as product_name,
          p.price as product_price,
          p.image_url as product_image_url,
          p.store_id as product_store_id,
          s.name as store_name
        FROM wishlist_items wi
        LEFT JOIN products p ON wi.product_id = p.id
        LEFT JOIN stores s ON p.store_id = s.id
        WHERE wi.wishlist_id = ?
        ORDER BY wi.added_at DESC
      `, [wishlistId]);

      return (rows as any[]).map(this.mapRowToItem);
    } finally {
      connection.release();
    }
  }

  async findItemById(id: string): Promise<WishlistItem> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          wi.*,
          p.name as product_name,
          p.price as product_price,
          p.image_url as product_image_url,
          p.store_id as product_store_id,
          s.name as store_name
        FROM wishlist_items wi
        LEFT JOIN products p ON wi.product_id = p.id
        LEFT JOIN stores s ON p.store_id = s.id
        WHERE wi.id = ?
      `, [id]);

      const items = rows as any[];
      if (items.length === 0) {
        throw new Error('Wishlist item not found');
      }

      return this.mapRowToItem(items[0]);
    } finally {
      connection.release();
    }
  }

  private mapRowToWishlist(row: any): Wishlist {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      isPublic: Boolean(row.is_public),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      itemCount: parseInt(row.item_count || 0),
    };
  }

  private mapRowToItem(row: any): WishlistItem {
    return {
      id: row.id,
      wishlistId: row.wishlist_id,
      productId: row.product_id,
      addedAt: new Date(row.added_at),
      notes: row.notes || undefined,
      product: row.product_name ? {
        id: row.product_id,
        name: row.product_name,
        price: parseFloat(row.product_price),
        imageUrl: row.product_image_url || undefined,
        storeId: row.product_store_id,
        storeName: row.store_name || undefined,
      } : undefined,
    };
  }
}

