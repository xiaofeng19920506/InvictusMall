import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { StaffModel, CreateStaffRequest } from '../models/StaffModel';
import { StaffInvitationModel, CreateInvitationRequest } from '../models/StaffInvitationModel';
import { ActivityLogModel } from '../models/ActivityLogModel';
import { getUserNameFromRequest, getUserIdFromRequest } from '../utils/activityLogHelper';
import { emailService } from '../services/emailService';
import {
  authenticateStaffToken,
  AuthenticatedRequest,
} from "../middleware/auth";

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
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Get staff member
    const staff = await staffModel.getStaffByEmail(email);
    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await staffModel.verifyPassword(staff, password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
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

    console.log('JWT Payload:', tokenPayload);
    console.log('JWT_SECRET length:', JWT_SECRET?.length || 0);

    // Calculate expiration time explicitly (7 days from now)
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (7 * 24 * 60 * 60); // 7 days in seconds

    console.log('JWT signing - now:', now, 'exp:', exp, 'exp date:', new Date(exp * 1000));

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
    console.log('JWT decoded:', { iat: decoded.iat, exp: decoded.exp, expDate: new Date(decoded.exp * 1000) });

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
      console.error('Failed to log staff login:', logError);
      // Continue with login even if logging fails
    }

    // Set HTTP-only cookie with JWT token
    res.cookie('staff_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    // Return staff data without password (no token in response body)
    const { password: _, ...staffWithoutPassword } = staff;

    return res.json({
      success: true,
      message: 'Login successful',
      user: staffWithoutPassword
    });
  } catch (error) {
    console.error('Staff login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'staff') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Get staff member
    const staff = await staffModel.getStaffById(decoded.staffId);
    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    return res.json({
      success: true,
      user: staff
    });
  } catch (error) {
    console.error('Get staff member error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
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
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create staff members'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const staffData: CreateStaffRequest = req.body;

    // Check if email already exists
    const emailExists = await staffModel.emailExists(staffData.email);
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if employee ID already exists (if provided)
    if (staffData.employeeId) {
      const employeeIdExists = await staffModel.employeeIdExists(staffData.employeeId);
      if (employeeIdExists) {
        return res.status(409).json({
          success: false,
          message: 'Employee ID already exists'
        });
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

    return res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      user: {
        id: staff.id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role,
        employeeId: staff.employeeId
      }
    });
  } catch (error) {
    console.error('Staff registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
  body('role').isIn(['admin', 'owner', 'manager', 'employee'])
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user has permission to create staff (admin or owner only)
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create staff members'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { email, firstName, lastName, role, department, employeeId, storeId } = req.body;
    const requesterRole = req.user.role;
    const requesterId = req.user.id;

    // Role-based restrictions
    if (requesterRole === 'admin') {
      // Admin can only invite owner role
      if (role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Admin can only invite staff with owner role'
        });
      }
      // Admin must specify a store for owner
      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: 'Store ID is required when inviting owner'
        });
      }
    } else if (requesterRole === 'owner') {
      // Owner can only invite manager and employee roles
      if (role !== 'manager' && role !== 'employee') {
        return res.status(403).json({
          success: false,
          message: 'Owner can only invite staff with manager or employee role'
        });
      }
      // Get requester's store ID
      const requesterStaff = await staffModel.getStaffById(requesterId);
      const requesterStoreId = (requesterStaff as any)?.storeId;
      if (!requesterStoreId) {
        return res.status(400).json({
          success: false,
          message: 'Owner must be associated with a store to invite staff'
        });
      }
      // Use requester's store ID (ignore provided storeId for security)
      const finalStoreId = requesterStoreId;
    }

    // Check if email already exists in staff table
    const emailExists = await staffModel.emailExists(email);
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if employee ID already exists (if provided)
    if (employeeId) {
      const employeeIdExists = await staffModel.employeeIdExists(employeeId);
      if (employeeIdExists) {
        return res.status(409).json({
          success: false,
          message: 'Employee ID already exists'
        });
      }
    }

    // Get final store ID based on requester role
    let finalStoreId = storeId;
    if (requesterRole === 'owner') {
      const requesterStaff = await staffModel.getStaffById(requesterId);
      finalStoreId = (requesterStaff as any)?.storeId;
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

    return res.status(201).json({
      success: true,
      message: 'Staff invitation sent successfully',
      emailSent,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Staff invitation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { token, password, phoneNumber } = req.body;

    // Get invitation by token
    const invitation = await invitationModel.getInvitationByToken(token);
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation token'
      });
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
    res.cookie('staff_auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
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
    console.error('Setup password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const requesterRole = req.user.role;
    const requesterId = req.user.id;
    let staffMembers: any[] = [];

    // Get requester's staff info to check store_id
    const requesterStaff = await staffModel.getStaffById(requesterId);
    const requesterStoreId = (requesterStaff as any)?.storeId || null;

    // Role-based data filtering
    if (requesterRole === 'admin') {
      // Admin can see all staff members
      staffMembers = await staffModel.getAllStaff();
    } else if (requesterRole === 'owner') {
      // Store owner can see all staff in the same store
      if (requesterStoreId) {
        const allStaff = await staffModel.getAllStaff();
        staffMembers = allStaff.filter(
          (staff: any) => staff.storeId === requesterStoreId
        );
      } else {
        // If owner has no store_id, return empty array
        staffMembers = [];
      }
    } else if (requesterRole === 'manager') {
      // Manager can see all staff including owner (in same store)
      if (requesterStoreId) {
        const allStaff = await staffModel.getAllStaff();
        staffMembers = allStaff.filter(
          (staff: any) => staff.storeId === requesterStoreId
        );
      } else {
        // If manager has no store_id, return empty array
        staffMembers = [];
      }
    } else if (requesterRole === 'employee') {
      // Employee can only see themselves
      const staff = await staffModel.getStaffById(requesterId);
      staffMembers = staff ? [staff] : [];
    } else {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    // Remove password from response and add edit permission info
    const staffWithPermissions = staffMembers.map(({ password, ...staff }) => {
      let canEdit = false;
      
      // Edit permission logic
      if (requesterRole === 'admin') {
        // Admin can edit everyone except themselves
        canEdit = staff.id !== requesterId;
      } else if (requesterRole === 'owner') {
        // Owner can edit staff in their store (but not themselves)
        canEdit = staff.id !== requesterId && 
                  (staff as any).storeId === requesterStoreId &&
                  staff.role !== 'owner'; // Cannot edit other owners
      } else if (requesterRole === 'manager') {
        // Manager can edit employees and managers (but not owner or themselves)
        canEdit = staff.id !== requesterId && 
                  staff.role !== 'owner' && 
                  staff.role !== 'admin' &&
                  (staff.role === 'employee' || staff.role === 'manager');
      }
      // Employee cannot edit anyone

      return {
        ...staff,
        canEdit
      };
    });

    return res.json({
      success: true,
      data: staffWithPermissions || []
    });
  } catch (error) {
    console.error('Error fetching all staff:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch staff members',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] // Return empty array on error
    });
  }
});

export default router;
