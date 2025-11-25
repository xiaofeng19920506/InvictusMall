import { Router, Request, Response } from "express";
import { calculateTax } from "../services/taxService";

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
router.post("/calculate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { subtotal, zipCode, stateProvince, country } = req.body;

    // Validate required fields
    if (!subtotal || typeof subtotal !== "number" || subtotal <= 0) {
      res.status(400).json({
        success: false,
        message: "Valid subtotal amount is required",
      });
      return;
    }

    if (!zipCode || typeof zipCode !== "string" || zipCode.trim() === "") {
      res.status(400).json({
        success: false,
        message: "ZIP or postal code is required",
      });
      return;
    }

    const result = await calculateTax({
      subtotal,
      zipCode: zipCode.trim(),
      stateProvince: stateProvince?.trim(),
      country: country?.trim(),
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          taxAmount: result.taxAmount,
          taxRate: result.taxRate,
          total: result.total,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || "Failed to calculate tax",
      });
    }
  } catch (error: any) {
    console.error("Error calculating tax:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate tax",
      error: error.message,
    });
  }
});

export default router;

