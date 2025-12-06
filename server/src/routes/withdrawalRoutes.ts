import { Router, Response } from 'express';
import { WithdrawalModel, CreateWithdrawalRequest, UpdateWithdrawalRequest } from '../models/WithdrawalModel';
import {
  authenticateUserToken,
  authenticateStaffToken,
  requireAdmin,
  requireAdminOrOwner,
  AuthenticatedRequest,
} from '../middleware/auth';
import { hasStoreAccess } from '../utils/ownerPermissions';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { ActivityLogModel } from '../models/ActivityLogModel';
import { StoreModel } from '../models/StoreModel';

const router = Router();
const withdrawalModel = new WithdrawalModel();

// Platform commission rate (10% default, can be made configurable)
const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.1');

/**
 * @swagger
 * /api/admin/withdrawals/balance/{storeId}:
 *   get:
 *     summary: Get store balance (admin only)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store balance retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/admin/withdrawals/balance/:storeId',
  authenticateStaffToken,
  requireAdminOrOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { storeId } = req.params;

      if (!storeId) {
        return ApiResponseHelper.validationError(res, 'Store ID is required');
      }

      if (!storeId) {
        return ApiResponseHelper.validationError(res, 'Store ID is required');
      }
      
      const balance = await withdrawalModel.getStoreBalance(storeId, PLATFORM_COMMISSION_RATE);

      return ApiResponseHelper.success(res, balance);
    } catch (error) {
      logger.error('Failed to get store balance', error, { storeId: req.params.storeId });
      return ApiResponseHelper.error(res, 'Failed to get store balance', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/admin/withdrawals:
 *   get:
 *     summary: Get all withdrawal requests (admin only)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, processing, completed, rejected, cancelled]
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Withdrawals retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/admin/withdrawals',
  authenticateStaffToken,
  requireAdminOrOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, storeId, limit, offset } = req.query;
      const userId = req.user?.id || req.staff?.id;
      const userRole = req.user?.role || req.staff?.role;

      logger.info('Fetching withdrawals', {
        userId,
        userRole,
        status,
        storeId,
        limit,
        offset,
        queryParams: {
          status: status as any,
          storeId: storeId as string,
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
        },
      });

      const withdrawals = await withdrawalModel.getWithdrawals({
        status: status as any,
        storeId: storeId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      
      logger.info('Withdrawals query result', {
        count: withdrawals.length,
        filters: {
          status: status as any,
          storeId: storeId as string,
        },
      });

      logger.info('Withdrawals fetched successfully', {
        count: withdrawals.length,
        withdrawals: withdrawals.map(w => ({ id: w.id, storeId: w.storeId, status: w.status, amount: w.amount })),
      });

      // Log the actual data being returned
      const firstWithdrawal = withdrawals.length > 0 ? withdrawals[0] : null;
      logger.info('Returning withdrawals data', {
        withdrawalsCount: withdrawals.length,
        firstWithdrawal: firstWithdrawal ? {
          id: firstWithdrawal.id,
          storeId: firstWithdrawal.storeId,
          storeName: firstWithdrawal.storeName,
          amount: firstWithdrawal.amount,
          status: firstWithdrawal.status,
        } : null,
      });

      // Log the response structure before sending
      const responseData = {
        success: true,
        data: withdrawals,
      };
      logger.info('Response structure', {
        success: responseData.success,
        dataType: typeof responseData.data,
        dataIsArray: Array.isArray(responseData.data),
        dataLength: Array.isArray(responseData.data) ? responseData.data.length : 'N/A',
      });

      return ApiResponseHelper.success(res, withdrawals);
    } catch (error) {
      logger.error('Failed to get withdrawals', error);
      return ApiResponseHelper.error(res, 'Failed to get withdrawals', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/admin/withdrawals/{id}:
 *   get:
 *     summary: Get withdrawal by ID (admin only)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Withdrawal retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Withdrawal not found
 */
router.get(
  '/admin/withdrawals/:id',
  authenticateStaffToken,
  requireAdminOrOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseHelper.validationError(res, 'Withdrawal ID is required');
      }

      const withdrawal = await withdrawalModel.getWithdrawalById(id);

      if (!withdrawal) {
        return ApiResponseHelper.notFound(res, 'Withdrawal');
      }

      return ApiResponseHelper.success(res, withdrawal);
    } catch (error) {
      logger.error('Failed to get withdrawal', error, { withdrawalId: req.params.id });
      return ApiResponseHelper.error(res, 'Failed to get withdrawal', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/approve:
 *   post:
 *     summary: Approve a withdrawal request (admin only)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Withdrawal approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Withdrawal not found
 */
router.post(
  '/admin/withdrawals/:id/approve',
  authenticateStaffToken,
  requireAdminOrOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.user?.id || req.staff?.id;
      
      if (!id) {
        return ApiResponseHelper.validationError(res, 'Withdrawal ID is required');
      }
      
      if (!adminId) {
        return ApiResponseHelper.error(res, 'Unauthorized', 401);
      }

      const withdrawal = await withdrawalModel.getWithdrawalById(id);

      if (!withdrawal) {
        return ApiResponseHelper.notFound(res, 'Withdrawal');
      }

      if (withdrawal.status !== 'pending') {
        return ApiResponseHelper.error(
          res,
          `Cannot approve withdrawal with status: ${withdrawal.status}`,
          400
        );
      }

      // Check if store has sufficient balance
      const balance = await withdrawalModel.getStoreBalance(withdrawal.storeId, PLATFORM_COMMISSION_RATE);
      if (balance.availableBalance < withdrawal.amount) {
        return ApiResponseHelper.error(
          res,
          `Insufficient balance. Available: $${balance.availableBalance.toFixed(2)}, Requested: $${withdrawal.amount.toFixed(2)}`,
          400
        );
      }

      const updateData: UpdateWithdrawalRequest = {
        status: 'approved',
        approvedBy: adminId,
      };

      const updated = await withdrawalModel.updateWithdrawal(id, updateData);

      // Log activity
      try {
        await ActivityLogModel.createLog({
          type: 'system',
          message: `Withdrawal ${id} approved by admin`,
          storeId: withdrawal.storeId,
          metadata: {
            withdrawalId: id,
            amount: withdrawal.amount,
            approvedBy: adminId,
          },
        });
      } catch (logError) {
        logger.warn('Failed to log withdrawal approval', { withdrawalId: id, error: logError });
      }

      return ApiResponseHelper.success(res, updated, 'Withdrawal approved successfully');
    } catch (error) {
      logger.error('Failed to approve withdrawal', error, { withdrawalId: req.params.id });
      return ApiResponseHelper.error(res, 'Failed to approve withdrawal', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/reject:
 *   post:
 *     summary: Reject a withdrawal request (admin only)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal rejected successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Withdrawal not found
 */
router.post(
  '/admin/withdrawals/:id/reject',
  authenticateStaffToken,
  requireAdminOrOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      
      if (!id) {
        return ApiResponseHelper.validationError(res, 'Withdrawal ID is required');
      }
      
      const adminId = req.user?.id || req.staff?.id;
      
      if (!adminId) {
        return ApiResponseHelper.error(res, 'Unauthorized', 401);
      }

      const withdrawal = await withdrawalModel.getWithdrawalById(id);

      if (!withdrawal) {
        return ApiResponseHelper.notFound(res, 'Withdrawal');
      }

      if (withdrawal.status !== 'pending' && withdrawal.status !== 'approved') {
        return ApiResponseHelper.error(
          res,
          `Cannot reject withdrawal with status: ${withdrawal.status}`,
          400
        );
      }

      const updateData: UpdateWithdrawalRequest = {
        status: 'rejected',
        rejectionReason: rejectionReason || 'Rejected by administrator',
      };

      const updated = await withdrawalModel.updateWithdrawal(id, updateData);

      // Log activity
      try {
        await ActivityLogModel.createLog({
          type: 'system',
          message: `Withdrawal ${id} rejected by admin`,
          storeId: withdrawal.storeId,
          metadata: {
            withdrawalId: id,
            amount: withdrawal.amount,
            rejectedBy: adminId,
            rejectionReason: rejectionReason,
          },
        });
      } catch (logError) {
        logger.warn('Failed to log withdrawal rejection', { withdrawalId: id, error: logError });
      }

      return ApiResponseHelper.success(res, updated, 'Withdrawal rejected successfully');
    } catch (error) {
      logger.error('Failed to reject withdrawal', error, { withdrawalId: req.params.id });
      return ApiResponseHelper.error(res, 'Failed to reject withdrawal', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/complete:
 *   post:
 *     summary: Mark withdrawal as completed (after processing payment) (admin only)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal marked as completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Withdrawal not found
 */
router.post(
  '/admin/withdrawals/:id/complete',
  authenticateStaffToken,
  requireAdminOrOwner,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      if (!id) {
        return ApiResponseHelper.validationError(res, 'Withdrawal ID is required');
      }
      
      const adminId = req.user?.id || req.staff?.id;
      
      if (!adminId) {
        return ApiResponseHelper.error(res, 'Unauthorized', 401);
      }

      const withdrawal = await withdrawalModel.getWithdrawalById(id);

      if (!withdrawal) {
        return ApiResponseHelper.notFound(res, 'Withdrawal');
      }

      if (withdrawal.status !== 'approved' && withdrawal.status !== 'processing') {
        return ApiResponseHelper.error(
          res,
          `Cannot complete withdrawal with status: ${withdrawal.status}`,
          400
        );
      }

      const updateData: UpdateWithdrawalRequest = {
        status: 'completed',
        processedBy: adminId,
        notes: notes || withdrawal.notes,
      };

      const updated = await withdrawalModel.updateWithdrawal(id, updateData);

      // Log activity
      try {
        await ActivityLogModel.createLog({
          type: 'system',
          message: `Withdrawal ${id} completed by admin`,
          storeId: withdrawal.storeId,
          metadata: {
            withdrawalId: id,
            amount: withdrawal.amount,
            processedBy: adminId,
          },
        });
      } catch (logError) {
        logger.warn('Failed to log withdrawal completion', { withdrawalId: id, error: logError });
      }

      return ApiResponseHelper.success(res, updated, 'Withdrawal marked as completed successfully');
    } catch (error) {
      logger.error('Failed to complete withdrawal', error, { withdrawalId: req.params.id });
      return ApiResponseHelper.error(res, 'Failed to complete withdrawal', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/stores/{storeId}/withdrawals/balance:
 *   get:
 *     summary: Get store balance (store owner/manager only)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Store balance retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/stores/:storeId/withdrawals/balance',
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { storeId } = req.params;
      const staffId = req.user?.id || req.staff?.id;

      if (!staffId) {
        return ApiResponseHelper.error(res, 'Unauthorized', 401);
      }

      // Verify staff has access to this store
      if (!storeId) {
        return ApiResponseHelper.validationError(res, 'Store ID is required');
      }
      
      if (!storeId) {
        return ApiResponseHelper.validationError(res, 'Store ID is required');
      }
      
      const hasAccess = await hasStoreAccess(req, storeId);
      if (!hasAccess) {
        return ApiResponseHelper.error(res, 'Access denied to this store', 403);
      }

      if (!storeId) {
        return ApiResponseHelper.validationError(res, 'Store ID is required');
      }
      
      const balance = await withdrawalModel.getStoreBalance(storeId, PLATFORM_COMMISSION_RATE);

      return ApiResponseHelper.success(res, balance);
    } catch (error) {
      logger.error('Failed to get store balance', error, { storeId: req.params.storeId });
      return ApiResponseHelper.error(res, 'Failed to get store balance', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/stores/{storeId}/withdrawals:
 *   get:
 *     summary: Get withdrawals for a store (store owner/manager only)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Withdrawals retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/stores/:storeId/withdrawals',
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { storeId } = req.params;
      const staffId = req.user?.id || req.staff?.id;
      const userRole = req.user?.role || req.staff?.role;

      if (!staffId) {
        return ApiResponseHelper.error(res, 'Unauthorized', 401);
      }

      // Verify staff has access to this store
      if (!storeId) {
        return ApiResponseHelper.validationError(res, 'Store ID is required');
      }
      
      const hasAccess = await hasStoreAccess(req, storeId);
      if (!hasAccess) {
        logger.warn('Access denied to store', { staffId, userRole, storeId });
        return ApiResponseHelper.error(res, 'Access denied to this store', 403);
      }

      logger.info('Fetching store withdrawals', {
        staffId,
        userRole,
        storeId,
      });

      const withdrawals = await withdrawalModel.getWithdrawalsByStoreId(storeId);

      logger.info('Store withdrawals fetched successfully', {
        storeId,
        count: withdrawals.length,
        withdrawals: withdrawals.map(w => ({ id: w.id, status: w.status, amount: w.amount })),
      });

      return ApiResponseHelper.success(res, withdrawals);
    } catch (error) {
      logger.error('Failed to get store withdrawals', error, { storeId: req.params.storeId });
      return ApiResponseHelper.error(res, 'Failed to get store withdrawals', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/stores/{storeId}/withdrawals:
 *   post:
 *     summary: Create a withdrawal request (store owner/manager only)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - bankAccountName
 *               - bankAccountNumber
 *               - bankRoutingNumber
 *               - bankName
 *             properties:
 *               amount:
 *                 type: number
 *               bankAccountName:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *               bankRoutingNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Withdrawal request created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/stores/:storeId/withdrawals',
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { storeId } = req.params;
      const staffId = req.user?.id || req.staff?.id;

      if (!staffId) {
        return ApiResponseHelper.error(res, 'Unauthorized', 401);
      }

      // Verify staff has access to this store
      if (!storeId) {
        return ApiResponseHelper.validationError(res, 'Store ID is required');
      }
      
      if (!storeId) {
        return ApiResponseHelper.validationError(res, 'Store ID is required');
      }
      
      const hasAccess = await hasStoreAccess(req, storeId);
      if (!hasAccess) {
        return ApiResponseHelper.error(res, 'Access denied to this store', 403);
      }

      const {
        amount,
        bankAccountName,
        bankAccountNumber,
        bankRoutingNumber,
        bankName,
        notes,
      } = req.body;

      // Validation
      if (!amount || amount <= 0) {
        return ApiResponseHelper.validationError(res, 'Valid amount is required');
      }

      if (!bankAccountName || !bankAccountNumber || !bankRoutingNumber || !bankName) {
        return ApiResponseHelper.validationError(res, 'All bank account details are required');
      }

      // Check if store has sufficient balance
      if (!storeId) {
        return ApiResponseHelper.validationError(res, 'Store ID is required');
      }
      
      const balance = await withdrawalModel.getStoreBalance(storeId, PLATFORM_COMMISSION_RATE);
      if (balance.availableBalance < amount) {
        return ApiResponseHelper.error(
          res,
          `Insufficient balance. Available: $${balance.availableBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
          400
        );
      }

      const withdrawalData: CreateWithdrawalRequest = {
        storeId,
        amount,
        bankAccountName,
        bankAccountNumber,
        bankRoutingNumber,
        bankName,
        requestedBy: staffId,
        notes,
      };

      const withdrawal = await withdrawalModel.createWithdrawal(withdrawalData);

      // Log activity
      try {
        await ActivityLogModel.createLog({
          type: 'system',
          message: `Withdrawal request created for store ${storeId}`,
          storeId,
          metadata: {
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            requestedBy: staffId,
          },
        });
      } catch (logError) {
        logger.warn('Failed to log withdrawal creation', { withdrawalId: withdrawal.id, error: logError });
      }

      return ApiResponseHelper.success(res, withdrawal, 'Withdrawal request created successfully', 201);
    } catch (error) {
      logger.error('Failed to create withdrawal', error, { storeId: req.params.storeId });
      return ApiResponseHelper.error(res, 'Failed to create withdrawal', 500, error);
    }
  }
);

export default router;

