import { Router, Request, Response } from "express";
import {
  UserModel,
  CreateUserRequest,
  LoginRequest,
  SetupPasswordRequest,
} from "../models/UserModel";
import { VerificationTokenModel } from "../models/VerificationTokenModel";
import {
  validateLogin,
  validateSignup,
  validateSetupPassword,
  handleValidationErrors,
} from "../middleware/validation";
import jwt from "jsonwebtoken";
import { ActivityLogModel, ActivityLog } from "../models/ActivityLogModel";
import { getUserNameFromRequest, getUserIdFromRequest } from "../utils/activityLogHelper";
import {
  authenticateUserToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { emailService } from "../services/emailService";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";
import { validateImageFile } from "../utils/imageValidation";

const router = Router();
const userModel = new UserModel();
const verificationTokenModel = new VerificationTokenModel();

// JWT Secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

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
 *                 enum: [customer]
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
router.post(
  "/signup",
  validateSignup,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, phoneNumber }: CreateUserRequest =
        req.body;

      // Check if email already exists
      let emailExists;
      try {
        emailExists = await userModel.emailExists(email);
      } catch (dbError: any) {
        // Handle database connection errors
        if (
          dbError.code === "ER_ACCESS_DENIED_ERROR" ||
          dbError.code === "ECONNREFUSED" ||
          dbError.code === "ENOTFOUND" ||
          dbError.code === "ETIMEDOUT"
        ) {
          logger.error("Database connection error during signup", dbError, { email });
          return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        }
        throw dbError;
      }

      if (emailExists) {
        return ApiResponseHelper.validationError(res, "Email already registered");
      }

      // Create unverified user
      let user;
      try {
        user = await userModel.createUser({
          email,
          firstName,
          lastName,
          phoneNumber,
        });
      } catch (dbError: any) {
        // Handle database connection errors
        if (
          dbError.code === "ER_ACCESS_DENIED_ERROR" ||
          dbError.code === "ECONNREFUSED" ||
          dbError.code === "ENOTFOUND" ||
          dbError.code === "ETIMEDOUT"
        ) {
          logger.error("Database connection error during user creation", dbError, { email });
          return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        }
        throw dbError;
      }

      // Generate verification token
      const verificationToken = emailService.generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store verification token
      await verificationTokenModel.createToken({
        userId: user.id,
        token: verificationToken,
        type: "email_verification",
        expiresAt,
      });

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        email,
        verificationToken
      );

      // Log the activity
      try {
        const userName = `${user.firstName} ${user.lastName}`;
        await ActivityLogModel.createLog({
          type: "user_registered",
          message: `New user "${userName}" registered with email ${user.email}. Verification email sent.`,
          userId: user.id,
          userName,
          metadata: {
            userId: user.id,
            email: user.email,
            role: user.role,
            emailSent,
          },
        });
      } catch (logError) {
        logger.warn("Failed to log user registration", { error: logError, userId: user.id });
        // Continue with registration even if logging fails
      }

      // Return success message (no token until email is verified)
      return ApiResponseHelper.success(
        res,
        { emailSent },
        "Registration successful! Please check your email to verify your account and complete setup.",
        201
      );
    } catch (error) {
      logger.error("Signup error", error, { email: req.body.email });
      return ApiResponseHelper.error(res, "Failed to register user", 500, error);
    }
  }
);

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
router.post(
  "/login",
  validateLogin,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { email, password }: LoginRequest = req.body;

      // Get user by email
      let user;
      try {
        user = await userModel.getUserByEmail(email);
      } catch (dbError: any) {
        // Handle database connection errors
        const isConnectionError = 
          dbError.code === "ER_ACCESS_DENIED_ERROR" ||
          dbError.code === "ECONNREFUSED" ||
          dbError.code === "ENOTFOUND" ||
          dbError.code === "ETIMEDOUT" ||
          dbError.code === "PROTOCOL_CONNECTION_LOST" ||
          dbError.code === "ER_BAD_DB_ERROR" ||
          dbError.code === "ECONNRESET" ||
          dbError.fatal === true ||
          (dbError.errno && [2002, 2003, 1045, 1049, 2013].includes(dbError.errno)) ||
          dbError.message?.includes("connect ECONNREFUSED") ||
          dbError.message?.includes("getaddrinfo ENOTFOUND") ||
          dbError.message?.includes("Connection lost");

        if (isConnectionError) {
          logger.error("Database connection error during login", dbError, { email: req.body.email });
          return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        }
        // Re-throw other database errors
        logger.error("Unexpected database error during login", dbError, { email: req.body.email });
        throw dbError;
      }

      if (!user) {
        return ApiResponseHelper.unauthorized(res, "Invalid email or password");
      }

      // Verify password
      if (!user.password) {
        return ApiResponseHelper.unauthorized(res, "Invalid email or password");
      }

      const isPasswordValid = await userModel.verifyPassword(
        password,
        user.password!
      );
      if (!isPasswordValid) {
        return ApiResponseHelper.unauthorized(res, "Invalid email or password");
      }

      // Update last login (don't fail login if this fails)
      try {
        await userModel.updateLastLogin(user.id);
      } catch (updateError) {
        logger.warn("Failed to update last login", { error: updateError, userId: user.id });
        // Continue with login even if update fails
      }

      // Generate JWT token (expires in 7 days to match cookie maxAge)
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      // Log the activity (don't fail login if this fails)
      try {
        const userName = `${user.firstName} ${user.lastName}`;
        await ActivityLogModel.createLog({
          type: "user_login",
          message: `User "${userName}" logged in`,
          userId: user.id,
          userName,
          metadata: {
            userId: user.id,
            email: user.email,
            role: user.role,
          },
        });
      } catch (logError) {
        logger.warn("Failed to log user login", { error: logError, userId: user.id });
        // Continue with login even if logging fails
      }

      // Set HTTP-only cookie with JWT token
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      // Return user data without password (no token in response body)
      const { password: _, ...userWithoutPassword } = user;

      return ApiResponseHelper.success(res, userWithoutPassword, "Login successful");
    } catch (error) {
      logger.error("Login error", error, { email: req.body.email });
      return ApiResponseHelper.error(res, "Failed to login. Please try again later.", 500, error);
    }
  }
);

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
router.post(
  "/setup-password",
  validateSetupPassword,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { token, password }: SetupPasswordRequest = req.body;

      // Find verification token
      let verificationToken;
      try {
        verificationToken = await verificationTokenModel.getTokenByTokenValue(
          token
        );
      } catch (dbError: any) {
        // Handle database connection errors
        if (
          dbError.code === "ER_ACCESS_DENIED_ERROR" ||
          dbError.code === "ECONNREFUSED" ||
          dbError.code === "ENOTFOUND" ||
          dbError.code === "ETIMEDOUT"
        ) {
          logger.error("Database connection error during password setup", dbError, { token: req.body.token });
          return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        }
        throw dbError;
      }

      if (!verificationToken) {
        return ApiResponseHelper.unauthorized(res, "Invalid verification token");
      }

      // Check if token is expired
      if (verificationToken.expiresAt < new Date()) {
        return ApiResponseHelper.unauthorized(res, "Verification token has expired");
      }

      // Check if token is already used
      if (verificationToken.used) {
        return ApiResponseHelper.unauthorized(res, "Verification token has already been used");
      }

      // Check if token is for email verification
      if (verificationToken.type !== "email_verification") {
        return ApiResponseHelper.validationError(res, "Invalid token type");
      }

      // Get user
      let user;
      try {
        user = await userModel.getUserById(verificationToken.userId);
      } catch (dbError: any) {
        // Handle database connection errors
        if (
          dbError.code === "ER_ACCESS_DENIED_ERROR" ||
          dbError.code === "ECONNREFUSED" ||
          dbError.code === "ENOTFOUND" ||
          dbError.code === "ETIMEDOUT"
        ) {
          logger.error("Database connection error during password setup", dbError, { token: req.body.token });
          return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        }
        throw dbError;
      }

      // Setup password and activate user
      try {
        await userModel.setupPassword(user.id, password);
      } catch (dbError: any) {
        // Handle database connection errors
        if (
          dbError.code === "ER_ACCESS_DENIED_ERROR" ||
          dbError.code === "ECONNREFUSED" ||
          dbError.code === "ENOTFOUND" ||
          dbError.code === "ETIMEDOUT"
        ) {
          logger.error("Database connection error during password setup", dbError, { token: req.body.token });
          return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        }
        throw dbError;
      }

      // Mark token as used
      await verificationTokenModel.markTokenAsUsed(verificationToken.id);

      // Generate JWT token
      const jwtToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      // Update last login
      await userModel.updateLastLogin(user.id);

      // Get updated user data
      const updatedUser = await userModel.getUserById(user.id);

      // Log the activity
      try {
        const userName = `${updatedUser.firstName} ${updatedUser.lastName}`;
        await ActivityLogModel.createLog({
          type: "user_login",
          message: `User "${userName}" completed email verification and setup password`,
          userId: updatedUser.id,
          userName,
          metadata: {
            userId: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role,
          },
        });
      } catch (logError) {
        logger.warn("Failed to log password setup", { error: logError, userId: updatedUser.id });
        // Continue even if logging fails
      }

      // Set HTTP-only cookie with JWT token
      res.cookie("auth_token", jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      // Return user data without password (no token in response body)
      const { password: _, ...userWithoutPassword } = updatedUser;

      return ApiResponseHelper.success(
        res,
        userWithoutPassword,
        "Password setup successful! Your account is now active."
      );
    } catch (error) {
      logger.error("Password setup error", error, { token: req.body.token });
      return ApiResponseHelper.error(res, "Failed to setup password", 500, error);
    }
  }
);

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
router.get(
  "/me",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // User is already authenticated and available in req.user
      let user;
      try {
        user = await userModel.getActiveUserById(req.user!.id);
      } catch (dbError: any) {
        // Handle database connection errors
        if (
          dbError.code === "ER_ACCESS_DENIED_ERROR" ||
          dbError.code === "ECONNREFUSED" ||
          dbError.code === "ENOTFOUND" ||
          dbError.code === "ETIMEDOUT"
        ) {
          logger.error("Database connection error during /me", dbError, { userId: req.user?.id });
          return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        }
        throw dbError;
      }

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        success: true,
        user: userWithoutPassword,
      });
    } catch (error) {
      logger.error("Get profile error", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to get user profile", 500, error);
    }
  }
);

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
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return ApiResponseHelper.validationError(res, "Email is required");
    }

    // Check if user exists
    let user;
    try {
      user = await userModel.getUserByEmail(email);
    } catch (dbError: any) {
      // Handle database connection errors
      if (
        dbError.code === "ER_ACCESS_DENIED_ERROR" ||
        dbError.code === "ECONNREFUSED" ||
        dbError.code === "ENOTFOUND" ||
        dbError.code === "ETIMEDOUT"
      ) {
        logger.error("Database connection error during forgot password", dbError, { email: req.body.email });
        return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
      }
      throw dbError;
    }
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = emailService.generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await verificationTokenModel.createToken({
      userId: user.id,
      token: resetToken,
      type: "password_reset",
      expiresAt,
    });

    // Send reset email
    const emailSent = await emailService.sendPasswordResetEmail(
      email,
      resetToken
    );

    if (!emailSent) {
      return ApiResponseHelper.error(res, "Failed to send password reset email", 500);
    }

    // Log the activity
    try {
      const userName = `${user.firstName} ${user.lastName}`;
      await ActivityLogModel.createLog({
        type: "password_reset_requested",
        message: `Password reset requested for user "${userName}"`,
        userId: user.id,
        userName,
        metadata: {
          userId: user.id,
          email: user.email,
          emailSent,
        },
      });
    } catch (logError) {
      logger.warn("Failed to log password reset request", { error: logError, email });
    }

    return ApiResponseHelper.success(
      res,
      null,
      "If an account with that email exists, a password reset link has been sent"
    );
  } catch (error) {
    logger.error("Forgot password error", error, { email: req.body.email });
    return ApiResponseHelper.error(res, "Failed to process password reset request", 500, error);
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
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return ApiResponseHelper.validationError(res, "Token and password are required");
    }

    if (password.length < 6) {
      return ApiResponseHelper.validationError(res, "Password must be at least 6 characters long");
    }

    // Find reset token
    let resetToken;
    try {
      resetToken = await verificationTokenModel.getTokenByTokenValue(token);
    } catch (dbError: any) {
      // Handle database connection errors
      if (
        dbError.code === "ER_ACCESS_DENIED_ERROR" ||
        dbError.code === "ECONNREFUSED" ||
        dbError.code === "ENOTFOUND" ||
        dbError.code === "ETIMEDOUT"
      ) {
        logger.error("Database connection error during password reset", dbError, { token });
        return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
      }
      throw dbError;
    }

    if (!resetToken) {
      return ApiResponseHelper.unauthorized(res, "Invalid reset token");
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return ApiResponseHelper.unauthorized(res, "Reset token has expired");
    }

    // Check if token is already used
    if (resetToken.used) {
      return ApiResponseHelper.unauthorized(res, "Reset token has already been used");
    }

    // Check if token is for password reset
    if (resetToken.type !== "password_reset") {
      return ApiResponseHelper.validationError(res, "Invalid token type");
    }

    // Get user
    let user;
    try {
      user = await userModel.getActiveUserById(resetToken.userId);
    } catch (dbError: any) {
      // Handle database connection errors
      if (
        dbError.code === "ER_ACCESS_DENIED_ERROR" ||
        dbError.code === "ECONNREFUSED" ||
        dbError.code === "ENOTFOUND" ||
        dbError.code === "ETIMEDOUT"
      ) {
        logger.error("Database connection error during password reset", dbError, { token });
        return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
      }
      throw dbError;
    }

    // Update password
    try {
      await userModel.updatePassword(user.id, password);
    } catch (dbError: any) {
      // Handle database connection errors
      if (
        dbError.code === "ER_ACCESS_DENIED_ERROR" ||
        dbError.code === "ECONNREFUSED" ||
        dbError.code === "ENOTFOUND" ||
        dbError.code === "ETIMEDOUT"
      ) {
        logger.error("Database connection error during password reset", dbError, { token });
        return ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
      }
      throw dbError;
    }

    // Mark token as used
    await verificationTokenModel.markTokenAsUsed(resetToken.id);

    // Log the activity
    try {
      const userName = `${user.firstName} ${user.lastName}`;
      await ActivityLogModel.createLog({
        type: "password_reset_completed",
        message: `Password reset completed for user "${userName}"`,
        userId: user.id,
        userName,
        metadata: {
          userId: user.id,
          email: user.email,
        },
      });
    } catch (logError) {
      logger.warn("Failed to log password reset completion", { error: logError, userId: user.id });
    }

    return ApiResponseHelper.success(res, null, "Password reset successful");
  } catch (error) {
    logger.error("Reset password error", error, { token: req.body.token });
    return ApiResponseHelper.error(res, "Failed to reset password", 500, error);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
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
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  "/profile",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { firstName, lastName, phoneNumber } = req.body;

      const updateData: {
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
      } = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

      const updatedUser = await userModel.updateProfile(userId, updateData);

      // Log the activity
      try {
        const userName = `${updatedUser.firstName} ${updatedUser.lastName}`;
        await ActivityLogModel.createLog({
          type: "profile_updated" as ActivityLog["type"],
          message: `User "${userName}" updated their profile`,
          userId: updatedUser.id,
          userName,
          metadata: {
            userId: updatedUser.id,
            email: updatedUser.email,
            updates: updateData,
          },
        });
      } catch (logError) {
        logger.warn("Failed to log profile update", { error: logError, userId: updatedUser.id });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;

      return ApiResponseHelper.success(res, userWithoutPassword, "Profile updated successfully");
    } catch (error) {
      logger.error("Update profile error", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to update profile", 500, error);
    }
  }
);

// Configure multer for file uploads (memory storage to forward to external API)
const storage = multer.memoryStorage();

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

/**
 * @swagger
 * /api/auth/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/avatar",
  authenticateUserToken,
  upload.single("avatar"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return ApiResponseHelper.validationError(res, "No file uploaded");
      }

      // Perform binary validation on the uploaded file
      const validation = validateImageFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.size
      );

      if (!validation.valid) {
        return ApiResponseHelper.validationError(res, validation.error || "Invalid image file");
      }

      const userId = req.user!.id;
      
      // Get current user to check for existing avatar
      const currentUser = await userModel.getUserById(userId);
      
      // Delete previous avatar if it exists
      if (currentUser.avatar) {
        try {
          // Extract the image path from the avatar URL
          // Avatar URL format: /images/... or full URL
          let imagePath = currentUser.avatar;
          
          // If it's a full URL, extract just the path
          try {
            const url = new URL(currentUser.avatar);
            imagePath = url.pathname;
          } catch {
            // If it's not a full URL, assume it's already a path
            imagePath = currentUser.avatar.startsWith('/') ? currentUser.avatar : `/${currentUser.avatar}`;
          }
          
          // Only delete if it's an /images/ path (stored in MinIO)
          if (imagePath.startsWith('/images/')) {
            const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";
            const baseUrl = externalUploadUrl.replace("/api/files/upload", "");
            const deleteUrl = `${baseUrl}/api/files/delete?fileName=${encodeURIComponent(imagePath)}`;
            
            logger.debug(`Attempting to delete previous avatar: ${imagePath}`, { userId: currentUser.id });
            
            // Call delete API on MinIO storage service
            const deleteResponse = await fetch(deleteUrl, {
              method: "DELETE",
            });
            
            if (deleteResponse.ok) {
              logger.debug(`Successfully deleted previous avatar: ${imagePath}`, { userId: currentUser.id });
            } else {
              const errorText = await deleteResponse.text();
              logger.warn("Failed to delete previous avatar (continuing with new upload)", {
                path: imagePath,
                status: deleteResponse.status,
                error: errorText,
                userId: currentUser.id,
              });
              // Don't fail the upload if deletion fails - just log it
            }
          } else {
            logger.debug(`Skipping deletion - avatar path is not in MinIO storage: ${imagePath}`, { userId: currentUser.id });
          }
        } catch (deleteError: any) {
          // Log error but don't fail the upload
          logger.warn("Error deleting previous avatar (continuing with new upload)", {
            error: deleteError,
            avatar: currentUser.avatar,
            userId: currentUser.id,
          });
        }
      }
      
      // Forward the file to the external MinIO storage API
      const externalUploadUrl = process.env.FILE_UPLOAD_API_URL || "";
      
      let uploadResult;
      let avatarUrl;
      
      try {
        // Create FormData to forward the file
        const formData = new FormData();
        formData.append("file", req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        });

        logger.debug(`Attempting to upload file to: ${externalUploadUrl}`, {
          fileName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          userId,
        });

        // Forward the file to external API
        const uploadResponse = await fetch(externalUploadUrl, {
          method: "POST",
          body: formData,
          headers: formData.getHeaders(),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          logger.error("External upload API error", {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
            userId,
          });
          return ApiResponseHelper.error(
            res,
            "Failed to upload file to storage",
            uploadResponse.status || 500,
            errorText || `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`
          );
        }

        // Parse the response to get the image URL
        uploadResult = await uploadResponse.json();
        logger.debug("Upload response received", { uploadResult, userId });
        
        // Extract the image URL from the response
        // Response format: { "data": "/images/...", "status": 200 }
        avatarUrl = uploadResult.data;
        
        if (!avatarUrl) {
          logger.error("Upload response missing data field", { uploadResult, userId });
          return ApiResponseHelper.error(res, "Failed to get image URL from upload service", 500);
        }
      } catch (fetchError: any) {
        logger.error("Error connecting to external upload API", fetchError, {
          url: externalUploadUrl,
          userId,
        });
        
        // Provide more specific error messages
        let errorMessage = "Failed to connect to file upload service";
        if (fetchError.code === "ECONNREFUSED") {
          errorMessage = `Connection refused. The file upload service at ${externalUploadUrl} may be down or unreachable. Please check if the service is running.`;
        } else if (fetchError.code === "ETIMEDOUT") {
          errorMessage = `Connection timeout. The file upload service at ${externalUploadUrl} did not respond in time.`;
        } else if (fetchError.code === "ENOTFOUND") {
          errorMessage = `Host not found. Cannot resolve the address for ${externalUploadUrl}.`;
        }
        
        return ApiResponseHelper.error(res, errorMessage, 503, fetchError);
      }

      // Save the image URL to the database
      const updatedUser = await userModel.updateAvatar(userId, avatarUrl);

      // Log the activity
      try {
        const userName = `${updatedUser.firstName} ${updatedUser.lastName}`;
        await ActivityLogModel.createLog({
          type: "avatar_uploaded" as ActivityLog["type"],
          message: `User "${userName}" uploaded a new avatar`,
          userId: updatedUser.id,
          userName,
          metadata: {
            userId: updatedUser.id,
            email: updatedUser.email,
            avatarUrl,
          },
        });
      } catch (logError) {
        logger.warn("Failed to log avatar upload", { error: logError, userId: updatedUser.id });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;

      return ApiResponseHelper.success(res, userWithoutPassword, "Avatar uploaded successfully");
    } catch (error) {
      logger.error("Upload avatar error", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to upload avatar", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password for authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: "currentpassword123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: "Password changed successfully"
 *       400:
 *         description: Validation error or invalid password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized or incorrect current password
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
router.post(
  "/change-password",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return ApiResponseHelper.validationError(
          res,
          "Current password and new password are required"
        );
      }

      if (newPassword.length < 6) {
        return ApiResponseHelper.validationError(res, "New password must be at least 6 characters long");
      }

      if (currentPassword === newPassword) {
        return ApiResponseHelper.validationError(res, "New password must be different from current password");
      }

      // Get user with password
      const user = await userModel.getUserById(userId);

      if (!user.password) {
        return ApiResponseHelper.validationError(
          res,
          "Password has not been set yet. Please use reset password flow."
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await userModel.verifyPassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return ApiResponseHelper.unauthorized(res, "Current password is incorrect");
      }

      // Update password
      await userModel.updatePassword(userId, newPassword);

      // Log the activity
      try {
        const userName = `${user.firstName} ${user.lastName}`;
        await ActivityLogModel.createLog({
          type: "password_changed",
          message: `User "${userName}" changed their password`,
          userId: user.id,
          userName,
          metadata: {
            userId: user.id,
            email: user.email,
          },
        });
      } catch (logError) {
        logger.warn("Failed to log password change", { error: logError, userId: user.id });
      }

      return ApiResponseHelper.success(res, null, "Password changed successfully");
    } catch (error) {
      logger.error("Change password error", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to change password", 500, error);
    }
  }
);

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const staffToken = req.cookies.staff_auth_token;
    const userToken = req.cookies.auth_token;

    const token = staffToken || userToken;

    if (!token) {
      return ApiResponseHelper.unauthorized(res, "Access token required");
    }

    let decoded: jwt.JwtPayload & {
      userId?: string;
      staffId?: string;
      email?: string;
      role?: string;
      type?: string;
    };

    try {
      decoded = jwt.verify(token, JWT_SECRET as string, {
        ignoreExpiration: true,
      }) as typeof decoded;
    } catch (error) {
      logger.error("Token refresh verification failed", error);
      return ApiResponseHelper.unauthorized(res, "Invalid token");
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const tokenIsExpired = decoded.exp ? decoded.exp <= nowInSeconds : false;

    if (staffToken || decoded.type === "staff") {
      const { StaffModel } = await import("../models/StaffModel");
      const staffModel = new StaffModel();
      const staffId = decoded.staffId;

      if (!staffId) {
        return ApiResponseHelper.unauthorized(res, "Invalid staff token");
      }

      const staff = await staffModel.getStaffById(staffId);

      if (!staff || !staff.isActive) {
        return ApiResponseHelper.unauthorized(res, "Invalid or expired token");
      }

      if (!tokenIsExpired) {
        return ApiResponseHelper.success(res, null, "Token still valid");
      }

      const refreshedToken = jwt.sign(
        {
          staffId: staff.id,
          email: staff.email,
          role: staff.role,
          type: "staff",
        },
        JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      // For cross-origin requests in development, use 'none' with secure: false
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("staff_auth_token", refreshedToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "strict" : "none", // 'none' allows cross-origin requests
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      const { password: _, ...staffWithoutPassword } = staff;

      return ApiResponseHelper.success(res, staffWithoutPassword, "Token refreshed successfully");
    }

    const userId = decoded.userId;

    if (!userId) {
      return ApiResponseHelper.unauthorized(res, "Invalid token");
    }

    const user = await userModel.getActiveUserById(userId);

    if (!user) {
      return ApiResponseHelper.unauthorized(res, "Invalid or expired token");
    }

    if (!tokenIsExpired) {
      const { password: _, ...userWithoutPassword } = user;
      return ApiResponseHelper.success(res, userWithoutPassword, "Token still valid");
    }

    const refreshedToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.cookie("auth_token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { password: _, ...userWithoutPassword } = user;

    return ApiResponseHelper.success(res, userWithoutPassword, "Token refreshed successfully");
  } catch (error) {
    logger.error("Token refresh error", error);
    return ApiResponseHelper.unauthorized(res, "Failed to refresh token");
  }
});

/**
 * @swagger
 * /api/auth/check-account:
 *   post:
 *     summary: Check if email or phone number is associated with an existing account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Account check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exists:
 *                   type: boolean
 *                 emailExists:
 *                   type: boolean
 *                 phoneExists:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/check-account",
  async (req: Request, res: Response) => {
    try {
      const { email, phoneNumber } = req.body;

      if (!email && !phoneNumber) {
        return ApiResponseHelper.validationError(res, "Email or phone number is required");
      }

      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return ApiResponseHelper.validationError(res, "Invalid email format");
        }
      }

      const result = await userModel.checkAccountExists(
        email,
        phoneNumber
      );

      return ApiResponseHelper.success(res, result);
    } catch (error) {
      logger.error("Check account error", error, { email: req.body.email, phoneNumber: req.body.phoneNumber });
      return ApiResponseHelper.error(res, "Failed to check account", 500, error);
    }
  }
);

export default router;
