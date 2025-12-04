import { OrderModel } from '../models/OrderModel';
import { ActivityLogModel } from '../models/ActivityLogModel';
import { logger } from '../utils/logger';
import type { OrderStatus } from '../models/orders/types';

export interface OrderCleanupStats {
  cancelledCount: number;
  duration: number;
  timestamp: string;
}

class OrderCleanupService {
  private orderModel: OrderModel;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly PENDING_TIMEOUT_HOURS = 24; // Cancel pending orders after 24 hours

  constructor() {
    this.orderModel = new OrderModel();
  }

  /**
   * Cancel pending orders that have not been paid within the timeout period
   * @param timeoutHours - Hours after which pending orders should be cancelled (default: 24)
   * @returns Statistics about the cleanup operation
   */
  async cancelPendingOrders(timeoutHours: number = this.PENDING_TIMEOUT_HOURS): Promise<OrderCleanupStats> {
    if (this.isRunning) {
      console.log('Order cleanup already in progress, skipping...');
      return {
        cancelledCount: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Get all pending orders
      const { orders } = await this.orderModel.getAllOrders({
        status: 'pending',
        limit: 1000, // Get up to 1000 pending orders
      });

      if (orders.length === 0) {
        console.log('✅ No pending orders to cancel');
        return {
          cancelledCount: 0,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      // Calculate cutoff time
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - timeoutHours);

      // Filter orders that are older than timeout period and have payment intent
      // Only cancel orders that have been created but payment not completed
      const ordersToCancel = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate < cutoffTime;
      });

      if (ordersToCancel.length === 0) {
        console.log(`✅ No pending orders older than ${timeoutHours} hours to cancel`);
        return {
          cancelledCount: 0,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      console.log(
        `🧹 Starting order cleanup: Found ${ordersToCancel.length} pending order(s) older than ${timeoutHours} hours`
      );

      // Cancel each order
      let cancelledCount = 0;
      for (const order of ordersToCancel) {
        try {
          await this.orderModel.updateOrderStatus(order.id, 'cancelled' as OrderStatus);
          cancelledCount++;

          // Log the cancellation as a system action
          try {
            await ActivityLogModel.createLog({
              type: 'system',
              message: `Order ${order.id} automatically cancelled (pending for more than ${timeoutHours} hours)`,
              userName: 'System',
              metadata: {
                orderId: order.id,
                userId: order.userId,
                storeId: order.storeId,
                cancelledAt: new Date().toISOString(),
                reason: 'timeout',
              },
            });
          } catch (logError) {
            logger.warn('Failed to log order cancellation', { orderId: order.id, error: logError });
          }
        } catch (error: any) {
          logger.error(`Failed to cancel order ${order.id}:`, error);
          // Continue with other orders even if one fails
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ Order cleanup completed: Cancelled ${cancelledCount} order(s) in ${duration}ms`
      );

      return {
        cancelledCount,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('❌ Error during order cleanup:', error);

      // Log the error as a system action
      try {
        await ActivityLogModel.createLog({
          type: 'system',
          message: `Order cleanup failed: ${error.message}`,
          userName: 'System',
          metadata: {
            error: error.message,
            cleanupTime: new Date().toISOString(),
          },
        });
      } catch (logError) {
        logger.error('Failed to log order cleanup error:', logError);
      }

      return {
        cancelledCount: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduled cleanup job
   * Runs every 6 hours by default
   * @param intervalHours - Hours between cleanup runs (default: 6)
   */
  start(intervalHours: number = 6): void {
    if (this.cleanupInterval) {
      console.log('⚠️ Order cleanup scheduler already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    const timeoutHours = parseInt(
      process.env.PENDING_ORDER_TIMEOUT_HOURS || String(this.PENDING_TIMEOUT_HOURS)
    );

    // Run immediately on startup
    console.log('🚀 Starting order cleanup service...');
    this.cancelPendingOrders(timeoutHours);

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cancelPendingOrders(timeoutHours);
    }, intervalMs);

    console.log(
      `✅ Order cleanup service started. Will run every ${intervalHours} hour(s), cancelling orders older than ${timeoutHours} hours`
    );
  }

  /**
   * Stop the scheduled cleanup job
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Order cleanup service stopped');
    }
  }

  /**
   * Get the status of the cleanup service
   */
  getStatus(): {
    isRunning: boolean;
    hasScheduler: boolean;
  } {
    return {
      isRunning: this.isRunning,
      hasScheduler: this.cleanupInterval !== null,
    };
  }
}

// Export singleton instance
export const orderCleanupService = new OrderCleanupService();
export default orderCleanupService;

