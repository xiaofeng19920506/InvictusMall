import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { TransactionModel, CreateTransactionRequest, UpdateTransactionRequest, TransactionFilters } from '../models/TransactionModel';
import { authenticateStaffToken, AuthenticatedRequest } from '../middleware/auth';
import { StaffModel } from '../models/StaffModel';
import { OrderModel } from '../models/OrderModel';
import Stripe from 'stripe';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const router = Router();
const transactionModel = new TransactionModel();
const orderModel = new OrderModel();

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get transactions with filters
 *     tags: [Transactions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter by store ID
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [sale, refund, payment, fee, commission]
 *         description: Filter by transaction type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled, refunded]
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of transactions to skip
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 */
router.get('/', authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters: TransactionFilters = {};

    if (req.query.storeId) {
      filters.storeId = req.query.storeId as string;
    }
    if (req.query.transactionType) {
      filters.transactionType = req.query.transactionType as any;
    }
    if (req.query.status) {
      filters.status = req.query.status as any;
    }
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string);
    }
    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string);
    }
    if (req.query.orderId) {
      filters.orderId = req.query.orderId as string;
    }

    // Role-based filtering: owners/managers can only see their store's transactions
    if (req.user && req.user.role !== 'admin') {
      // For non-admin users, we need to get their store ID from staff table
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId) {
        filters.storeId = (staff as any).storeId;
      } else {
        // If no store ID, return empty array for non-admin users
        return ApiResponseHelper.successWithCount(res, [], 0);
      }
    }

    const transactions = await transactionModel.getTransactions(filters);

    return ApiResponseHelper.successWithCount(res, transactions, transactions.length);
  } catch (error) {
    logger.error('Error fetching transactions', error, { userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to fetch transactions', 500, error);
  }
});

/**
 * @swagger
 * /api/transactions/store/{storeId}:
 *   get:
 *     summary: Get transactions for a specific store
 *     tags: [Transactions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of transactions to return
 *     responses:
 *       200:
 *         description: Store transactions retrieved successfully
 */
router.get('/store/:storeId', authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    if (!storeId) {
      return ApiResponseHelper.validationError(res, 'Store ID is required');
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== storeId) {
        return ApiResponseHelper.forbidden(res, 'Insufficient permissions to view this store\'s transactions');
      }
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = await transactionModel.getTransactionsByStoreId(storeId, limit);

    return ApiResponseHelper.successWithCount(res, transactions, transactions.length);
  } catch (error) {
    logger.error('Error fetching store transactions', error, { storeId: req.params.storeId, userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to fetch store transactions', 500, error);
  }
});

/**
 * @swagger
 * /api/transactions/stats/{storeId}:
 *   get:
 *     summary: Get transaction statistics for a store
 *     tags: [Transactions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Transaction statistics retrieved successfully
 */
router.get('/stats/:storeId', authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    if (!storeId) {
      return ApiResponseHelper.validationError(res, 'Store ID is required');
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== storeId) {
        return ApiResponseHelper.forbidden(res, 'Insufficient permissions to view this store\'s statistics');
      }
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await transactionModel.getStoreTransactionStats(storeId, startDate, endDate);

    return ApiResponseHelper.success(res, stats);
  } catch (error) {
    logger.error('Error fetching transaction stats', error, { storeId: req.params.storeId, userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to fetch transaction statistics', 500, error);
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *       404:
 *         description: Transaction not found
 */
router.get('/:id', authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ApiResponseHelper.validationError(res, 'Transaction ID is required');
    }

    const transaction = await transactionModel.getTransactionById(id);
    if (!transaction) {
      return ApiResponseHelper.notFound(res, 'Transaction');
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== transaction.storeId) {
        return ApiResponseHelper.forbidden(res, 'Insufficient permissions to view this transaction');
      }
    }

    return ApiResponseHelper.success(res, transaction);
  } catch (error) {
    logger.error('Error fetching transaction', error, { transactionId: req.params.id, userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to fetch transaction', 500, error);
  }
});

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeId
 *               - transactionType
 *               - amount
 *             properties:
 *               storeId:
 *                 type: string
 *               transactionType:
 *                 type: string
 *                 enum: [sale, refund, payment, fee, commission]
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *               description:
 *                 type: string
 *               customerId:
 *                 type: string
 *               customerName:
 *                 type: string
 *               orderId:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed, cancelled, refunded]
 *               transactionDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Transaction created successfully
 */
router.post('/', authenticateStaffToken, [
  body('storeId').notEmpty().withMessage('Store ID is required'),
  body('transactionType').isIn(['sale', 'refund', 'payment', 'fee', 'commission']).withMessage('Invalid transaction type'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded']).withMessage('Invalid status'),
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponseHelper.validationError(res, 'Validation failed', errors.array());
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== req.body.storeId) {
        return ApiResponseHelper.forbidden(res, 'Insufficient permissions to create transactions for this store');
      }
    }

    const transactionData: CreateTransactionRequest = {
      ...req.body,
      createdBy: req.user?.id,
      transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate) : undefined,
    };

    const transaction = await transactionModel.createTransaction(transactionData);

    return ApiResponseHelper.success(res, transaction, 'Transaction created successfully', 201);
  } catch (error) {
    logger.error('Error creating transaction', error, { userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to create transaction', 500, error);
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Transactions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed, cancelled, refunded]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *       404:
 *         description: Transaction not found
 */
router.put('/:id', authenticateStaffToken, [
  body('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded']).withMessage('Invalid status'),
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponseHelper.validationError(res, 'Validation failed', errors.array());
    }

    const { id } = req.params;
    if (!id) {
      return ApiResponseHelper.validationError(res, 'Transaction ID is required');
    }

    const existingTransaction = await transactionModel.getTransactionById(id);
    if (!existingTransaction) {
      return ApiResponseHelper.notFound(res, 'Transaction');
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== existingTransaction.storeId) {
        return ApiResponseHelper.forbidden(res, 'Insufficient permissions to update this transaction');
      }
    }

    const updateData: UpdateTransactionRequest = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.metadata !== undefined) updateData.metadata = req.body.metadata;

    const updatedTransaction = await transactionModel.updateTransaction(id, updateData);

    return ApiResponseHelper.success(res, updatedTransaction, 'Transaction updated successfully');
  } catch (error) {
    logger.error('Error updating transaction', error, { transactionId: req.params.id, userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to update transaction', 500, error);
  }
});

/**
 * @swagger
 * /api/transactions/stripe/list:
 *   get:
 *     summary: Get Stripe transactions (charges and balance transactions)
 *     tags: [Transactions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of transactions to return
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [charge, balance_transaction, payment_intent]
 *         description: Type of Stripe transaction to retrieve
 *       - in: query
 *         name: starting_after
 *         schema:
 *           type: string
 *         description: Cursor for pagination (ID of last item)
 *     responses:
 *       200:
 *         description: Stripe transactions retrieved successfully
 */
// Helper function to get storeId from a Stripe charge
async function getStoreIdFromCharge(charge: Stripe.Charge): Promise<string | null> {
  try {
    // First, try to get storeId from charge metadata
    if (charge.metadata?.storeId) {
      return charge.metadata.storeId;
    }

    // If charge has a payment_intent, try to get storeId from payment intent
    if (charge.payment_intent) {
      const paymentIntentId = typeof charge.payment_intent === 'string' 
        ? charge.payment_intent 
        : charge.payment_intent.id;
      
      try {
        // First, try to find orders directly by payment_intent_id
        const orders = await orderModel.getOrdersByPaymentIntentId(paymentIntentId);
        if (orders.length > 0 && orders[0]) {
          return orders[0].storeId;
        }
        
        // Fallback: try to get from payment intent metadata
        const paymentIntent = await stripeClient!.paymentIntents.retrieve(paymentIntentId);
        
        // Check payment intent metadata for storeId
        if (paymentIntent.metadata?.storeId) {
          return paymentIntent.metadata.storeId;
        }
        
        // Fallback: try to get session ID from payment intent metadata (for backward compatibility)
        let sessionId = paymentIntent.metadata?.sessionId || paymentIntent.metadata?.checkout_session_id;
        
        // If no session ID in metadata, try to find it by listing checkout sessions with this payment intent
        if (!sessionId && stripeClient) {
          try {
            const sessions = await stripeClient.checkout.sessions.list({
              payment_intent: paymentIntentId,
              limit: 1,
            });
            if (sessions.data.length > 0 && sessions.data[0]) {
              sessionId = sessions.data[0].id;
            }
          } catch (sessionError) {
            logger.error('Error looking up checkout session', sessionError, { paymentIntentId });
          }
        }
        
        if (sessionId) {
          const sessionOrders = await orderModel.getOrdersByStripeSession(sessionId);
          if (sessionOrders.length > 0 && sessionOrders[0]) {
            // Return the first order's storeId (if multiple orders, they should have same storeId)
            return sessionOrders[0].storeId;
          }
        }
      } catch (piError) {
        logger.error('Error retrieving payment intent', piError, { chargeId: charge.id });
      }
    }

    // If we have a customer, try to find recent orders for that customer and match by amount/date
    // This is a fallback and might not be 100% accurate
    if (charge.customer) {
      // This is a less reliable method, so we'll skip it for now
      // and just return null if we can't find it through other means
    }

    return null;
  } catch (error) {
    logger.error('Error getting storeId from charge', error, { chargeId: charge.id });
    return null;
  }
}

router.get('/stripe/list', authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!stripeClient) {
      return ApiResponseHelper.error(res, 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.', 503);
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const type = (req.query.type as string) || 'charge';
    const startingAfter = req.query.starting_after as string | undefined;

    // Role-based filtering: Non-admin users can only see their store's transactions
    let userStoreId: string | null = null;
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId) {
        userStoreId = (staff as any).storeId;
      }
    }

    let transactions: any[] = [];

    try {
      if (type === 'charge') {
        // Get charges
        const charges = await stripeClient.charges.list({
          limit: Math.min(limit, 100),
          starting_after: startingAfter,
        });

        // Process charges and add storeId
        const chargePromises = charges.data.map(async (charge: Stripe.Charge) => {
          const storeId = await getStoreIdFromCharge(charge);
          
          // Filter by user's store if not admin
          if (userStoreId && storeId !== userStoreId) {
            return null;
          }

          return {
            id: charge.id,
            stripeType: 'charge',
            storeId: storeId || null, // Add storeId to the transaction
            amount: charge.amount / 100, // Convert from cents to dollars
            currency: charge.currency.toUpperCase(),
            status: charge.status === 'succeeded' ? 'completed' : 
                    charge.status === 'pending' ? 'pending' : 
                    charge.status === 'failed' ? 'failed' : 'cancelled',
            description: charge.description || `Charge for ${charge.customer || 'customer'}`,
            customerId: charge.customer || undefined,
            customerName: charge.billing_details?.name || undefined,
            paymentMethod: charge.payment_method_details?.type || 
                          (charge.payment_method_details?.card ? 'card' : 'unknown'),
            transactionDate: new Date(charge.created * 1000).toISOString(),
            metadata: {
              stripeChargeId: charge.id,
              receiptUrl: charge.receipt_url,
              receiptNumber: charge.receipt_number,
              refunded: charge.refunded,
              amountRefunded: charge.amount_refunded ? charge.amount_refunded / 100 : 0,
              outcome: charge.outcome,
              source: charge.source,
            },
            createdAt: new Date(charge.created * 1000).toISOString(),
            updatedAt: new Date(charge.created * 1000).toISOString(),
          };
        });

        const chargeResults = await Promise.all(chargePromises);
        transactions = chargeResults.filter(t => t !== null) as any[];
      } else if (type === 'balance_transaction') {
        // Get balance transactions
        const balanceTransactions = await stripeClient.balanceTransactions.list({
          limit: Math.min(limit, 100),
          starting_after: startingAfter,
        });

        // For balance transactions, try to get storeId from the source (charge or payment intent)
        const balanceTransactionPromises = balanceTransactions.data.map(async (bt: Stripe.BalanceTransaction) => {
          let storeId: string | null = null;
          
          // Try to get storeId from the source
          if (bt.source) {
            const sourceId = typeof bt.source === 'string' ? bt.source : bt.source.id;
            const sourceType = typeof bt.source === 'string' ? 'unknown' : bt.source.object;
            
            if (sourceType === 'charge') {
              try {
                const charge = await stripeClient!.charges.retrieve(sourceId);
                storeId = await getStoreIdFromCharge(charge);
              } catch (error) {
                logger.error('Error retrieving charge for balance transaction', error, { balanceTransactionId: bt.id });
              }
            } else if (typeof sourceId === 'string' && sourceId.startsWith('pi_')) {
              // Payment intent IDs start with 'pi_', so we can identify them that way
              try {
                const paymentIntent = await stripeClient!.paymentIntents.retrieve(sourceId);
                if (paymentIntent.metadata?.storeId) {
                  storeId = paymentIntent.metadata.storeId;
                } else {
                  const sessionId = paymentIntent.metadata?.sessionId || paymentIntent.metadata?.checkout_session_id;
                  if (sessionId) {
                    const orders = await orderModel.getOrdersByStripeSession(sessionId);
                    if (orders.length > 0 && orders[0]) {
                      storeId = orders[0].storeId;
                    }
                  }
                }
              } catch (error) {
                logger.error('Error retrieving payment intent for balance transaction', error, { balanceTransactionId: bt.id });
              }
            }
          }

          // Filter by user's store if not admin
          if (userStoreId && storeId !== userStoreId) {
            return null;
          }

          return {
            id: bt.id,
            stripeType: 'balance_transaction',
            storeId: storeId || null, // Add storeId to the transaction
            amount: Math.abs(bt.amount) / 100, // Convert from cents to dollars
            currency: bt.currency.toUpperCase(),
            status: bt.status === 'available' || bt.status === 'pending' ? 
                    (bt.status === 'available' ? 'completed' : 'pending') : 'failed',
            description: bt.description || `Balance transaction: ${bt.type}`,
            transactionType: bt.type.includes('refund') ? 'refund' : 
                            bt.type.includes('charge') ? 'sale' : 
                            bt.type.includes('payment') ? 'payment' : 'fee',
            transactionDate: new Date(bt.created * 1000).toISOString(),
            metadata: {
              stripeBalanceTransactionId: bt.id,
              type: bt.type,
              net: bt.net ? bt.net / 100 : 0,
              fee: bt.fee ? bt.fee / 100 : 0,
              source: bt.source,
            },
            createdAt: new Date(bt.created * 1000).toISOString(),
            updatedAt: new Date(bt.created * 1000).toISOString(),
          };
        });

        const balanceResults = await Promise.all(balanceTransactionPromises);
        transactions = balanceResults.filter(t => t !== null) as any[];
      } else if (type === 'payment_intent') {
        // Get payment intents
        const paymentIntents = await stripeClient.paymentIntents.list({
          limit: Math.min(limit, 100),
          starting_after: startingAfter,
        });

        // Process payment intents and add storeId
        const paymentIntentPromises = paymentIntents.data.map(async (pi: Stripe.PaymentIntent) => {
          // Expand charges if available
          const chargeIds: string[] = [];
          if (pi.latest_charge) {
            chargeIds.push(typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id);
          }

          // Get storeId from payment intent metadata or by looking up orders via payment_intent_id
          let storeId: string | null = null;
          if (pi.metadata?.storeId) {
            storeId = pi.metadata.storeId;
          } else {
            // Try to find orders by payment_intent_id directly
            try {
              const orders = await orderModel.getOrdersByPaymentIntentId(pi.id);
              if (orders.length > 0 && orders[0]) {
                storeId = orders[0].storeId;
              }
            } catch (error) {
              logger.error('Error getting orders by payment intent ID', error, { paymentIntentId: pi.id });
              // Fallback: try to find via checkout session (for backward compatibility)
              let sessionId = pi.metadata?.sessionId || pi.metadata?.checkout_session_id;
              if (!sessionId && stripeClient) {
                try {
                  const sessions = await stripeClient.checkout.sessions.list({
                    payment_intent: pi.id,
                    limit: 1,
                  });
                  if (sessions.data.length > 0 && sessions.data[0]) {
                    sessionId = sessions.data[0].id;
                  }
                } catch (sessionError) {
                  logger.error('Error looking up checkout session for payment intent', sessionError, { paymentIntentId: pi.id });
                }
              }
              if (sessionId) {
                try {
                  const orders = await orderModel.getOrdersByStripeSession(sessionId);
                  if (orders.length > 0 && orders[0]) {
                    storeId = orders[0].storeId;
                  }
                } catch (sessionError) {
                  logger.error('Error getting orders by session', sessionError, { sessionId });
                }
              }
            }
          }

          // Filter by user's store if not admin
          if (userStoreId && storeId !== userStoreId) {
            return null;
          }

          // Map Stripe Payment Intent status to our transaction status
          // Stripe Payment Intent statuses: requires_payment_method, requires_confirmation, requires_action, 
          // requires_capture, processing, succeeded, canceled
          let transactionStatus: 'pending' | 'completed' | 'failed' | 'cancelled';
          if (pi.status === 'succeeded') {
            transactionStatus = 'completed';
          } else if (pi.status === 'canceled') {
            transactionStatus = 'cancelled';
          } else if (
            pi.status === 'processing' || 
            pi.status === 'requires_confirmation' || 
            pi.status === 'requires_payment_method' || 
            pi.status === 'requires_action' || 
            pi.status === 'requires_capture'
          ) {
            // All intermediate states should be marked as pending, not failed
            transactionStatus = 'pending';
          } else {
            // For unknown states, default to pending to avoid false negatives
            // Only explicitly failed states should be marked as failed
            transactionStatus = 'pending';
          }

          return {
            id: pi.id,
            stripeType: 'payment_intent',
            storeId: storeId || null, // Add storeId to the transaction
            amount: pi.amount / 100, // Convert from cents to dollars
            currency: pi.currency.toUpperCase(),
            status: transactionStatus,
            description: pi.description || `Payment intent: ${pi.id}`,
            customerId: pi.customer || undefined,
            paymentMethod: pi.payment_method_types[0] || 'unknown',
            transactionDate: new Date(pi.created * 1000).toISOString(),
            metadata: {
              stripePaymentIntentId: pi.id,
              clientSecret: pi.client_secret,
              charges: chargeIds,
              originalStatus: pi.status, // Include original Stripe status for debugging
            },
            createdAt: new Date(pi.created * 1000).toISOString(),
            updatedAt: new Date(pi.created * 1000).toISOString(), // Use created since updated may not exist
          };
        });

        const paymentIntentResults = await Promise.all(paymentIntentPromises);
        transactions = paymentIntentResults.filter(t => t !== null) as any[];
      }

      return res.status(200).json({
        success: true,
        data: transactions,
        count: transactions.length,
        hasMore: transactions.length === limit,
        lastId: transactions.length > 0 ? transactions[transactions.length - 1].id : undefined,
      });
    } catch (stripeError: any) {
      logger.error('Stripe API error', stripeError, { userId: req.user?.id });
      return ApiResponseHelper.error(res, 'Failed to fetch Stripe transactions', 500, stripeError);
    }
  } catch (error) {
    logger.error('Error fetching Stripe transactions', error, { userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to fetch Stripe transactions', 500, error);
  }
});

export default router;

