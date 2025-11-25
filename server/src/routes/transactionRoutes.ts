import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { TransactionModel } from "../models/TransactionModel";
import { authenticateStaffToken, AuthenticatedRequest } from "../middleware/auth";
import { OrderModel } from "../models/OrderModel";
import Stripe from "stripe";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { handleGetTransactions } from "../services/transaction/transactionListService";
import { handleGetStoreTransactions } from "../services/transaction/transactionStoreService";
import { handleGetStoreStats } from "../services/transaction/transactionStatsService";
import { handleGetTransactionById } from "../services/transaction/transactionDetailService";
import { handleCreateTransaction } from "../services/transaction/transactionCreateService";
import { handleUpdateTransaction } from "../services/transaction/transactionUpdateService";
import { handleGetStripeTransactions } from "../services/transaction/stripeTransactionService";

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
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of transactions to skip
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Filter by order ID
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 */
router.get("/", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  await handleGetTransactions(req, res, transactionModel);
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
router.get("/store/:storeId", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  await handleGetStoreTransactions(req, res, transactionModel);
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
router.get("/stats/:storeId", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  await handleGetStoreStats(req, res, transactionModel);
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
router.get("/:id", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  await handleGetTransactionById(req, res, transactionModel);
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
router.post(
  "/",
  authenticateStaffToken,
  [
    body("storeId").notEmpty().withMessage("Store ID is required"),
    body("transactionType")
      .isIn(["sale", "refund", "payment", "fee", "commission"])
      .withMessage("Invalid transaction type"),
    body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be a positive number"),
    body("currency").optional().isLength({ min: 3, max: 3 }).withMessage("Currency must be 3 characters"),
    body("status")
      .optional()
      .isIn(["pending", "completed", "failed", "cancelled", "refunded"])
      .withMessage("Invalid status"),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, "Validation failed", errors.array());
        return;
      }
      await handleCreateTransaction(req, res, transactionModel);
    } catch (error) {
      ApiResponseHelper.error(res, "Failed to create transaction", 500, error);
    }
  }
);

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
router.put(
  "/:id",
  authenticateStaffToken,
  [
    body("status")
      .optional()
      .isIn(["pending", "completed", "failed", "cancelled", "refunded"])
      .withMessage("Invalid status"),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, "Validation failed", errors.array());
        return;
      }
      await handleUpdateTransaction(req, res, transactionModel);
    } catch (error) {
      ApiResponseHelper.error(res, "Failed to update transaction", 500, error);
    }
  }
);

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
router.get("/stripe/list", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  await handleGetStripeTransactions(req, res, orderModel, stripeClient);
});

export default router;
