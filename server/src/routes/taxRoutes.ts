import { Router, Request, Response } from "express";
import { calculateTax } from "../services/taxService";
import { calculatePricing } from "../services/pricingService";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";

const router = Router();

/**
 * @swagger
 * /api/tax/calculate:
 *   post:
 *     summary: Calculate tax based on address
 *     tags: [Tax]
 *     security: []  # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subtotal
 *               - zipCode
 *             properties:
 *               subtotal:
 *                 type: number
 *                 description: Order subtotal amount
 *                 example: 100.00
 *               zipCode:
 *                 type: string
 *                 description: ZIP or postal code
 *                 example: "90210"
 *               stateProvince:
 *                 type: string
 *                 description: State or province code (optional, used for fallback)
 *                 example: "CA"
 *               country:
 *                 type: string
 *                 description: Country code (optional, defaults to US)
 *                 example: "US"
 *     responses:
 *       200:
 *         description: Tax calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     taxAmount:
 *                       type: number
 *                       example: 8.00
 *                     taxRate:
 *                       type: number
 *                       example: 0.08
 *                     total:
 *                       type: number
 *                       example: 108.00
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid subtotal amount"
 */
router.post("/calculate", async (req: Request, res: Response) => {
  try {
    const { subtotal, zipCode, stateProvince, country } = req.body;

    // Validate required fields
    if (!subtotal || typeof subtotal !== "number" || subtotal <= 0) {
      return ApiResponseHelper.validationError(res, "Valid subtotal amount is required");
    }

    if (!zipCode || typeof zipCode !== "string" || zipCode.trim() === "") {
      return ApiResponseHelper.validationError(res, "ZIP or postal code is required");
    }

    const result = await calculateTax({
      subtotal,
      zipCode: zipCode.trim(),
      stateProvince: stateProvince?.trim(),
      country: country?.trim(),
    });

    if (result.success) {
      return ApiResponseHelper.success(res, {
        taxAmount: result.taxAmount,
        taxRate: result.taxRate,
        total: result.total,
      });
    } else {
      return ApiResponseHelper.error(res, result.message || "Failed to calculate tax", 400);
    }
  } catch (error: any) {
    logger.error("Error calculating tax", error, { subtotal: req.body.subtotal, zipCode: req.body.zipCode });
    return ApiResponseHelper.error(res, "Failed to calculate tax", 500, error);
  }
});

/**
 * @swagger
 * /api/tax/calculate-pricing:
 *   post:
 *     summary: Calculate complete pricing breakdown (subtotal, tax, shipping, total)
 *     tags: [Tax]
 *     security: []  # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - shippingAddress
 *             properties:
 *               items:
 *                 type: array
 *                 description: Array of items with price and quantity
 *                 items:
 *                   type: object
 *                   properties:
 *                     price:
 *                       type: number
 *                       example: 25.99
 *                     quantity:
 *                       type: number
 *                       example: 2
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - zipCode
 *                 properties:
 *                   zipCode:
 *                     type: string
 *                     example: "90210"
 *                   stateProvince:
 *                     type: string
 *                     example: "CA"
 *                   country:
 *                     type: string
 *                     example: "US"
 *     responses:
 *       200:
 *         description: Pricing calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     subtotal:
 *                       type: number
 *                       example: 51.98
 *                     taxAmount:
 *                       type: number
 *                       example: 3.77
 *                     taxRate:
 *                       type: number
 *                       example: 0.0725
 *                     shippingAmount:
 *                       type: number
 *                       example: 0.00
 *                     total:
 *                       type: number
 *                       example: 55.75
 *       400:
 *         description: Invalid request
 */
router.post("/calculate-pricing", async (req: Request, res: Response) => {
  try {
    const { items, shippingAddress } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return ApiResponseHelper.validationError(res, "Items array is required");
    }

    if (!shippingAddress || !shippingAddress.zipCode) {
      return ApiResponseHelper.validationError(res, "Shipping address with zipCode is required");
    }

    // Validate items structure
    for (const item of items) {
      if (typeof item.price !== "number" || item.price < 0) {
        return ApiResponseHelper.validationError(res, "Each item must have a valid price");
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        return ApiResponseHelper.validationError(res, "Each item must have a valid quantity");
      }
    }

    const pricing = await calculatePricing({
      items,
      shippingAddress: {
        zipCode: shippingAddress.zipCode.trim(),
        stateProvince: shippingAddress.stateProvince?.trim(),
        country: shippingAddress.country?.trim() || "US",
      },
    });

    return ApiResponseHelper.success(res, pricing);
  } catch (error: any) {
    logger.error("Error calculating pricing", error, {
      itemsCount: req.body.items?.length,
      zipCode: req.body.shippingAddress?.zipCode,
    });
    return ApiResponseHelper.error(
      res,
      error.message || "Failed to calculate pricing",
      500,
      error
    );
  }
});

export default router;

