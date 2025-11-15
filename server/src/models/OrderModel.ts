import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type OrderStatus =
  | 'pending_payment'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: {
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  orderDate: string;
  shippedDate?: string;
  deliveredDate?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  stripeSessionId?: string | null;
}

export interface CreateOrderRequest {
  userId: string;
  storeId: string;
  storeName: string;
  items: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  stripeSessionId?: string | null;
  status?: OrderStatus;
}

export class OrderModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async getOrdersByStripeSession(sessionId: string): Promise<Order[]> {
    const query = `
      SELECT 
        o.id, o.user_id, o.store_id, o.store_name, o.total_amount, o.status,
        o.shipping_street_address, o.shipping_apt_number, o.shipping_city,
        o.shipping_state_province, o.shipping_zip_code, o.shipping_country,
        o.payment_method, o.stripe_session_id, o.order_date, o.shipped_date, o.delivered_date,
        o.tracking_number, o.created_at, o.updated_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productImage', oi.product_image,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.stripe_session_id = ?
      GROUP BY o.id
    `;

    const [rows] = await this.pool.execute(query, [sessionId]);
    const orders = rows as any[];

    return orders.map((row) => this.mapRowToOrder(row));
  }

  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      const orderId = uuidv4();
      const now = new Date();
      const totalAmount = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Insert order
      const orderQuery = `
        INSERT INTO orders (
          id, user_id, store_id, store_name, total_amount, status,
          shipping_street_address, shipping_apt_number, shipping_city,
          shipping_state_province, shipping_zip_code, shipping_country,
          payment_method, stripe_session_id, order_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const status: OrderStatus = orderData.status ?? 'pending';

      await connection.execute(orderQuery, [
        orderId,
        orderData.userId,
        orderData.storeId,
        orderData.storeName,
        totalAmount,
        status,
        orderData.shippingAddress.streetAddress,
        orderData.shippingAddress.aptNumber || null,
        orderData.shippingAddress.city,
        orderData.shippingAddress.stateProvince,
        orderData.shippingAddress.zipCode,
        orderData.shippingAddress.country,
        orderData.paymentMethod,
        orderData.stripeSessionId || null,
        now,
        now,
        now
      ]);

      // Insert order items
      const itemQuery = `
        INSERT INTO order_items (
          id, order_id, product_id, product_name, product_image,
          quantity, price, subtotal, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of orderData.items) {
        const itemId = uuidv4();
        const subtotal = item.price * item.quantity;
        await connection.execute(itemQuery, [
          itemId,
          orderId,
          item.productId,
          item.productName,
          item.productImage || null,
          item.quantity,
          item.price,
          subtotal,
          now
        ]);
      }

      await connection.commit();
      return this.getOrderById(orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteOrdersByStripeSession(sessionId: string): Promise<void> {
    if (!sessionId) {
      return;
    }

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT id FROM orders WHERE stripe_session_id = ? AND status = 'pending_payment'`,
        [sessionId]
      );

      const orderIds = (rows as any[]).map((row) => row.id);

      if (orderIds.length > 0) {
        const placeholders = orderIds.map(() => '?').join(', ');
        await connection.execute(
          `DELETE FROM order_items WHERE order_id IN (${placeholders})`,
          orderIds
        );
        await connection.execute(
          `DELETE FROM orders WHERE id IN (${placeholders})`,
          orderIds
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateOrderAfterPayment(
    orderId: string,
    updates: {
      status?: OrderStatus;
      paymentMethod?: string;
      stripeSessionId?: string | null;
      orderDate?: Date;
      shippingAddress?: {
        streetAddress: string;
        aptNumber?: string;
        city: string;
        stateProvince: string;
        zipCode: string;
        country: string;
      };
    }
  ): Promise<void> {
    if (!orderId) {
      return;
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.status) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    if (updates.paymentMethod) {
      fields.push('payment_method = ?');
      params.push(updates.paymentMethod);
    }

    if (updates.stripeSessionId !== undefined) {
      fields.push('stripe_session_id = ?');
      params.push(updates.stripeSessionId);
    }

    if (updates.orderDate) {
      fields.push('order_date = ?');
      params.push(updates.orderDate);
    }

    if (updates.shippingAddress) {
      fields.push('shipping_street_address = ?');
      params.push(updates.shippingAddress.streetAddress);
      fields.push('shipping_apt_number = ?');
      params.push(updates.shippingAddress.aptNumber ?? null);
      fields.push('shipping_city = ?');
      params.push(updates.shippingAddress.city);
      fields.push('shipping_state_province = ?');
      params.push(updates.shippingAddress.stateProvince);
      fields.push('shipping_zip_code = ?');
      params.push(updates.shippingAddress.zipCode);
      fields.push('shipping_country = ?');
      params.push(updates.shippingAddress.country);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
    params.push(orderId);

    await this.pool.execute(query, params);
  }

  async getOrderById(orderId: string): Promise<Order> {
    const query = `
      SELECT 
        o.id, o.user_id, o.store_id, o.store_name, o.total_amount, o.status,
        o.shipping_street_address, o.shipping_apt_number, o.shipping_city,
        o.shipping_state_province, o.shipping_zip_code, o.shipping_country,
        o.payment_method, o.stripe_session_id, o.order_date, o.shipped_date, o.delivered_date,
        o.tracking_number, o.created_at, o.updated_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productImage', oi.product_image,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id
    `;

    const [rows] = await this.pool.execute(query, [orderId]);
    const orders = rows as any[];

    if (orders.length === 0) {
      throw new Error('Order not found');
    }

    return this.mapRowToOrder(orders[0]);
  }

  async getOrdersByUserId(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<Order[]> {
    try {
      // First, check if orders table exists
      const [tables] = await this.pool.execute(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = 'orders'`
      ) as any;
      
      if (tables.length === 0 || tables[0].count === 0) {
        console.warn('Orders table does not exist. Returning empty array.');
        return [];
      }

      // Get orders first (simpler query)
      let query = `
        SELECT 
          o.id, o.user_id, o.store_id, o.store_name, o.total_amount, o.status,
          o.shipping_street_address, o.shipping_apt_number, o.shipping_city,
          o.shipping_state_province, o.shipping_zip_code, o.shipping_country,
          o.payment_method, o.stripe_session_id, o.order_date, o.shipped_date, o.delivered_date,
          o.tracking_number, o.created_at, o.updated_at
        FROM orders o
        WHERE o.user_id = ?
      `;

      const params: any[] = [userId];

      if (options?.status) {
        query += ' AND o.status = ?';
        params.push(options.status);
      }

      query += ' ORDER BY o.order_date DESC';

      const limitValue =
        typeof options?.limit === 'number' && Number.isFinite(options.limit)
          ? Math.max(0, Math.floor(options.limit))
          : undefined;
      const offsetValue =
        typeof options?.offset === 'number' && Number.isFinite(options.offset)
          ? Math.max(0, Math.floor(options.offset))
          : undefined;

      if (limitValue !== undefined) {
        query += ` LIMIT ${limitValue}`;
        if (offsetValue !== undefined) {
          query += ` OFFSET ${offsetValue}`;
        }
      } else if (offsetValue !== undefined) {
        console.warn('Offset provided without limit. Ignoring offset to avoid malformed query.', {
          userId,
          offset: offsetValue,
        });
      }

      let rows: any;
      try {
        [rows] = await this.pool.execute(query, params);
      } catch (error: any) {
        if (this.isConnectionError(error) || error?.code === 'ER_NO_SUCH_TABLE') {
          console.warn('Orders query failed. Returning empty array.', {
            error: error?.message || error,
            code: error?.code,
            errno: error?.errno,
            fatal: error?.fatal,
          });
          return [];
        }
        throw error;
      }
      const orders = rows as any[];

      if (orders.length === 0) {
        return [];
      }

      // Get order items for each order separately
      const orderIds = orders.map(order => order.id);
      const itemsQuery = `
        SELECT 
          id, order_id, product_id, product_name, product_image,
          quantity, price, subtotal
        FROM order_items
        WHERE order_id IN (${orderIds.map(() => '?').join(',')})
      `;

      let items: any[] = [];
      try {
        const [itemsRows] = await this.pool.execute(itemsQuery, orderIds);
        items = itemsRows as any[];
      } catch (error: any) {
        if (error?.code === 'ER_NO_SUCH_TABLE') {
          console.warn('Order items table missing. Returning orders without items.');
          items = [];
        } else if (this.isConnectionError(error)) {
          console.warn('Order items query failed due to connection issue. Returning orders without items.', {
            error: error?.message || error,
            code: error?.code,
            errno: error?.errno,
            fatal: error?.fatal,
          });
          items = [];
        } else {
          throw error;
        }
      }

      // Group items by order_id
      const itemsByOrderId = items.reduce((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productImage: item.product_image || undefined,
          quantity: item.quantity,
          price: parseFloat(item.price),
          subtotal: parseFloat(item.subtotal)
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Map orders with their items
      return orders.map(order => ({
        id: order.id,
        userId: order.user_id,
        storeId: order.store_id,
        storeName: order.store_name,
        items: itemsByOrderId[order.id] || [],
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        shippingAddress: {
          streetAddress: order.shipping_street_address,
          aptNumber: order.shipping_apt_number || undefined,
          city: order.shipping_city,
          stateProvince: order.shipping_state_province,
          zipCode: order.shipping_zip_code,
          country: order.shipping_country
        },
        paymentMethod: order.payment_method,
        stripeSessionId: order.stripe_session_id || null,
        orderDate: order.order_date,
        shippedDate: order.shipped_date || undefined,
        deliveredDate: order.delivered_date || undefined,
        trackingNumber: order.tracking_number || undefined,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));
    } catch (error) {
      console.error('Error in getOrdersByUserId:', error);
      console.error('Query params:', { userId, options });
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      if (this.isConnectionError(error) || (error as any)?.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Database unavailable when fetching orders. Returning empty array for client.');
        return [];
      }
      throw error;
    }
  }

  private mapRowToOrder(row: any): Order {
    const items = row.items && Array.isArray(row.items) && row.items.length > 0 && row.items[0].id
      ? row.items
      : [];

    return {
      id: row.id,
      userId: row.user_id,
      storeId: row.store_id,
      storeName: row.store_name,
      items: items.map((item: any) => ({
        id: item.id,
        orderId: row.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage || undefined,
        quantity: item.quantity,
        price: parseFloat(item.price),
        subtotal: parseFloat(item.subtotal)
      })),
      totalAmount: parseFloat(row.total_amount),
      status: row.status,
      shippingAddress: {
        streetAddress: row.shipping_street_address,
        aptNumber: row.shipping_apt_number || undefined,
        city: row.shipping_city,
        stateProvince: row.shipping_state_province,
        zipCode: row.shipping_zip_code,
        country: row.shipping_country
      },
      paymentMethod: row.payment_method,
      orderDate: row.order_date,
      shippedDate: row.shipped_date || undefined,
      deliveredDate: row.delivered_date || undefined,
      trackingNumber: row.tracking_number || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stripeSessionId: row.stripe_session_id || null
    };
  }

  async createOrdersTable(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      // Create orders table
      const ordersTableQuery = `
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          store_id VARCHAR(36) NOT NULL,
          store_name VARCHAR(255) NOT NULL,
          total_amount DECIMAL(10, 2) NOT NULL,
          status ENUM('pending_payment', 'pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
          shipping_street_address VARCHAR(255) NOT NULL,
          shipping_apt_number VARCHAR(50) NULL,
          shipping_city VARCHAR(100) NOT NULL,
          shipping_state_province VARCHAR(100) NOT NULL,
          shipping_zip_code VARCHAR(20) NOT NULL,
          shipping_country VARCHAR(100) NOT NULL,
          payment_method VARCHAR(100) NOT NULL,
          stripe_session_id VARCHAR(255) NULL,
          order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          shipped_date TIMESTAMP NULL,
          delivered_date TIMESTAMP NULL,
          tracking_number VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_store_id (store_id),
          INDEX idx_status (status),
          INDEX idx_order_date (order_date),
          INDEX idx_stripe_session (stripe_session_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;

      await connection.execute(ordersTableQuery);

      try {
        await connection.execute(
          `ALTER TABLE orders MODIFY COLUMN status ENUM('pending_payment', 'pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending'`
        );
      } catch (error: any) {
        // Ignore if status column already updated
      }

      try {
        await connection.execute(
          `ALTER TABLE orders ADD COLUMN stripe_session_id VARCHAR(255) NULL`
        );
      } catch (error: any) {
        // Ignore if column already exists
      }

      try {
        await connection.execute(
          `ALTER TABLE orders MODIFY COLUMN payment_method VARCHAR(100) NOT NULL`
        );
      } catch (error: any) {
        // Ignore if column already updated
      }

      try {
        await connection.execute(
          `ALTER TABLE orders ADD INDEX idx_stripe_session (stripe_session_id)`
        );
      } catch (error: any) {
        // Ignore if index already exists
      }

      // Create order_items table (without foreign key first)
      const orderItemsTableQuery = `
        CREATE TABLE IF NOT EXISTS order_items (
          id VARCHAR(36) PRIMARY KEY,
          order_id VARCHAR(36) NOT NULL,
          product_id VARCHAR(36) NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          product_image VARCHAR(500) NULL,
          quantity INT NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          subtotal DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_order_id (order_id),
          INDEX idx_product_id (product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;

      await connection.execute(orderItemsTableQuery);

      // Try to add foreign key constraint (may fail if user lacks REFERENCES permission)
      try {
        await connection.execute(`
          ALTER TABLE order_items
          ADD CONSTRAINT fk_order_items_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        `);
      } catch (error: any) {
        // Silently ignore if foreign key already exists or user lacks REFERENCES permission
        if (error?.code !== 'ER_DUP_KEY' && error?.code !== 'ER_FK_DUP_NAME' && error?.errno !== 1142 && error?.code !== 'ER_TABLEACCESS_DENIED_ERROR') {
          console.warn('Could not add foreign key to order_items:', error.message);
        }
        // Log when REFERENCES permission is missing (but don't fail)
        if (error?.errno === 1142 || error?.code === 'ER_TABLEACCESS_DENIED_ERROR') {
          console.info('Skipping foreign key constraint for order_items (missing REFERENCES permission)');
        }
      }
    } finally {
      connection.release();
    }
  }

  private isConnectionError(error: any): boolean {
    if (!error) {
      return false;
    }

    const connectionErrorCodes = new Set([
      'ER_ACCESS_DENIED_ERROR',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'PROTOCOL_CONNECTION_LOST',
      'ER_BAD_DB_ERROR',
      'ECONNRESET',
    ]);

    const connectionErrnos = new Set([2002, 2003, 1045, 1049, 2013]);

    if ('code' in error && typeof error.code === 'string' && connectionErrorCodes.has(error.code)) {
      return true;
    }

    if ('errno' in error && typeof error.errno === 'number' && connectionErrnos.has(error.errno)) {
      return true;
    }

    if (error?.fatal === true) {
      return true;
    }

    if (typeof error?.message === 'string') {
      const message = error.message;
      return (
        message.includes('connect ECONNREFUSED') ||
        message.includes('Connection lost') ||
        message.includes('getaddrinfo ENOTFOUND') ||
        message.includes('read ECONNRESET')
      );
    }

    return false;
  }
}

