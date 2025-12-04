import { Router, Request, Response } from 'express';
import { ActivityLogModel, ActivityLog } from '../models/ActivityLogModel';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { authenticateStaffToken, AuthenticatedRequest } from '../middleware/auth';
import { getAccessibleStoreIds } from '../utils/ownerPermissions';

const router = Router();

/**
 * @swagger
 * /api/activity-logs:
 *   get:
 *     summary: Get recent activity logs
 *     tags: [Activity Logs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of logs to return
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 */
router.get('/', authenticateStaffToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const limitParam = req.query.limit as string;
    const limit = limitParam && !isNaN(parseInt(limitParam)) ? parseInt(limitParam) : 20;
    
    // Get accessible store IDs for owner filtering
    const accessibleStoreIds = await getAccessibleStoreIds(authReq);
    
    // If owner has no accessible stores, return empty
    if (accessibleStoreIds !== null && accessibleStoreIds.length === 0) {
      return ApiResponseHelper.successWithCount(res, [], 0);
    }
    
    // Filter logs by accessible stores (null means all stores for admin)
    const storeIds = accessibleStoreIds !== null ? accessibleStoreIds : undefined;
    const logs = await ActivityLogModel.getRecentLogs(limit, storeIds);
    
    return ApiResponseHelper.successWithCount(res, logs, logs.length);
  } catch (error) {
    logger.error('Error fetching activity logs', error);
    return ApiResponseHelper.error(res, 'Failed to fetch activity logs', 500, error);
  }
});

/**
 * @swagger
 * /api/activity-logs/store/{storeId}:
 *   get:
 *     summary: Get activity logs for a specific store
 *     tags: [Activity Logs]
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
 *           default: 10
 *         description: Number of logs to return
 *     responses:
 *       200:
 *         description: Store activity logs retrieved successfully
 */
router.get('/store/:storeId', authenticateStaffToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { storeId } = req.params;
    if (!storeId) {
      return ApiResponseHelper.validationError(res, 'Store ID is required');
    }
    
    // Check if owner has access to this store
    const accessibleStoreIds = await getAccessibleStoreIds(authReq);
    if (accessibleStoreIds !== null) {
      if (accessibleStoreIds.length === 0 || !accessibleStoreIds.includes(storeId)) {
        return ApiResponseHelper.error(res, 'Access denied to this store', 403);
      }
    }
    
    const limit = parseInt(req.query.limit as string) || 10;
    const logs = await ActivityLogModel.getLogsByStoreId(storeId, limit);
    
    return ApiResponseHelper.successWithCount(res, logs, logs.length);
  } catch (error) {
    logger.error('Error fetching store activity logs', error, { storeId: req.params.storeId });
    return ApiResponseHelper.error(res, 'Failed to fetch store activity logs', 500, error);
  }
});

/**
 * @swagger
 * /api/activity-logs/type/{type}:
 *   get:
 *     summary: Get activity logs by type
 *     tags: [Activity Logs]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [store_created, store_updated, store_deleted, store_verified]
 *         description: Activity type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of logs to return
 *     responses:
 *       200:
 *         description: Activity logs by type retrieved successfully
 */
router.get('/type/:type', authenticateStaffToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { type } = req.params;
    if (!type) {
      return ApiResponseHelper.validationError(res, 'Activity type is required');
    }
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!['store_created', 'store_updated', 'store_deleted', 'store_verified', 'user_registered', 'user_login', 'password_reset_requested', 'password_reset_completed', 'password_changed', 'staff_registered', 'staff_invited', 'staff_login', 'profile_updated', 'avatar_uploaded', 'order_created', 'order_status_updated'].includes(type)) {
      return ApiResponseHelper.validationError(res, 'Invalid activity type');
    }
    
    // Get accessible store IDs for owner filtering
    const accessibleStoreIds = await getAccessibleStoreIds(authReq);
    
    // If owner has no accessible stores, return empty
    if (accessibleStoreIds !== null && accessibleStoreIds.length === 0) {
      return ApiResponseHelper.successWithCount(res, [], 0);
    }
    
    // Filter logs by accessible stores (null means all stores for admin)
    const storeIds = accessibleStoreIds !== null ? accessibleStoreIds : undefined;
    const logs = await ActivityLogModel.getLogsByType(type as ActivityLog['type'], limit, storeIds);
    
    return ApiResponseHelper.successWithCount(res, logs, logs.length);
  } catch (error) {
    logger.error('Error fetching activity logs by type', error, { type: req.params.type });
    return ApiResponseHelper.error(res, 'Failed to fetch activity logs by type', 500, error);
  }
});

export default router;

