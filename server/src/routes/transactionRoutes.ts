import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { TransactionModel, CreateTransactionRequest, UpdateTransactionRequest, TransactionFilters } from '../models/TransactionModel';
import { authenticateStaffToken, AuthenticatedRequest } from '../middleware/auth';
import { StaffModel } from '../models/StaffModel';
import Stripe from 'stripe';

const router = Router();
const transactionModel = new TransactionModel();

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

    // Role-based filtering: owners/managers can only see their store's transactions
    if (req.user && req.user.role !== 'admin') {
      // For non-admin users, we need to get their store ID from staff table
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId) {
        filters.storeId = (staff as any).storeId;
      } else {
        // If no store ID, return empty array for non-admin users
        return res.json({
          success: true,
          data: [],
          count: 0
        });
      }
    }

    const transactions = await transactionModel.getTransactions(filters);

    return res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== storeId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view this store\'s transactions'
        });
      }
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = await transactionModel.getTransactionsByStoreId(storeId, limit);

    return res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error fetching store transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch store transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== storeId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view this store\'s statistics'
        });
      }
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await transactionModel.getStoreTransactionStats(storeId, startDate, endDate);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const transaction = await transactionModel.getTransactionById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== transaction.storeId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view this transaction'
        });
      }
    }

    return res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== req.body.storeId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create transactions for this store'
        });
      }
    }

    const transactionData: CreateTransactionRequest = {
      ...req.body,
      createdBy: req.user?.id,
      transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate) : undefined,
    };

    const transaction = await transactionModel.createTransaction(transactionData);

    return res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const existingTransaction = await transactionModel.getTransactionById(id);
    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Role-based access control
    if (req.user && req.user.role !== 'admin') {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId !== existingTransaction.storeId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update this transaction'
        });
      }
    }

    const updateData: UpdateTransactionRequest = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.metadata !== undefined) updateData.metadata = req.body.metadata;

    const updatedTransaction = await transactionModel.updateTransaction(id, updateData);

    return res.json({
      success: true,
      data: updatedTransaction,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
router.get('/stripe/list', authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.'
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const type = (req.query.type as string) || 'charge';
    const startingAfter = req.query.starting_after as string | undefined;

    let transactions: any[] = [];

    try {
      if (type === 'charge') {
        // Get charges
        const charges = await stripeClient.charges.list({
          limit: Math.min(limit, 100),
          starting_after: startingAfter,
        });

        transactions = charges.data.map((charge: Stripe.Charge) => ({
          id: charge.id,
          stripeType: 'charge',
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
        }));
      } else if (type === 'balance_transaction') {
        // Get balance transactions
        const balanceTransactions = await stripeClient.balanceTransactions.list({
          limit: Math.min(limit, 100),
          starting_after: startingAfter,
        });

        transactions = balanceTransactions.data.map((bt: Stripe.BalanceTransaction) => ({
          id: bt.id,
          stripeType: 'balance_transaction',
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
        }));
      } else if (type === 'payment_intent') {
        // Get payment intents
        const paymentIntents = await stripeClient.paymentIntents.list({
          limit: Math.min(limit, 100),
          starting_after: startingAfter,
        });

        transactions = paymentIntents.data.map((pi: Stripe.PaymentIntent) => {
          // Expand charges if available
          const chargeIds: string[] = [];
          if (pi.latest_charge) {
            chargeIds.push(typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id);
          }

          return {
            id: pi.id,
            stripeType: 'payment_intent',
            amount: pi.amount / 100, // Convert from cents to dollars
            currency: pi.currency.toUpperCase(),
            status: pi.status === 'succeeded' ? 'completed' : 
                    pi.status === 'processing' || pi.status === 'requires_confirmation' ? 'pending' : 
                    pi.status === 'canceled' ? 'cancelled' : 'failed',
            description: pi.description || `Payment intent: ${pi.id}`,
            customerId: pi.customer || undefined,
            paymentMethod: pi.payment_method_types[0] || 'unknown',
            transactionDate: new Date(pi.created * 1000).toISOString(),
            metadata: {
              stripePaymentIntentId: pi.id,
              clientSecret: pi.client_secret,
              charges: chargeIds,
            },
            createdAt: new Date(pi.created * 1000).toISOString(),
            updatedAt: new Date(pi.created * 1000).toISOString(), // Use created since updated may not exist
          };
        });
      }

      return res.json({
        success: true,
        data: transactions,
        count: transactions.length,
        hasMore: transactions.length === limit,
        lastId: transactions.length > 0 ? transactions[transactions.length - 1].id : undefined,
      });
    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch Stripe transactions',
        error: stripeError.message || 'Stripe API error'
      });
    }
  } catch (error) {
    console.error('Error fetching Stripe transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Stripe transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

