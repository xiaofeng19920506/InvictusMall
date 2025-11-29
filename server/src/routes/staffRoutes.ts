import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { StaffModel } from "../models/StaffModel";
import { StaffInvitationModel } from "../models/StaffInvitationModel";
import {
  authenticateStaffToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { handleStaffLogin } from "../services/staff/staffLoginService";
import { handleGetStaffProfile } from "../services/staff/staffProfileService";
import { handleStaffRegister } from "../services/staff/staffRegistrationService";
import { handleStaffInvite } from "../services/staff/staffInvitationService";
import { handleStaffSetupPassword } from "../services/staff/staffPasswordService";
import { handleGetAllStaff } from "../services/staff/staffListService";
import { handleUpdateStaff } from "../services/staff/staffUpdateService";
import { staffController } from "../controllers/staff/StaffController";

const router = Router();
const staffModel = new StaffModel();
const invitationModel = new StaffInvitationModel();

/**
 * @swagger
 * /api/staff/login:
 *   post:
 *     summary: Staff login
 *     tags: [Staff Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@invictusmall.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     role:
 *                       type: string
 *                     enum: [admin, owner, manager, employee]
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMap: { [key: string]: string } = {};
        errors.array().forEach((err: any) => {
          if (err.param) {
            errorMap[err.param] = err.msg;
          }
        });
        ApiResponseHelper.validationError(res, "Invalid input data", errorMap);
        return;
      }
      await handleStaffLogin(req, res, staffModel);
    } catch (error) {
      ApiResponseHelper.error(res, "Failed to login", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/staff/me:
 *   get:
 *     summary: Get current staff member
 *     tags: [Staff Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Staff member data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [admin, owner, manager, employee]
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticateStaffToken, async (req: Request, res: Response) => {
  await handleGetStaffProfile(req, res, staffModel);
});

/**
 * @swagger
 * /api/staff/register:
 *   post:
 *     summary: Register a new staff member (Admin/Owner only)
 *     tags: [Staff Authentication]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - phoneNumber
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: ['admin', 'owner', 'manager', 'employee']
 *               department:
 *                 type: string
 *               employeeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Staff member created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Insufficient permissions (admin/owner only)
 *       409:
 *         description: Email or employee ID already exists
 */
router.post(
  "/register",
  authenticateStaffToken,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").trim().isLength({ min: 1 }),
    body("lastName").trim().isLength({ min: 1 }),
    body("phoneNumber").trim().isLength({ min: 10 }),
    body("role").isIn(["admin", "owner", "manager", "employee"]),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMap: { [key: string]: string } = {};
        errors.array().forEach((err: any) => {
          if (err.param) {
            errorMap[err.param] = err.msg;
          }
        });
        ApiResponseHelper.validationError(res, "Invalid input data", errorMap);
        return;
      }
      await handleStaffRegister(req, res, staffModel);
    } catch (error) {
      ApiResponseHelper.error(res, "Internal server error", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/staff/invite:
 *   post:
 *     summary: Invite a new staff member (Admin/Owner only)
 *     tags: [Staff Authentication]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: ['admin', 'owner', 'manager', 'employee']
 *               department:
 *                 type: string
 *               employeeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Staff invitation sent successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Insufficient permissions (admin/owner only)
 *       409:
 *         description: Email already exists
 */
router.post(
  "/invite",
  authenticateStaffToken,
  [
    body("email").isEmail().normalizeEmail(),
    body("firstName").trim().isLength({ min: 1 }),
    body("lastName").trim().isLength({ min: 1 }),
    body("role").isIn(["admin", "owner", "manager", "employee"]),
    handleValidationErrors,
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    await handleStaffInvite(req, res, staffModel, invitationModel);
  }
);

/**
 * @swagger
 * /api/staff/setup-password:
 *   post:
 *     summary: Set password for invited staff member
 *     tags: [Staff Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - phoneNumber
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password set successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Invalid or expired invitation token
 */
router.post(
  "/setup-password",
  [
    body("token").trim().isLength({ min: 1 }),
    body("password").isLength({ min: 6 }),
    body("phoneNumber").trim().isLength({ min: 10 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMap: { [key: string]: string } = {};
        errors.array().forEach((err: any) => {
          if (err.param) {
            errorMap[err.param] = err.msg;
          }
        });
        ApiResponseHelper.validationError(res, "Invalid input data", errorMap);
        return;
      }
      await handleStaffSetupPassword(req, res, staffModel, invitationModel);
    } catch (error) {
      ApiResponseHelper.error(res, "Internal server error", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/staff/logout:
 *   post:
 *     summary: Staff logout
 *     tags: [Staff Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 */
router.post("/logout", (req: Request, res: Response) => {
  // Clear the HTTP-only cookie
  res.clearCookie("staff_auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  });

  return res.json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * @swagger
 * /api/staff/all:
 *   get:
 *     summary: Get all staff members (role-based access)
 *     tags: [Staff Management]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Returns staff members based on requester's role:
 *       - Admin: Can see all staff members
 *       - Owner: Can see all staff members
 *       - Manager: Can see employees and managers (not admins/owners)
 *       - Employee: Can only see themselves
 *     responses:
 *       200:
 *         description: Staff members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       role:
 *                         type: string
 *                       department:
 *                         type: string
 *                       employeeId:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get("/all", authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  await handleGetAllStaff(req, res, staffModel);
});

/**
 * @swagger
 * /api/staff/{id}:
 *   put:
 *     summary: Update staff member
 *     tags: [Staff Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, owner, manager, employee]
 *               department:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Staff member updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Staff member not found
 */
router.put(
  "/:id",
  authenticateStaffToken,
  [
    body("firstName").optional().trim().isLength({ min: 1 }).withMessage("First name cannot be empty"),
    body("lastName").optional().trim().isLength({ min: 1 }).withMessage("Last name cannot be empty"),
    body("phoneNumber").optional().trim().isLength({ min: 1 }).withMessage("Phone number cannot be empty"),
    body("role").optional().isIn(["admin", "owner", "manager", "employee"]).withMessage("Invalid role"),
    body("department").optional().trim(),
    body("employeeId").optional().trim(),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMap: { [key: string]: string } = {};
        errors.array().forEach((err: any) => {
          if (err.param) {
            errorMap[err.param] = err.msg;
          }
        });
        ApiResponseHelper.validationError(res, "Validation failed", errorMap);
        return;
      }
      await handleUpdateStaff(req, res, staffModel);
    } catch (error: any) {
      ApiResponseHelper.error(res, error.message || "Failed to update staff member", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/staff/my-stores:
 *   get:
 *     summary: Get all stores associated with the current staff member
 *     tags: [Staff Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of stores retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/my-stores",
  authenticateStaffToken,
  staffController.getMyStores
);

export default router;
