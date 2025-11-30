import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { OrderQueries } from './orders/orderQueries';
import { OrderMutations } from './orders/orderMutations';
import { OrderTableInitializer } from './orders/orderTableInitializer';
// Re-export types for backward compatibility
export * from './orders/types';
import type {
  Order,
  CreateOrderRequest,
  OrderStatus,
  UpdateOrderAfterPaymentRequest,
} from './orders/types';

export class OrderModel {
  private pool: Pool;
  private queries: OrderQueries;
  private mutations: OrderMutations;
  private tableInitializer: OrderTableInitializer;

  constructor() {
    this.pool = pool;
    this.queries = new OrderQueries(pool);
    this.mutations = new OrderMutations(pool);
    this.tableInitializer = new OrderTableInitializer(pool);
  }

  async getOrdersByStripeSession(sessionId: string): Promise<Order[]> {
    return this.queries.getOrdersByStripeSession(sessionId);
  }

  async getOrdersByPaymentIntentId(paymentIntentId: string): Promise<Order[]> {
    return this.queries.getOrdersByPaymentIntentId(paymentIntentId);
  }

  async checkDuplicateReservations(
    reservations: Array<{ productId: string; reservationDate: string; reservationTime: string }>,
    connection: any
  ): Promise<Array<{ productId: string; reservationDate: string; reservationTime: string }>> {
    return this.queries.checkDuplicateReservations(reservations, connection);
  }

  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    return this.mutations.createOrder(orderData);
  }

  async deleteOrdersByStripeSession(sessionId: string): Promise<void> {
    return this.mutations.deleteOrdersByStripeSession(sessionId);
  }

  async updateOrderAfterPayment(
    orderId: string,
    updates: UpdateOrderAfterPaymentRequest
  ): Promise<void> {
    return this.mutations.updateOrderAfterPayment(orderId, updates);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, trackingNumber?: string): Promise<void> {
    return this.mutations.updateOrderStatus(orderId, status, trackingNumber);
  }

  async getOrderById(orderId: string): Promise<Order> {
    return this.queries.getOrderById(orderId);
  }

  async getOrderByIdAndUserId(orderId: string, userId: string): Promise<Order> {
    return this.queries.getOrderByIdAndUserId(orderId, userId);
  }

  async getOrdersByGuestEmail(email: string): Promise<Order[]> {
    return this.queries.getOrdersByGuestEmail(email);
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
    return this.queries.getAllOrders(options);
  }

  async getOrdersByUserId(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<Order[]> {
    return this.queries.getOrdersByUserId(userId, options);
  }

  async createOrdersTable(): Promise<void> {
    return this.tableInitializer.createOrdersTable();
  }
}
