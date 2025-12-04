import { ProductModel } from '../models/ProductModel';
import { ActivityLogModel } from '../models/ActivityLogModel';
import { logger } from '../utils/logger';

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  storeId: string;
  storeName?: string;
}

export interface LowStockAlertStats {
  alertCount: number;
  alerts: LowStockAlert[];
  duration: number;
  timestamp: string;
}

class LowStockAlertService {
  private productModel: ProductModel;
  private alertInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly DEFAULT_THRESHOLD = 10; // Alert when stock <= 10

  constructor() {
    this.productModel = new ProductModel();
  }

  /**
   * Check for products with low stock and create activity logs
   * @param threshold - Stock threshold below which to alert (default: 10)
   * @returns Statistics about the alert operation
   */
  async checkLowStock(threshold: number = this.DEFAULT_THRESHOLD): Promise<LowStockAlertStats> {
    if (this.isRunning) {
      console.log('Low stock check already in progress, skipping...');
      return {
        alertCount: 0,
        alerts: [],
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`🔔 Checking for low stock products (threshold: ${threshold})...`);

      // Get all active products
      // Note: This would need to be implemented in ProductModel to get all products across all stores
      // For now, we'll create a placeholder that can be enhanced
      
      // TODO: Implement getAllProductsWithLowStock method in ProductModel
      // const lowStockProducts = await this.productModel.getAllProductsWithLowStock(threshold);

      // For now, return empty stats as this requires database query implementation
      // This service structure is ready for implementation
      
      const duration = Date.now() - startTime;
      console.log(`✅ Low stock check completed in ${duration}ms`);

      return {
        alertCount: 0,
        alerts: [],
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('❌ Error during low stock check:', error);
      return {
        alertCount: 0,
        alerts: [],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Log low stock alerts as activity logs
   */
  private async logLowStockAlerts(alerts: LowStockAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        await ActivityLogModel.createLog({
          type: 'system',
          message: `Low stock alert: ${alert.productName} has ${alert.currentStock} units remaining (threshold: ${alert.threshold})`,
          userName: 'System',
          metadata: {
            productId: alert.productId,
            productName: alert.productName,
            currentStock: alert.currentStock,
            threshold: alert.threshold,
            storeId: alert.storeId,
            storeName: alert.storeName,
            alertTime: new Date().toISOString(),
          },
        });
      } catch (logError) {
        logger.warn(`Failed to log low stock alert for product ${alert.productId}:`, logError);
      }
    }
  }

  /**
   * Start the scheduled alert check job
   * Runs every 12 hours by default
   * @param intervalHours - Hours between checks (default: 12)
   */
  start(intervalHours: number = 12): void {
    if (this.alertInterval) {
      console.log('⚠️ Low stock alert scheduler already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    const threshold = parseInt(
      process.env.LOW_STOCK_THRESHOLD || String(this.DEFAULT_THRESHOLD)
    );

    // Run immediately on startup
    console.log('🚀 Starting low stock alert service...');
    this.checkLowStock(threshold);

    // Schedule periodic checks
    this.alertInterval = setInterval(() => {
      this.checkLowStock(threshold);
    }, intervalMs);

    console.log(
      `✅ Low stock alert service started. Will run every ${intervalHours} hour(s) with threshold ${threshold}`
    );
  }

  /**
   * Stop the scheduled alert job
   */
  stop(): void {
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null;
      console.log('🛑 Low stock alert service stopped');
    }
  }

  /**
   * Get the status of the alert service
   */
  getStatus(): {
    isRunning: boolean;
    hasScheduler: boolean;
  } {
    return {
      isRunning: this.isRunning,
      hasScheduler: this.alertInterval !== null,
    };
  }
}

// Export singleton instance
export const lowStockAlertService = new LowStockAlertService();
export default lowStockAlertService;

