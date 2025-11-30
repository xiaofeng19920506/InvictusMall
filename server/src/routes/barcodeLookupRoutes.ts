import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateStaffToken, AuthenticatedRequest } from '../middleware/auth';
import { BarcodeLookupService } from '../services/barcodeLookupService';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const router = Router();
const barcodeLookupService = new BarcodeLookupService();

/**
 * Lookup product information by barcode from external sources
 * GET /api/barcode-lookup/:barcode
 */
router.get(
  '/:barcode',
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { barcode } = req.params;

      if (!barcode || barcode.trim().length === 0) {
        ApiResponseHelper.validationError(res, 'Barcode is required');
        return;
      }

      logger.info('[BarcodeLookupRoutes] Barcode lookup request', {
        barcode,
        staffId: req.staff?.id,
      });

      const result = await barcodeLookupService.lookupBarcode(barcode.trim());

      if (result.success && result.product) {
        ApiResponseHelper.success(
          res,
          {
            ...result.product,
            source: result.source,
          },
          `Product found via ${result.source}`
        );
      } else {
        ApiResponseHelper.notFound(
          res,
          `Product with barcode "${barcode}" not found in external databases`
        );
      }
    } catch (error: any) {
      logger.error('[BarcodeLookupRoutes] Barcode lookup error:', error);
      ApiResponseHelper.error(res, 'Failed to lookup barcode', 500, error);
    }
  }
);

/**
 * Lookup product information by barcode (POST method for longer barcodes)
 * POST /api/barcode-lookup
 */
router.post(
  '/',
  authenticateStaffToken,
  [
    body('barcode').trim().isLength({ min: 1 }).withMessage('Barcode is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, 'Validation failed', errors.mapped());
        return;
      }

      const { barcode } = req.body;

      logger.info('[BarcodeLookupRoutes] Barcode lookup request (POST)', {
        barcode,
        staffId: req.staff?.id,
      });

      const result = await barcodeLookupService.lookupBarcode(barcode.trim());

      if (result.success && result.product) {
        ApiResponseHelper.success(
          res,
          {
            ...result.product,
            source: result.source,
          },
          `Product found via ${result.source}`
        );
      } else {
        ApiResponseHelper.notFound(
          res,
          `Product with barcode "${barcode}" not found in external databases`
        );
      }
    } catch (error: any) {
      logger.error('[BarcodeLookupRoutes] Barcode lookup error:', error);
      ApiResponseHelper.error(res, 'Failed to lookup barcode', 500, error);
    }
  }
);

export default router;

