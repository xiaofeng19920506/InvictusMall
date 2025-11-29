import { StockOperationModel, CreateStockOperationRequest, StockOperation } from '../models/StockOperationModel';
import { OrderModel } from '../models/OrderModel';
import { ProductModel } from '../models/ProductModel';
import { logger } from '../utils/logger';
import type { OrderStatus } from '../models/orders/types';

export interface StockOperationResult {
  operation: StockOperation;
  orderUpdated?: boolean;
  orderStatus?: OrderStatus;
}

export class StockOperationService {
  private stockOperationModel: StockOperationModel;
  private orderModel: OrderModel;

  constructor() {
    this.stockOperationModel = new StockOperationModel();
    this.orderModel = new OrderModel();
  }

  /**
   * Create stock operation and automatically handle inventory updates
   * For stock out operations, automatically update related order status if orderId is provided
   */
  async createStockOperation(
    data: CreateStockOperationRequest,
    performedBy: string
  ): Promise<StockOperationResult> {
    logger.info('[StockOperationService] Starting stock operation', {
      productId: data.productId,
      type: data.type,
      quantity: data.quantity,
      reason: data.reason,
      orderId: data.orderId,
      performedBy,
    });

    try {
      // Validate product exists
      logger.debug('[StockOperationService] Validating product exists', { productId: data.productId });
      const product = await ProductModel.findById(data.productId);
      if (!product) {
        logger.error('[StockOperationService] Product not found', { productId: data.productId });
        throw new Error('Product not found');
      }
      logger.debug('[StockOperationService] Product found', {
        productId: product.id,
        productName: product.name,
        currentStockQuantity: product.stockQuantity,
      });

      // Create stock operation (this automatically updates product stock)
      logger.debug('[StockOperationService] Calling StockOperationModel.createStockOperation');
      const operation = await this.stockOperationModel.createStockOperation(
        data,
        performedBy
      );
      logger.info('[StockOperationService] Stock operation created', {
        operationId: operation.id,
        productId: operation.productId,
        type: operation.type,
        quantity: operation.quantity,
        previousQuantity: operation.previousQuantity,
        newQuantity: operation.newQuantity,
      });

      // Verify product stock was updated correctly
      logger.debug('[StockOperationService] Verifying product stock after operation');
      const updatedProduct = await ProductModel.findById(data.productId);
      if (updatedProduct) {
        logger.info('[StockOperationService] Product stock verified after operation', {
          productId: updatedProduct.id,
          productName: updatedProduct.name,
          actualStockQuantity: updatedProduct.stockQuantity,
          expectedStockQuantity: operation.newQuantity,
          match: updatedProduct.stockQuantity === operation.newQuantity,
        });
        if (updatedProduct.stockQuantity !== operation.newQuantity) {
          logger.warn('[StockOperationService] ⚠️ Stock quantity mismatch!', {
            productId: updatedProduct.id,
            expected: operation.newQuantity,
            actual: updatedProduct.stockQuantity,
            difference: operation.newQuantity - updatedProduct.stockQuantity,
          });
        }
      } else {
        logger.warn('[StockOperationService] Could not verify product stock - product not found', {
          productId: data.productId,
        });
      }

      let orderUpdated = false;
      let orderStatus: OrderStatus | undefined;

      // If this is a stock out operation with an orderId, update order status
      if (data.type === 'out' && data.orderId) {
        try {
          const order = await this.orderModel.getOrderById(data.orderId);
          
          if (order) {
            // Check if all items in the order have been processed
            const allItemsProcessed = await this.checkAllOrderItemsProcessed(data.orderId);
            
            // Update order status based on current status
            let newStatus: OrderStatus = order.status;
            
            if (order.status === 'processing' || order.status === 'pending') {
              // If order is processing or pending, mark as shipped after stock out
              newStatus = 'shipped';
              orderUpdated = true;
              
              // Update order status
              await this.orderModel.updateOrderStatus(data.orderId, newStatus);
              
              logger.info(`Order ${data.orderId} status updated to 'shipped' after stock out operation`);
            }
            
            orderStatus = newStatus;
          }
        } catch (orderError: any) {
          // Log error but don't fail the stock operation
          logger.error(`Failed to update order status for order ${data.orderId}:`, orderError);
        }
      }

      return {
        operation,
        orderUpdated,
        orderStatus,
      };
    } catch (error: any) {
      logger.error('Error creating stock operation:', error);
      throw error;
    }
  }

  /**
   * Check if all items in an order have been processed (stock out operations exist for all items)
   */
  private async checkAllOrderItemsProcessed(orderId: string): Promise<boolean> {
    try {
      const order = await this.orderModel.getOrderById(orderId);
      if (!order || !order.items || order.items.length === 0) {
        return false;
      }

      // Get all stock out operations for this order
      const { operations } = await this.stockOperationModel.getAllStockOperations({
        orderId,
        type: 'out',
      });

      // Count total quantity processed for each product
      const processedQuantities: Record<string, number> = {};
      operations.forEach(op => {
        processedQuantities[op.productId] = (processedQuantities[op.productId] || 0) + op.quantity;
      });

      // Check if all items have been fully processed
      for (const item of order.items) {
        const processedQty = processedQuantities[item.productId] || 0;
        if (processedQty < item.quantity) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error(`Error checking if order items are processed:`, error);
      return false;
    }
  }

  /**
   * Get stock operations with product and staff information
   */
  async getStockOperationsWithDetails(options?: {
    productId?: string;
    type?: 'in' | 'out';
    performedBy?: string;
    orderId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { operations, total } = await this.stockOperationModel.getAllStockOperations(options);

    // Fetch additional details for each operation
    const operationsWithDetails = await Promise.all(
      operations.map(async (op) => {
        try {
          const product = await ProductModel.findById(op.productId);
          
          // Get staff/performer info (simplified - you might want to fetch from StaffModel)
          return {
            ...op,
            product: product ? {
              id: product.id,
              name: product.name,
              imageUrl: product.imageUrl,
            } : null,
          };
        } catch (error) {
          logger.error(`Error fetching details for stock operation ${op.id}:`, error);
          return {
            ...op,
            product: null,
          };
        }
      })
    );

    return {
      operations: operationsWithDetails,
      total,
    };
  }
}

