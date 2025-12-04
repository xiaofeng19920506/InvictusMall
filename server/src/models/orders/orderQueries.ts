import { Pool } from 'mysql2/promise';
import { Order } from './types';
import { mapRowToOrder } from './orderMapper';
import { isConnectionError } from './utils';

export class OrderQueries {
  constructor(private pool: Pool) {}

  async getOrdersByStripeSession(sessionId: string): Promise<Order[]> {
    const query = `
      SELECT 
        o.id, o.user_id, o.store_id, o.store_name, o.total_amount, o.status,
        o.shipping_street_address, o.shipping_apt_number, o.shipping_city,
        o.shipping_state_province, o.shipping_zip_code, o.shipping_country,
        o.payment_method, o.stripe_session_id, o.payment_intent_id, o.order_date, o.shipped_date, o.delivered_date,
        o.tracking_number, o.created_at, o.updated_at,
        o.guest_email, o.guest_full_name, o.guest_phone_number,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productImage', oi.product_image,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal,
            'reservationDate', oi.reservation_date,
            'reservationTime', oi.reservation_time,
            'reservationNotes', oi.reservation_notes,
            'isReservation', oi.is_reservation
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.stripe_session_id = ?
      GROUP BY o.id
    `;

    const [rows] = await this.pool.execute(query, [sessionId]);
    const orders = rows as any[];

    return orders.map((row) => mapRowToOrder(row));
  }

  async getOrdersByPaymentIntentId(paymentIntentId: string): Promise<Order[]> {
    const query = `
      SELECT 
        o.id, o.user_id, o.store_id, o.store_name, o.total_amount, o.status,
        o.shipping_street_address, o.shipping_apt_number, o.shipping_city,
        o.shipping_state_province, o.shipping_zip_code, o.shipping_country,
        o.payment_method, o.stripe_session_id, o.payment_intent_id, o.order_date, o.shipped_date, o.delivered_date,
        o.tracking_number, o.created_at, o.updated_at,
        o.guest_email, o.guest_full_name, o.guest_phone_number,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productImage', oi.product_image,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal,
            'reservationDate', oi.reservation_date,
            'reservationTime', oi.reservation_time,
            'reservationNotes', oi.reservation_notes,
            'isReservation', oi.is_reservation
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.payment_intent_id = ?
      GROUP BY o.id
      ORDER BY o.order_date DESC
    `;

    const [rows] = await this.pool.execute(query, [paymentIntentId]);
    const orders = rows as any[];

    return orders.map((row) => mapRowToOrder(row));
  }

  async getOrderById(orderId: string): Promise<Order> {
    const query = `
      SELECT 
        o.id, o.user_id, o.store_id, o.store_name, o.total_amount, o.status,
        o.shipping_street_address, o.shipping_apt_number, o.shipping_city,
        o.shipping_state_province, o.shipping_zip_code, o.shipping_country,
        o.payment_method, o.stripe_session_id, o.payment_intent_id, o.order_date, o.shipped_date, o.delivered_date,
        o.tracking_number, o.created_at, o.updated_at,
        o.guest_email, o.guest_full_name, o.guest_phone_number,
        COALESCE(SUM(r.amount), 0) AS total_refunded,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productImage', oi.product_image,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal,
            'reservationDate', oi.reservation_date,
            'reservationTime', oi.reservation_time,
            'reservationNotes', oi.reservation_notes,
            'isReservation', oi.is_reservation
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN refunds r ON o.id = r.order_id AND r.status = 'succeeded'
      WHERE o.id = ?
      GROUP BY o.id
    `;

    const [rows] = await this.pool.execute(query, [orderId]);
    const orders = rows as any[];

    if (orders.length === 0) {
      throw new Error('Order not found');
    }

    return mapRowToOrder(orders[0]);
  }

  /**
   * Get order by ID and verify it belongs to the specified user
   * This is more secure than getOrderById + manual check
   */
  async getOrderByIdAndUserId(orderId: string, userId: string): Promise<Order> {
    const query = `
      SELECT 
        o.id, o.user_id, o.store_id, o.store_name, o.total_amount, o.status,
        o.shipping_street_address, o.shipping_apt_number, o.shipping_city,
        o.shipping_state_province, o.shipping_zip_code, o.shipping_country,
        o.payment_method, o.stripe_session_id, o.payment_intent_id, o.order_date, o.shipped_date, o.delivered_date,
        o.tracking_number, o.created_at, o.updated_at,
        o.guest_email, o.guest_full_name, o.guest_phone_number,
        COALESCE(SUM(r.amount), 0) AS total_refunded,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productImage', oi.product_image,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal,
            'reservationDate', oi.reservation_date,
            'reservationTime', oi.reservation_time,
            'reservationNotes', oi.reservation_notes,
            'isReservation', oi.is_reservation
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN refunds r ON o.id = r.order_id AND r.status = 'succeeded'
      WHERE o.id = ? AND o.user_id = ?
      GROUP BY o.id
    `;

    const [rows] = await this.pool.execute(query, [orderId, userId]);
    const orders = rows as any[];

    if (orders.length === 0) {
      throw new Error('Order not found');
    }

    return mapRowToOrder(orders[0]);
  }

  async getOrdersByGuestEmail(email: string): Promise<Order[]> {
    const query = `
      SELECT 
        o.id, o.user_id, o.store_id, o.store_name, o.total_amount, o.status,
        o.shipping_street_address, o.shipping_apt_number, o.shipping_city,
        o.shipping_state_province, o.shipping_zip_code, o.shipping_country,
        o.payment_method, o.stripe_session_id, o.payment_intent_id, o.order_date, o.shipped_date, o.delivered_date,
        o.tracking_number, o.created_at, o.updated_at,
        o.guest_email, o.guest_full_name, o.guest_phone_number,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productImage', oi.product_image,
            'quantity', oi.quantity,
            'price', oi.price,
            'subtotal', oi.subtotal,
            'reservationDate', oi.reservation_date,
            'reservationTime', oi.reservation_time,
            'reservationNotes', oi.reservation_notes,
            'isReservation', oi.is_reservation
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.guest_email = ? AND o.user_id IS NULL
      GROUP BY o.id
      ORDER BY o.order_date DESC
    `;

    const [rows] = await this.pool.execute(query, [email.toLowerCase()]);
    const orders = rows as any[];

    if (orders.length === 0) {
      return [];
    }

    return orders.map((row) => mapRowToOrder(row));
  }

  async getAllOrders(
    options?: {
      status?: string;
      storeId?: string;
      storeIds?: string[]; // For filtering by multiple store IDs (owner access)
      userId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ orders: Order[]; total: number }> {
    try {
      // Build WHERE clause for filters
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (options?.status) {
        whereClause += ' AND o.status = ?';
        params.push(options.status);
      }

      // Handle storeId (single) or storeIds (multiple)
      if (options?.storeIds && options.storeIds.length > 0) {
        const placeholders = options.storeIds.map(() => '?').join(',');
        whereClause += ` AND o.store_id IN (${placeholders})`;
        params.push(...options.storeIds);
      } else if (options?.storeId) {
        whereClause += ' AND o.store_id = ?';
        params.push(options.storeId);
      }

      if (options?.userId) {
        whereClause += ' AND o.user_id = ?';
        params.push(options.userId);
      }

      // Get total count first
      let countQuery = `SELECT COUNT(*) as total FROM orders o ${whereClause}`;
      let total = 0;
      try {
        const [countRows] = await this.pool.execute(countQuery, params);
        const countResult = countRows as any[];
        total = countResult[0]?.total || 0;
      } catch (error: any) {
        if (isConnectionError(error) || error?.code === 'ER_NO_SUCH_TABLE') {
          console.warn('Orders count query failed. Returning empty result.');
          return { orders: [], total: 0 };
        }
        throw error;
      }

      // Get orders with filters
      let query = `
        SELECT 
          o.id, o.user_id, o.store_id, o.store_name, o.total_amount, o.status,
          o.shipping_street_address, o.shipping_apt_number, o.shipping_city,
          o.shipping_state_province, o.shipping_zip_code, o.shipping_country,
          o.payment_method, o.stripe_session_id, o.payment_intent_id, o.order_date, o.shipped_date, o.delivered_date,
          o.tracking_number, o.created_at, o.updated_at
        FROM orders o
        ${whereClause}
        ORDER BY o.order_date DESC
      `;

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
      }

      let rows: any;
      try {
        [rows] = await this.pool.execute(query, params);
      } catch (error: any) {
        if (isConnectionError(error) || error?.code === 'ER_NO_SUCH_TABLE') {
          console.warn('Orders query failed. Returning empty array.');
          return { orders: [], total: 0 };
        }
        throw error;
      }
      const orders = rows as any[];

      if (orders.length === 0) {
        return { orders: [], total };
      }

      // Get order items for each order separately
      const orderIds = orders.map((order) => order.id);
      const itemsQuery = `
        SELECT 
          id, order_id, product_id, product_name, product_image,
          quantity, price, subtotal,
          reservation_date, reservation_time, reservation_notes, is_reservation
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
        } else if (isConnectionError(error)) {
          console.warn('Order items query failed. Returning orders without items.');
          items = [];
        } else {
          throw error;
        }
      }

      // Group items by order_id
      const itemsByOrderId = items.reduce(
        (acc, item) => {
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
            subtotal: parseFloat(item.subtotal),
            reservationDate: item.reservation_date || undefined,
            reservationTime: item.reservation_time || undefined,
            reservationNotes: item.reservation_notes || undefined,
            isReservation: Boolean(item.is_reservation),
          });
          return acc;
        },
        {} as Record<string, any[]>
      );

      // Batch query refunds for all orders
      let refundsByOrderId: Record<string, number> = {};
      if (orderIds.length > 0) {
        try {
          const refundsQuery = `
            SELECT 
              order_id,
              COALESCE(SUM(amount), 0) as total_refunded
            FROM refunds
            WHERE order_id IN (${orderIds.map(() => '?').join(',')})
              AND status = 'succeeded'
            GROUP BY order_id
          `;
          const [refundRows] = await this.pool.execute(refundsQuery, orderIds);
          const refunds = refundRows as any[];
          refundsByOrderId = refunds.reduce(
            (acc, refund) => {
              acc[refund.order_id] = parseFloat(String(refund.total_refunded || 0));
              return acc;
            },
            {} as Record<string, number>
          );
        } catch (error: any) {
          // If refunds table doesn't exist or query fails, just continue without refund data
          if (error?.code !== 'ER_NO_SUCH_TABLE' && !isConnectionError(error)) {
            console.warn('Failed to query refunds for orders:', error);
          }
        }
      }

      // Map orders with their items and refund information
      const mappedOrders = orders.map((order) => ({
        id: order.id,
        userId: order.user_id,
        storeId: order.store_id,
        storeName: order.store_name,
        items: itemsByOrderId[order.id] || [],
        totalAmount: parseFloat(order.total_amount),
        totalRefunded: refundsByOrderId[order.id] || 0,
        status: order.status,
        shippingAddress: {
          streetAddress: order.shipping_street_address,
          aptNumber: order.shipping_apt_number || undefined,
          city: order.shipping_city,
          stateProvince: order.shipping_state_province,
          zipCode: order.shipping_zip_code,
          country: order.shipping_country,
        },
        paymentMethod: order.payment_method,
        stripeSessionId: order.stripe_session_id || null,
        paymentIntentId: order.payment_intent_id || null,
        orderDate: order.order_date,
        shippedDate: order.shipped_date || undefined,
        deliveredDate: order.delivered_date || undefined,
        trackingNumber: order.tracking_number || undefined,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      }));

      return { orders: mappedOrders, total };
    } catch (error) {
      console.error('Error in getAllOrders:', error);
      if (isConnectionError(error) || (error as any)?.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Database unavailable when fetching orders. Returning empty result.');
        return { orders: [], total: 0 };
      }
      throw error;
    }
  }

  async getOrdersByUserId(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<Order[]> {
    try {
      // First, check if orders table exists
      const [tables] = (await this.pool.execute(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = 'orders'`
      )) as any;

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
          o.payment_method, o.stripe_session_id, o.payment_intent_id, o.order_date, o.shipped_date, o.delivered_date,
          o.tracking_number, o.created_at, o.updated_at,
          o.guest_email, o.guest_full_name, o.guest_phone_number
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
        if (isConnectionError(error) || error?.code === 'ER_NO_SUCH_TABLE') {
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
      const orderIds = orders.map((order) => order.id);
      const itemsQuery = `
        SELECT 
          id, order_id, product_id, product_name, product_image,
          quantity, price, subtotal,
          reservation_date, reservation_time, reservation_notes, is_reservation
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
        } else if (isConnectionError(error)) {
          console.warn(
            'Order items query failed due to connection issue. Returning orders without items.',
            {
              error: error?.message || error,
              code: error?.code,
              errno: error?.errno,
              fatal: error?.fatal,
            }
          );
          items = [];
        } else {
          throw error;
        }
      }

      // Group items by order_id
      const itemsByOrderId = items.reduce(
        (acc, item) => {
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
            subtotal: parseFloat(item.subtotal),
            reservationDate: item.reservation_date || undefined,
            reservationTime: item.reservation_time || undefined,
            reservationNotes: item.reservation_notes || undefined,
            isReservation: Boolean(item.is_reservation),
          });
          return acc;
        },
        {} as Record<string, any[]>
      );

      // Map orders with their items
      return orders.map((order) => ({
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
          country: order.shipping_country,
        },
        paymentMethod: order.payment_method,
        stripeSessionId: order.stripe_session_id || null,
        paymentIntentId: order.payment_intent_id || null,
        orderDate: order.order_date,
        shippedDate: order.shipped_date || undefined,
        deliveredDate: order.delivered_date || undefined,
        trackingNumber: order.tracking_number || undefined,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        guestEmail: order.guest_email || null,
        guestFullName: order.guest_full_name || null,
        guestPhoneNumber: order.guest_phone_number || null,
      }));
    } catch (error) {
      console.error('Error in getOrdersByUserId:', error);
      console.error('Query params:', { userId, options });
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      if (isConnectionError(error) || (error as any)?.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Database unavailable when fetching orders. Returning empty array for client.');
        return [];
      }
      throw error;
    }
  }

  async checkDuplicateReservations(
    reservations: Array<{ productId: string; reservationDate: string; reservationTime: string }>,
    connection: any
  ): Promise<Array<{ productId: string; reservationDate: string; reservationTime: string }>> {
    if (reservations.length === 0) {
      return [];
    }

    const duplicateReservations: Array<{
      productId: string;
      reservationDate: string;
      reservationTime: string;
    }> = [];

    for (const reservation of reservations) {
      const query = `
        SELECT COUNT(*) as count
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ?
          AND oi.is_reservation = TRUE
          AND oi.reservation_date = ?
          AND oi.reservation_time = ?
          AND o.status NOT IN ('cancelled')
      `;

      const [rows] = await connection.execute(query, [
        reservation.productId,
        reservation.reservationDate,
        reservation.reservationTime,
      ]);

      const result = rows as any[];
      if (result.length > 0 && result[0].count > 0) {
        duplicateReservations.push(reservation);
      }
    }

    return duplicateReservations;
  }
}

