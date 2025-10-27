import { Router, Request, Response } from 'express';
import { UserModel, CreateUserRequest, LoginRequest, SetupPasswordRequest } from '../models/UserModel';
import { VerificationTokenModel } from '../models/VerificationTokenModel';
import { validateLogin, validateSignup, validateSetupPassword, handleValidationErrors } from '../middleware/validation';
import jwt from 'jsonwebtoken';
import { ActivityLogModel } from '../models/ActivityLogModel';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';

const router = Router();
const userModel = new UserModel();
const verificationTokenModel = new VerificationTokenModel();

// JWT Secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               role:
 *                 type: string
 *                 enum: [customer, admin, store_owner]
 *                 example: "customer"
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                   example: "User registered successfully"
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
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/signup', validateSignup, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, phoneNumber }: CreateUserRequest = req.body;

    // Check if email already exists
    const emailExists = await userModel.emailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create unverified user
    const user = await userModel.createUser({
      email,
      firstName,
      lastName,
      phoneNumber
    });

    // Generate verification token
    const verificationToken = emailService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await verificationTokenModel.createToken({
      userId: user.id,
      token: verificationToken,
      type: 'email_verification',
      expiresAt
    });

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(email, verificationToken);
    
    if (!emailSent) {
      console.warn('Failed to send verification email, but user was created');
    }

    // Log the activity
    try {
      await ActivityLogModel.createLog({
        type: 'user_registered',
        message: `New user "${user.firstName} ${user.lastName}" registered with email ${user.email}. Verification email sent.`,
        metadata: {
          userId: user.id,
          email: user.email,
          role: user.role,
          emailSent
        }
      });
    } catch (logError) {
      console.error('Failed to log user registration:', logError);
      // Continue with registration even if logging fails
    }

    // Return success message (no token until email is verified)
    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account and complete setup.',
      emailSent
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
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
 *                 example: "user@example.com"
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
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validateLogin, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Get user by email
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await userModel.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await userModel.updateLastLogin(user.id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Log the activity
    try {
      await ActivityLogModel.createLog({
        type: 'user_login',
        message: `User "${user.firstName} ${user.lastName}" logged in`,
        metadata: {
          userId: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (logError) {
      console.error('Failed to log user login:', logError);
      // Continue with login even if logging fails
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/auth/setup-password:
 *   post:
 *     summary: Setup password after email verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: "abc123def456..."
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Password setup successful
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
 *                   example: "Password setup successful"
 *                 user:
 *                   type: object
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid token or validation error
 *       401:
 *         description: Token expired or invalid
 *       500:
 *         description: Internal server error
 */
router.post('/setup-password', validateSetupPassword, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { token, password }: SetupPasswordRequest = req.body;

    // Find verification token
    const verificationToken = await verificationTokenModel.getTokenByTokenValue(token);
    
    if (!verificationToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

    // Check if token is already used
    if (verificationToken.used) {
      return res.status(401).json({
        success: false,
        message: 'Verification token has already been used'
      });
    }

    // Check if token is for email verification
    if (verificationToken.type !== 'email_verification') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Get user
    const user = await userModel.getUserById(verificationToken.userId);

    // Setup password and activate user
    await userModel.setupPassword(user.id, password);

    // Mark token as used
    await verificationTokenModel.markTokenAsUsed(verificationToken.id);

    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Update last login
    await userModel.updateLastLogin(user.id);

    // Get updated user data
    const updatedUser = await userModel.getUserById(user.id);

    // Log the activity
    try {
      await ActivityLogModel.createLog({
        type: 'user_login',
        message: `User "${updatedUser.firstName} ${updatedUser.lastName}" completed email verification and setup password`,
        metadata: {
          userId: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role
        }
      });
    } catch (logError) {
      console.error('Failed to log password setup:', logError);
      // Continue even if logging fails
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      success: true,
      message: 'Password setup successful! Your account is now active.',
      user: userWithoutPassword,
      token: jwtToken
    });
  } catch (error) {
    console.error('Password setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to setup password',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     lastLoginAt:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // User is already authenticated and available in req.user
    const user = await userModel.getUserById(req.user!.id);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent
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
 *                   example: "Password reset email sent"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = emailService.generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await verificationTokenModel.createToken({
      userId: user.id,
      token: resetToken,
      type: 'password_reset',
      expiresAt
    });

    // Send reset email
    const emailSent = await emailService.sendPasswordResetEmail(email, resetToken);
    
    if (!emailSent) {
      console.warn('Failed to send password reset email');
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }

    // Log the activity
    try {
      await ActivityLogModel.createLog({
        type: 'password_reset_requested',
        message: `Password reset requested for user "${user.firstName} ${user.lastName}"`,
        metadata: {
          userId: user.id,
          email: user.email,
          emailSent
        }
      });
    } catch (logError) {
      console.error('Failed to log password reset request:', logError);
    }

    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: "abc123def456..."
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: "Password reset successful"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find reset token
    const resetToken = await verificationTokenModel.getTokenByTokenValue(token);
    
    if (!resetToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    // Check if token is already used
    if (resetToken.used) {
      return res.status(401).json({
        success: false,
        message: 'Reset token has already been used'
      });
    }

    // Check if token is for password reset
    if (resetToken.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Get user
    const user = await userModel.getUserById(resetToken.userId);

    // Update password
    await userModel.updatePassword(user.id, password);

    // Mark token as used
    await verificationTokenModel.markTokenAsUsed(resetToken.id);

    // Log the activity
    try {
      await ActivityLogModel.createLog({
        type: 'password_reset_completed',
        message: `Password reset completed for user "${user.firstName} ${user.lastName}"`,
        metadata: {
          userId: user.id,
          email: user.email
        }
      });
    } catch (logError) {
      console.error('Failed to log password reset completion:', logError);
    }

    return res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
