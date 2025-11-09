import { Router, Request, Response } from 'express';
import { ActivityLogModel, ActivityLog } from '../models/ActivityLogModel';

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
router.get('/', async (req: Request, res: Response) => {
  try {
    const limitParam = req.query.limit as string;
    const limit = limitParam && !isNaN(parseInt(limitParam)) ? parseInt(limitParam) : 20;
    const logs = await ActivityLogModel.getRecentLogs(limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs'
    });
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
router.get('/store/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    if (!storeId) {
      res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
      return;
    }
    const limit = parseInt(req.query.limit as string) || 10;
    const logs = await ActivityLogModel.getLogsByStoreId(storeId, limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching store activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store activity logs'
    });
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
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    if (!type) {
      res.status(400).json({
        success: false,
        message: 'Activity type is required'
      });
      return;
    }
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!['store_created', 'store_updated', 'store_deleted', 'store_verified'].includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Invalid activity type'
      });
      return;
    }
    
    const logs = await ActivityLogModel.getLogsByType(type as ActivityLog['type'], limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching activity logs by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs by type'
    });
  }
});

export default router;

