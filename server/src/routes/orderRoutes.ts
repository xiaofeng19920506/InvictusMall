import { Router, Response, Request } from 'express';
import { OrderModel, CreateOrderRequest } from '../models/OrderModel';
import {
  authenticateUserToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { ActivityLogModel } from '../models/ActivityLogModel';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const router = Router();
const orderModel = new OrderModel();

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *         description: Filter orders by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of orders to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of orders to skip
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, limit, offset } = req.query;

    const orders = await orderModel.getOrdersByUserId(userId, {
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    return ApiResponseHelper.successWithCount(res, orders, orders.length);
  } catch (error) {
    logger.error('Failed to retrieve orders', error, { userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to retrieve orders', 500, error);
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id as string;
    if (!orderId) {
      return ApiResponseHelper.validationError(res, 'Order ID is required');
    }
    const userId = req.user!.id;

    // Use getOrderByIdAndUserId to ensure user can only access their own orders
    // This is more secure - the database query filters by both orderId AND userId
    // This prevents information leakage (user can't tell if order exists but belongs to someone else)
    const order = await orderModel.getOrderByIdAndUserId(orderId, userId);

    return ApiResponseHelper.success(res, order);
  } catch (error) {
    if (error instanceof Error && error.message === 'Order not found') {
      // Don't reveal whether order exists or not - just return not found
      // This prevents information leakage (user can't tell if order exists but belongs to someone else)
      return ApiResponseHelper.notFound(res, 'Order');
    }

    logger.error('Failed to retrieve order', error, { orderId: req.params.id, userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to retrieve order', 500, error);
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeId
 *               - storeName
 *               - items
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               storeId:
 *                 type: string
 *               storeName:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     productName:
 *                       type: string
 *                     productImage:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *               shippingAddress:
 *                 type: object
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderData: CreateOrderRequest = {
      ...req.body,
      userId
    };

    // Validate required fields
    if (!orderData.storeId || !orderData.storeName || !orderData.items || !orderData.items.length) {
      return ApiResponseHelper.validationError(res, 'Store ID, store name, and items are required');
    }

    if (!orderData.shippingAddress || !orderData.paymentMethod) {
      return ApiResponseHelper.validationError(res, 'Shipping address and payment method are required');
    }

    const order = await orderModel.createOrder(orderData);

    // Log the activity
    try {
      await ActivityLogModel.createLog({
        type: 'order_created',
        message: `Order ${order.id} created for store "${order.storeName}"`,
        metadata: {
          orderId: order.id,
          userId: order.userId,
          storeId: order.storeId,
          totalAmount: order.totalAmount,
          itemCount: order.items.length
        }
      });
    } catch (logError) {
      logger.warn('Failed to log order creation', { orderId: order.id, error: logError });
    }

    return ApiResponseHelper.success(res, order, 'Order created successfully', 201);
  } catch (error) {
    logger.error('Failed to create order', error, { userId: req.user?.id, storeId: req.body.storeId });
    
    // Handle duplicate reservation conflicts with 409 status
    if (error instanceof Error && error.message.includes('Reservation time slot conflict')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        error: 'RESERVATION_CONFLICT'
      });
    }
    
    return ApiResponseHelper.error(res, 'Failed to create order', 500, error);
  }
});

/**
 * @swagger
 * /api/orders/guest/track:
 *   post:
 *     summary: Track guest orders by email
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "guest@example.com"
 *     responses:
 *       200:
 *         description: Guest orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 count:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/guest/track",
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string' || !email.trim()) {
        return ApiResponseHelper.validationError(res, 'Email is required to track guest orders');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return ApiResponseHelper.validationError(res, 'Please provide a valid email address');
      }

      const orders = await orderModel.getOrdersByGuestEmail(email.trim().toLowerCase());

      const message = orders.length > 0 
        ? `Found ${orders.length} order(s) for this email`
        : 'No orders found for this email address';

      return ApiResponseHelper.successWithCount(res, orders, orders.length, message);
    } catch (error) {
      logger.error('Failed to track guest orders', error, { email: req.body.email });
      return ApiResponseHelper.error(res, 'Failed to track guest orders', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/orders/guest/{id}:
 *   get:
 *     summary: Get guest order by ID (no authentication required)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Guest email address for verification
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied (email doesn't match)
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/guest/:id",
  async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const email = req.query.email as string;

      if (!orderId) {
        return ApiResponseHelper.validationError(res, 'Order ID is required');
      }

      if (!email || typeof email !== 'string' || !email.trim()) {
        return ApiResponseHelper.validationError(res, 'Email is required to view guest order');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return ApiResponseHelper.validationError(res, 'Please provide a valid email address');
      }

      const order = await orderModel.getOrderById(orderId);

      // Verify that this is a guest order and email matches
      if (order.userId !== null) {
        return ApiResponseHelper.forbidden(res, 'This is not a guest order');
      }

      if (!order.guestEmail || order.guestEmail.toLowerCase() !== email.trim().toLowerCase()) {
        return ApiResponseHelper.forbidden(res, 'Access denied. Email does not match this order');
      }

      return ApiResponseHelper.success(res, order);
    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        return ApiResponseHelper.notFound(res, 'Order');
      }

      logger.error('Failed to retrieve guest order', error, { orderId: req.params.id, email: req.query.email });
      return ApiResponseHelper.error(res, 'Failed to retrieve order', 500, error);
    }
  }
);

export default router;

