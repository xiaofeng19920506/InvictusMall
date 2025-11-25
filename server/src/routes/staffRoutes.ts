import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { StaffModel, CreateStaffRequest, UpdateStaffRequest } from '../models/StaffModel';
import { StaffInvitationModel } from '../models/StaffInvitationModel';
import { ActivityLogModel } from '../models/ActivityLogModel';
import { getUserNameFromRequest, getUserIdFromRequest } from '../utils/activityLogHelper';
import { emailService } from '../services/emailService';
import {
  authenticateStaffToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { handleValidationErrors } from '../middleware/validation';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const router = Router();
const staffModel = new StaffModel();
const invitationModel = new StaffInvitationModel();
const JWT_SECRET = process.env.JWT_SECRET || "";

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
 *                       enum: [admin, owner, manager, employee]
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMap: { [key: string]: string } = {};
      errors.array().forEach((err: any) => {
        if (err.param) {
          errorMap[err.param] = err.msg;
        }
      });
      return ApiResponseHelper.validationError(res, 'Invalid input data', errorMap);
    }

    const { email, password } = req.body;

    // Get staff member
    const staff = await staffModel.getStaffByEmail(email);
    if (!staff) {
      return ApiResponseHelper.unauthorized(res, 'Invalid email or password');
    }

    // Verify password
    const isValidPassword = await staffModel.verifyPassword(staff, password);
    if (!isValidPassword) {
      return ApiResponseHelper.unauthorized(res, 'Invalid email or password');
    }

    // Update last login
    await staffModel.updateLastLogin(staff.id);

    // Generate JWT token
    const tokenPayload = {
      staffId: staff.id,
      email: staff.email,
      role: staff.role,
      type: 'staff'
    };

    logger.debug('JWT Payload', { tokenPayload, jwtSecretLength: JWT_SECRET?.length || 0 });

    // Calculate expiration time explicitly (7 days from now)
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (7 * 24 * 60 * 60); // 7 days in seconds

    logger.debug('JWT signing', { now, exp, expDate: new Date(exp * 1000) });

    const token = jwt.sign(
      {
        ...tokenPayload,
        iat: now,
        exp: exp
      },
      JWT_SECRET as string
    );

    // Decode and log the token to check expiration
    const decoded = jwt.decode(token) as any;
    logger.debug('JWT decoded', { iat: decoded.iat, exp: decoded.exp, expDate: new Date(decoded.exp * 1000) });

    // Log the activity
    try {
      const userName = `${staff.firstName} ${staff.lastName}`;
      await ActivityLogModel.createLog({
        type: 'user_login',
        message: `Staff member "${userName}" logged in`,
        userId: staff.id,
        userName,
        metadata: {
          staffId: staff.id,
          email: staff.email,
          role: staff.role,
          type: 'staff_login'
        }
      });
    } catch (logError) {
      logger.warn('Failed to log staff login', { error: logError, staffId: staff.id });
      // Continue with login even if logging fails
    }

    // Set HTTP-only cookie with JWT token
    // For cross-origin requests in development, use 'none' with secure: false
    // Note: Modern browsers may reject sameSite: 'none' without secure: true
    // In production with HTTPS, use 'strict' for better security
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('staff_auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'none', // 'none' allows cross-origin requests
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    // Return staff data without password
    const { password: _, ...staffWithoutPassword } = staff;

    // In development, also return token in response body as fallback for Bearer token auth
    // This is needed when cookies don't work (e.g., cross-origin with sameSite: 'none' on HTTP)
    const responseData: any = {
      success: true,
      message: 'Login successful',
      user: staffWithoutPassword
    };

    // Only include token in response for development (not production for security)
    if (process.env.NODE_ENV !== 'production') {
      responseData.token = token;
    }

    return ApiResponseHelper.success(res, responseData, 'Login successful');
  } catch (error) {
    logger.error('Staff login error', error, { email: req.body.email });
    return ApiResponseHelper.error(res, 'Failed to login', 500, error);
  }
});

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
  try {
    // Check if this is a staff token
    const token = req.cookies.staff_auth_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!token) {
      return ApiResponseHelper.unauthorized(res, 'Access token required');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'staff') {
      return ApiResponseHelper.unauthorized(res, 'Invalid token type');
    }

    // Get staff member
    const staff = await staffModel.getStaffById(decoded.staffId);
    if (!staff) {
      return ApiResponseHelper.unauthorized(res, 'Staff member not found');
    }

    return ApiResponseHelper.success(res, { user: staff });
  } catch (error) {
    logger.error('Get staff member error', error);
    return ApiResponseHelper.unauthorized(res, 'Invalid or expired token');
  }
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
router.post("/register", authenticateStaffToken, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('phoneNumber').trim().isLength({ min: 10 }),
  body('role').isIn(['admin', 'owner', 'manager', 'employee'])
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user has permission to create staff (admin or owner only)
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
      return ApiResponseHelper.forbidden(res, 'Insufficient permissions to create staff members');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMap: { [key: string]: string } = {};
      errors.array().forEach((err: any) => {
        if (err.param) {
          errorMap[err.param] = err.msg;
        }
      });
      return ApiResponseHelper.validationError(res, 'Invalid input data', errorMap);
    }

    const staffData: CreateStaffRequest = req.body;

    // Check if email already exists
    const emailExists = await staffModel.emailExists(staffData.email);
    if (emailExists) {
      return ApiResponseHelper.error(res, 'Email already registered', 409);
    }

    // Check if employee ID already exists (if provided)
    if (staffData.employeeId) {
      const employeeIdExists = await staffModel.employeeIdExists(staffData.employeeId);
      if (employeeIdExists) {
        return ApiResponseHelper.error(res, 'Employee ID already exists', 409);
      }
    }

    // Create staff member
    const staff = await staffModel.createStaff({
      ...staffData,
      createdBy: req.user.id
    });

    // Log activity
    const userId = getUserIdFromRequest(req);
    const userName = await getUserNameFromRequest(req);
    await ActivityLogModel.createLog({
      type: 'staff_registered',
      message: `New staff member ${staff.email} (${staff.role}) registered`,
      userId,
      userName,
      metadata: { 
        staffId: staff.id, 
        email: staff.email, 
        role: staff.role, 
        createdBy: req.user.id 
      }
    });

    return ApiResponseHelper.success(
      res,
      {
        user: {
          id: staff.id,
          email: staff.email,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          employeeId: staff.employeeId
        }
      },
      'Staff member created successfully',
      201
    );
  } catch (error) {
    logger.error('Staff registration error', error, { email: req.body.email, userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Internal server error', 500, error);
  }
});

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
router.post("/invite", authenticateStaffToken, [
  body('email').isEmail().normalizeEmail(),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['admin', 'owner', 'manager', 'employee']),
  handleValidationErrors
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user has permission to create staff (admin, owner, or manager)
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'manager')) {
      return ApiResponseHelper.forbidden(res, 'Insufficient permissions to create staff members');
    }

    const { email, firstName, lastName, role, department, employeeId, storeId } = req.body;
    const requesterRole = req.user.role;
    const requesterId = req.user.id;

    // Role-based restrictions
    if (requesterRole === 'admin') {
      // Admin can only invite owner role
      if (role !== 'owner') {
        return ApiResponseHelper.forbidden(res, 'Admin can only invite staff with owner role');
      }
      // Store ID is optional for admin inviting owner
    } else if (requesterRole === 'owner') {
      // Owner can only invite manager and employee roles
      if (role !== 'manager' && role !== 'employee') {
        return ApiResponseHelper.forbidden(res, 'Owner can only invite staff with manager or employee role');
      }
    } else if (requesterRole === 'manager') {
      // Manager can only invite employee roles
      if (role !== 'employee') {
        return ApiResponseHelper.forbidden(res, 'Manager can only invite staff with employee role');
      }
    }

    // Check if email already exists in staff table
    const emailExists = await staffModel.emailExists(email);
    if (emailExists) {
      return ApiResponseHelper.error(res, 'Email already registered', 409);
    }

    // Check if employee ID already exists (if provided)
    if (employeeId) {
      const employeeIdExists = await staffModel.employeeIdExists(employeeId);
      if (employeeIdExists) {
        return ApiResponseHelper.error(res, 'Employee ID already exists', 409);
      }
    }

    // Get final store ID based on requester role
    // Store ID is optional for all roles
    let finalStoreId: string | undefined = storeId || undefined;
    // For owner and manager, use their store ID if available, otherwise use provided storeId or undefined
    if (requesterRole === 'owner') {
      const requesterStaff = await staffModel.getStaffById(requesterId);
      const requesterStoreId = (requesterStaff as any)?.storeId;
      if (requesterStoreId) {
        finalStoreId = requesterStoreId;
      } else if (storeId) {
        finalStoreId = storeId;
      }
    } else if (requesterRole === 'manager') {
      const requesterStaff = await staffModel.getStaffById(requesterId);
      const requesterStoreId = (requesterStaff as any)?.storeId;
      if (requesterStoreId) {
        finalStoreId = requesterStoreId;
      } else if (storeId) {
        finalStoreId = storeId;
      }
    }

    // Create invitation
    const invitation = await invitationModel.createInvitation({
      email,
      firstName,
      lastName,
      role,
      department,
      employeeId,
      storeId: finalStoreId,
      invitedBy: req.user.id
    });

    // Send invitation email
    const emailSent = await emailService.sendStaffInvitationEmail(
      email,
      firstName,
      lastName,
      role,
      invitation.token
    );

    // Log activity
    const userId = getUserIdFromRequest(req);
    const userName = await getUserNameFromRequest(req);
    await ActivityLogModel.createLog({
      type: 'staff_registered',
      message: `Staff invitation sent to ${email} (${role})`,
      userId,
      userName,
      metadata: { 
        invitationId: invitation.id, 
        email, 
        role, 
        invitedBy: req.user.id,
        emailSent 
      }
    });

    return ApiResponseHelper.success(
      res,
      {
        emailSent,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        }
      },
      'Staff invitation sent successfully',
      201
    );
  } catch (error) {
    logger.error('Staff invitation error', error, { email: req.body.email, userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Internal server error', 500, error);
  }
});

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
router.post('/setup-password', [
  body('token').trim().isLength({ min: 1 }),
  body('password').isLength({ min: 6 }),
  body('phoneNumber').trim().isLength({ min: 10 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMap: { [key: string]: string } = {};
        errors.array().forEach((err: any) => {
          if (err.param) {
            errorMap[err.param] = err.msg;
          }
        });
        return ApiResponseHelper.validationError(res, 'Invalid input data', errorMap);
    }

    const { token, password, phoneNumber } = req.body;

    // Get invitation by token
    const invitation = await invitationModel.getInvitationByToken(token);
    if (!invitation) {
      return ApiResponseHelper.notFound(res, 'Invitation');
    }

    // Create staff member
    const staff = await staffModel.createStaff({
      email: invitation.email,
      password,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      phoneNumber,
      role: invitation.role,
      department: invitation.department,
      employeeId: invitation.employeeId,
      storeId: invitation.storeId,
      createdBy: invitation.invitedBy
    });

    // Mark invitation as used
    await invitationModel.markInvitationAsUsed(token);

    // Generate JWT token for staff
    const jwtToken = jwt.sign(
      { 
        staffId: staff.id, 
        email: staff.email, 
        role: staff.role,
        type: 'staff'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    // For cross-origin requests in development, use 'none' with secure: false
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('staff_auth_token', jwtToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'none', // 'none' allows cross-origin requests
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    // Log activity
    const userName = `${staff.firstName} ${staff.lastName}`;
    await ActivityLogModel.createLog({
      type: 'staff_registered',
      message: `Staff member ${staff.email} completed registration via invitation.`,
      userId: staff.id,
      userName,
      metadata: { 
        staffId: staff.id, 
        email: staff.email, 
        role: staff.role,
        invitationId: invitation.id
      }
    });

    return res.json({
      success: true,
      message: 'Password set successfully. You are now logged in.',
      user: {
        id: staff.id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phoneNumber: staff.phoneNumber,
        role: staff.role,
        department: staff.department,
        employeeId: staff.employeeId,
        isActive: staff.isActive,
        emailVerified: staff.emailVerified,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
        lastLoginAt: staff.lastLoginAt,
        createdBy: staff.createdBy
      }
    });
  } catch (error) {
    logger.error('Setup password error', error, { token: req.body.token });
    return ApiResponseHelper.error(res, 'Internal server error', 500, error);
  }
});

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
router.post('/logout', (req: Request, res: Response) => {
  // Clear the HTTP-only cookie
  res.clearCookie('staff_auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
  });

  return res.json({
    success: true,
    message: 'Logout successful'
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
router.get('/all', authenticateStaffToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return ApiResponseHelper.unauthorized(res, 'Unauthorized');
    }

    const requesterRole = req.user.role;
    const requesterId = req.user.id;
    const { limit, offset } = req.query;
    let staffMembers: any[] = [];
    let total = 0;

    // Get requester's staff info to check store_id
    const requesterStaff = await staffModel.getStaffById(requesterId);
    const requesterStoreId = (requesterStaff as any)?.storeId || null;

    // Role-based data filtering
    if (requesterRole === 'admin') {
      // Admin can see all staff members - use pagination if limit is provided
      if (limit !== undefined) {
        const { staff, total: totalCount } = await staffModel.getAllStaffWithPagination({
          limit: parseInt(limit as string) || undefined,
          offset: offset !== undefined ? parseInt(offset as string) : undefined,
        });
        staffMembers = staff;
        total = totalCount;
      } else {
        staffMembers = await staffModel.getAllStaff();
        total = staffMembers.length;
      }
    } else if (requesterRole === 'owner') {
      // Store owner can see all staff in the same store
      if (requesterStoreId) {
        const allStaff = await staffModel.getAllStaff();
        staffMembers = allStaff.filter(
          (staff: any) => staff.storeId === requesterStoreId
        );
        total = staffMembers.length;
        // Apply pagination manually if limit is provided
        if (limit !== undefined) {
          const limitValue = parseInt(limit as string) || 0;
          const offsetValue = offset !== undefined ? parseInt(offset as string) : 0;
          staffMembers = staffMembers.slice(offsetValue, offsetValue + limitValue);
        }
      } else {
        // If owner has no store_id, return empty array
        staffMembers = [];
        total = 0;
      }
    } else if (requesterRole === 'manager') {
      // Manager can see all staff including owner (in same store)
      if (requesterStoreId) {
        const allStaff = await staffModel.getAllStaff();
        staffMembers = allStaff.filter(
          (staff: any) => staff.storeId === requesterStoreId
        );
        total = staffMembers.length;
        // Apply pagination manually if limit is provided
        if (limit !== undefined) {
          const limitValue = parseInt(limit as string) || 0;
          const offsetValue = offset !== undefined ? parseInt(offset as string) : 0;
          staffMembers = staffMembers.slice(offsetValue, offsetValue + limitValue);
        }
      } else {
        // If manager has no store_id, return empty array
        staffMembers = [];
        total = 0;
      }
    } else if (requesterRole === 'employee') {
      // Employee can only see themselves
      const staff = await staffModel.getStaffById(requesterId);
      staffMembers = staff ? [staff] : [];
      total = staffMembers.length;
    } else {
      return ApiResponseHelper.forbidden(res, 'Insufficient permissions');
    }

    // Remove password from response and add edit permission info
    const staffWithPermissions = staffMembers.map(({ password, ...staff }) => {
      let canEdit = false;
      const isSelf = staff.id === requesterId;
      
      // Edit permission logic
      if (isSelf) {
        // Everyone can edit their own information
        canEdit = true;
      } else if (requesterRole === 'admin') {
        // Admin can edit everyone
        canEdit = true;
      } else if (requesterRole === 'owner') {
        // Owner can edit staff in their store (but not other owners)
        canEdit = (staff as any).storeId === requesterStoreId &&
                  staff.role !== 'owner'; // Cannot edit other owners
      } else if (requesterRole === 'manager') {
        // Manager can edit employees and managers (but not owner or admin)
        canEdit = staff.role !== 'owner' && 
                  staff.role !== 'admin' &&
                  (staff.role === 'employee' || staff.role === 'manager');
      }
      // Employee can only edit themselves

      return {
        ...staff,
        canEdit
      };
    });

    const response: any = {
      success: true,
      data: staffWithPermissions || [],
      count: staffWithPermissions.length,
    };
    
    // Include total only if limit was provided (indicating pagination)
    if (limit !== undefined) {
      response.total = total;
    }
    
    return res.json(response);
  } catch (error) {
    logger.error('Error fetching all staff', error, { requesterId: req.user?.id, requesterRole: req.user?.role });
    return ApiResponseHelper.error(res, 'Failed to fetch staff members', 500, error);
  }
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
router.put('/:id', authenticateStaffToken, [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('phoneNumber').optional().trim().isLength({ min: 1 }).withMessage('Phone number cannot be empty'),
  body('role').optional().isIn(['admin', 'owner', 'manager', 'employee']).withMessage('Invalid role'),
  body('department').optional().trim(),
  body('employeeId').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMap: { [key: string]: string } = {};
      errors.array().forEach((err: any) => {
        if (err.param) {
          errorMap[err.param] = err.msg;
        }
      });
      return ApiResponseHelper.validationError(res, 'Validation failed', errorMap);
    }

    if (!req.user) {
      return ApiResponseHelper.unauthorized(res, 'Unauthorized');
    }

    const { id } = req.params;
    if (!id) {
      return ApiResponseHelper.validationError(res, 'Staff ID is required');
    }

    const requesterRole = req.user.role;
    const requesterId = req.user.id;

    // Check if staff member exists
    const existingStaff = await staffModel.getStaffById(id);
    if (!existingStaff) {
        return ApiResponseHelper.notFound(res, 'Staff member');
    }

    const isSelf = id === requesterId;

    // Permission checks
    if (isSelf) {
      // Everyone can edit their own information
      // No additional permission checks needed
    } else if (requesterRole === 'admin') {
      // Admin can edit everyone
      // No additional permission checks needed
    } else if (requesterRole === 'owner') {
      // Owner can edit staff in their store with lower access levels (managers and employees, but not other owners or admins)
      const requesterStaff = await staffModel.getStaffById(requesterId);
      if (!requesterStaff) {
        return ApiResponseHelper.notFound(res, 'Requester staff');
      }
      const requesterStoreId = (requesterStaff as any)?.storeId;
      const targetStoreId = (existingStaff as any)?.storeId;
      
      // Check if target is in same store and has lower access
      if (targetStoreId !== requesterStoreId || 
          existingStaff.role === 'owner' || 
          existingStaff.role === 'admin') {
        return ApiResponseHelper.forbidden(res, 'Insufficient permissions to edit this staff member');
      }
    } else if (requesterRole === 'manager') {
      // Manager can edit employees and managers in same store (but not owner or admin)
      const requesterStaff = await staffModel.getStaffById(requesterId);
      if (!requesterStaff) {
        return ApiResponseHelper.notFound(res, 'Requester staff');
      }
      const requesterStoreId = (requesterStaff as any)?.storeId;
      const targetStoreId = (existingStaff as any)?.storeId;
      
      // Check if target is in same store and has lower or equal access
      if (targetStoreId !== requesterStoreId ||
          existingStaff.role === 'owner' || 
          existingStaff.role === 'admin') {
        return ApiResponseHelper.forbidden(res, 'Insufficient permissions to edit this staff member');
      }
    } else {
      // Employee can only edit themselves
      return ApiResponseHelper.forbidden(res, 'Insufficient permissions');
    }

    // Prepare update data
    const updateData: UpdateStaffRequest = {};
    if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
    if (req.body.phoneNumber !== undefined) updateData.phoneNumber = req.body.phoneNumber;
    if (req.body.role !== undefined) {
      // Role change restrictions
      if (isSelf) {
        // Users cannot change their own role - skip this field silently
        // Do not include role in updateData
      } else {
        // Role change restrictions for editing others
        if (requesterRole === 'admin') {
          // Admin can change any role
          updateData.role = req.body.role;
        } else if (requesterRole === 'owner') {
          // Owner can only change roles to manager or employee (cannot assign owner/admin)
          if (req.body.role === 'owner' || req.body.role === 'admin') {
            return ApiResponseHelper.forbidden(res, 'Owner can only assign manager or employee roles');
          }
          // Owner cannot change role of another owner
          if (existingStaff.role === 'owner') {
            return ApiResponseHelper.forbidden(res, 'Cannot change role of owner');
          }
          updateData.role = req.body.role;
        } else if (requesterRole === 'manager') {
          // Manager can only change roles between manager and employee (cannot assign owner/admin)
          if (req.body.role === 'owner' || req.body.role === 'admin') {
            return ApiResponseHelper.forbidden(res, 'Cannot assign owner or admin role');
          }
          // Manager can change employee/manager roles
          if (existingStaff.role === 'employee' || existingStaff.role === 'manager') {
            updateData.role = req.body.role;
          } else {
            return ApiResponseHelper.forbidden(res, 'Cannot change role of this staff member');
          }
        } else {
          // Employees cannot change roles
          return ApiResponseHelper.forbidden(res, 'Insufficient permissions to change role');
        }
      }
    }
    if (req.body.department !== undefined) updateData.department = req.body.department;
    if (req.body.employeeId !== undefined) {
      // Employee ID cannot be changed once assigned
      return ApiResponseHelper.forbidden(res, 'Employee ID cannot be changed');
    }
    if (req.body.isActive !== undefined) {
      if (isSelf) {
        // Users cannot change their own active status
        return ApiResponseHelper.forbidden(res, 'Cannot change your own active status');
      }
      if (requesterRole === 'admin') {
        updateData.isActive = req.body.isActive;
      } else {
        return ApiResponseHelper.forbidden(res, 'Only admin can change active status');
      }
    }

    // Update staff member
    const updatedStaff = await staffModel.updateStaff(id, updateData);
    if (!updatedStaff) {
      return ApiResponseHelper.error(res, 'Failed to update staff member', 500);
    }

    // Log activity
    const userId = getUserIdFromRequest(req);
    const userName = await getUserNameFromRequest(req);
    await ActivityLogModel.createLog({
      type: 'profile_updated',
      message: `Staff member ${updatedStaff.email} profile updated`,
      userId,
      userName,
      metadata: {
        staffId: updatedStaff.id,
        email: updatedStaff.email,
        updatedFields: Object.keys(updateData)
      }
    });

    // Remove password from response
    const { password, ...staffWithoutPassword } = updatedStaff;

    return ApiResponseHelper.success(res, staffWithoutPassword, 'Staff member updated successfully');
  } catch (error: any) {
    logger.error('Error updating staff member', error, { staffId: req.params.id, userId: req.user?.id });
    return ApiResponseHelper.error(res, error.message || 'Failed to update staff member', 500, error);
  }
});

export default router;
