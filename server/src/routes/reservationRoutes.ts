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
 *     summary: Get available time slots for a reservation (Public endpoint)
 *     tags: [Reservations]
 *     security: []  # No authentication required
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
 *                       description: List of available time slots in HH:mm format
 *                     bookedTimeSlots:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "10:00"
 *                       description: List of already booked time slots
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.get(
  "/available-time-slots",
  // No authentication required - users should be able to check availability before booking
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
      // Include ALL non-cancelled orders (including pending)
      // This prevents multiple users from selecting the same time slot
      const query = `
        SELECT DISTINCT oi.reservation_time
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ?
          AND oi.is_reservation = TRUE
          AND oi.reservation_date = ?
          AND o.status NOT IN ('cancelled')
        ORDER BY reservation_time
      `;

      const [rows] = await pool.execute(query, [productId, date]);
      // MySQL stores TIME as HH:MM:SS, but we generate HH:MM
      // So we need to normalize both to HH:MM format for comparison
      const bookedTimeSlots = (rows as any[]).map((row) => {
        const time = row.reservation_time;
        // If time is a string like "11:00:00", extract "11:00"
        if (typeof time === 'string' && time.includes(':')) {
          return time.substring(0, 5); // Get HH:MM part
        }
        return time;
      });

      // Return all time slots with availability status
      const timeSlotsWithAvailability = allTimeSlots.map((timeslot) => ({
        timeslot,
        isAvailable: !bookedTimeSlots.includes(timeslot),
      }));

      return ApiResponseHelper.success(res, {
        timeSlots: timeSlotsWithAvailability,
      });
    } catch (error) {
      logger.error("Error fetching available time slots", error, { productId: req.query.productId, date: req.query.date });
      return ApiResponseHelper.error(res, "Failed to fetch available time slots", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/reservations/check-time-slot:
 *   post:
 *     summary: Check if a specific time slot is available (before adding to cart)
 *     tags: [Reservations]
 *     security: []  # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - date
 *               - timeSlot
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product/Service ID
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Reservation date (YYYY-MM-DD)
 *               timeSlot:
 *                 type: string
 *                 description: Time slot to check (HH:mm format)
 *     responses:
 *       200:
 *         description: Time slot availability checked
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
 *                     available:
 *                       type: boolean
 *                       description: Whether the time slot is available
 *                     message:
 *                       type: string
 *                       description: Availability message
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post(
  "/check-time-slot",
  // No authentication required - users should be able to check availability before booking
  async (req: Request, res: Response) => {
    try {
      const { productId, date, timeSlot } = req.body;

      if (!productId || !date || !timeSlot) {
        return ApiResponseHelper.validationError(res, "productId, date, and timeSlot are required");
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return ApiResponseHelper.validationError(res, "Invalid date format. Expected YYYY-MM-DD");
      }

      // Validate time slot format (HH:mm)
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(timeSlot)) {
        return ApiResponseHelper.validationError(res, "Invalid time slot format. Expected HH:mm");
      }

      // Check if date is in the past
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        return ApiResponseHelper.validationError(res, "Cannot book reservations for past dates");
      }

      // Check if time slot is already booked (including ALL pending orders)
      // Match the logic from /available-time-slots endpoint for consistency
      const query = `
        SELECT COUNT(*) as count
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ?
          AND oi.is_reservation = TRUE
          AND oi.reservation_date = ?
          AND oi.reservation_time = ?
          AND o.status NOT IN ('cancelled')
      `;

      const [rows] = await pool.execute(query, [productId, date, timeSlot]);
      const result = rows as any[];
      const isBooked = result.length > 0 && result[0].count > 0;

      return ApiResponseHelper.success(res, {
        available: !isBooked,
        message: isBooked
          ? "This time slot is no longer available. Please select another time slot."
          : "Time slot is available.",
      });
    } catch (error) {
      logger.error("Error checking time slot availability", error, { 
        productId: req.body.productId, 
        date: req.body.date,
        timeSlot: req.body.timeSlot 
      });
      return ApiResponseHelper.error(res, "Failed to check time slot availability", 500, error);
    }
  }
);

export default router;

