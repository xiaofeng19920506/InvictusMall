import { Pool } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { Order, CreateOrderRequest, OrderStatus, UpdateOrderAfterPaymentRequest } from './types';
import { OrderQueries } from './orderQueries';

export class OrderMutations {
  private queries: OrderQueries;

  constructor(private pool: Pool) {
    this.queries = new OrderQueries(pool);
  }

  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check for duplicate reservations before creating the order
      const reservationItems = orderData.items.filter(
        (item) => item.isReservation && item.reservationDate && item.reservationTime
      );

      if (reservationItems.length > 0) {
        const duplicateReservations = await this.queries.checkDuplicateReservations(
          reservationItems.map((item) => ({
            productId: item.productId,
            reservationDate: item.reservationDate!,
            reservationTime: item.reservationTime!,
          })),
          connection
        );

        if (duplicateReservations.length > 0) {
          await connection.rollback();
          const conflicts = duplicateReservations
            .map((r) => `${r.reservationDate} at ${r.reservationTime}`)
            .join(', ');
          throw new Error(
            `Reservation time slot conflict: The following time slots are already booked: ${conflicts}. Please select a different time slot.`
          );
        }
      }

      const orderId = uuidv4();
      const now = new Date();
      const totalAmount = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Insert order
      const orderQuery = `
        INSERT INTO orders (
          id, user_id, store_id, store_name, total_amount, status,
          shipping_street_address, shipping_apt_number, shipping_city,
          shipping_state_province, shipping_zip_code, shipping_country,
          payment_method, stripe_session_id, payment_intent_id, order_date, created_at, updated_at,
          guest_email, guest_full_name, guest_phone_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const status: OrderStatus = orderData.status ?? 'pending';

      await connection.execute(orderQuery, [
        orderId,
        orderData.userId || null,
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
        orderData.paymentIntentId || null,
        now,
        now,
        now,
        orderData.guestEmail || null,
        orderData.guestFullName || null,
        orderData.guestPhoneNumber || null,
      ]);

      // Insert order items
      const itemQuery = `
        INSERT INTO order_items (
          id, order_id, product_id, product_name, product_image,
          quantity, price, subtotal, is_reservation, reservation_date,
          reservation_time, reservation_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          item.isReservation || false,
          item.reservationDate || null,
          item.reservationTime || null,
          item.reservationNotes || null,
          now,
        ]);
      }

      await connection.commit();
      return this.queries.getOrderById(orderId);
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
        `SELECT id FROM orders WHERE stripe_session_id = ? AND status = 'pending'`,
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
    updates: UpdateOrderAfterPaymentRequest
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

    if (updates.paymentIntentId !== undefined) {
      fields.push('payment_intent_id = ?');
      params.push(updates.paymentIntentId);
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

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    trackingNumber?: string
  ): Promise<void> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const validStatuses: OrderStatus[] = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
=======
      'return_processing',
      'returned',
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
    ];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid order status: ${status}`);
    }

    const fields: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [status];

    // Set shipped_date when status changes to 'shipped'
    if (status === 'shipped') {
      fields.push('shipped_date = CURRENT_TIMESTAMP');
    }

    // Set delivered_date when status changes to 'delivered'
    if (status === 'delivered') {
      fields.push('delivered_date = CURRENT_TIMESTAMP');
    }

    // Update tracking number if provided
    if (trackingNumber !== undefined) {
      fields.push('tracking_number = ?');
      params.push(trackingNumber || null);
    }

    const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
    params.push(orderId);

    const [result] = (await this.pool.execute(query, params)) as any;

    if (result.affectedRows === 0) {
      throw new Error('Order not found');
    }
  }
}

