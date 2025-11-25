import { Router, Request, Response } from "express";
import { calculateTax } from "../services/taxService";
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

export default router;

