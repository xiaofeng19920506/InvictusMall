import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticateAnyToken } from "../middleware/auth";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";

const router = Router();

/**
 * @swagger
 * /api/reservations/available-time-slots:
 *   get:
 *     summary: Get available time slots for a reservation
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product/Service ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Reservation date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Available time slots retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     availableTimeSlots:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "09:00"
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.get(
  "/available-time-slots",
  authenticateAnyToken,
  async (req: Request, res: Response) => {
    try {
      const { productId, date } = req.query;

      if (!productId || !date) {
        return ApiResponseHelper.validationError(res, "productId and date are required");
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date as string)) {
        return ApiResponseHelper.validationError(res, "Invalid date format. Expected YYYY-MM-DD");
      }

      // Check if date is in the past
      const selectedDate = new Date(date as string);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        return ApiResponseHelper.validationError(res, "Cannot book reservations for past dates");
      }

      // Generate all possible time slots (9:00 AM to 6:00 PM)
      const allTimeSlots: string[] = [];
      for (let hour = 9; hour <= 18; hour++) {
        const timeString = `${hour.toString().padStart(2, "0")}:00`;
        allTimeSlots.push(timeString);
      }

      // Query database for booked time slots
      const query = `
        SELECT DISTINCT oi.reservation_time
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ?
          AND oi.is_reservation = TRUE
          AND oi.reservation_date = ?
          AND o.status NOT IN ('cancelled')
        ORDER BY oi.reservation_time
      `;

      const [rows] = await pool.execute(query, [productId, date]);
      const bookedTimeSlots = (rows as any[]).map((row) => row.reservation_time);

      // Filter out booked time slots
      const availableTimeSlots = allTimeSlots.filter(
        (slot) => !bookedTimeSlots.includes(slot)
      );

      return ApiResponseHelper.success(res, {
        availableTimeSlots,
        bookedTimeSlots,
      });
    } catch (error) {
      logger.error("Error fetching available time slots", error, { productId: req.query.productId, date: req.query.date });
      return ApiResponseHelper.error(res, "Failed to fetch available time slots", 500, error);
    }
  }
);

export default router;

