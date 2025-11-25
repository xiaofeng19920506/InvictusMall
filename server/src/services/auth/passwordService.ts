import { Request, Response } from "express";
import { UserModel, SetupPasswordRequest } from "../../models/UserModel";
import { VerificationTokenModel } from "../../models/VerificationTokenModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { emailService } from "../emailService";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { isConnectionError } from "./authUtils";
import { generateAuthToken } from "./tokenService";

export async function handleSetupPassword(
  req: Request,
  res: Response,
  userModel: UserModel,
  verificationTokenModel: VerificationTokenModel
): Promise<void> {
  try {
    const { token, password }: SetupPasswordRequest = req.body;

    // Find verification token
    let verificationToken;
    try {
      verificationToken = await verificationTokenModel.getTokenByTokenValue(token);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during password setup", dbError, { token: req.body.token });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }

    if (!verificationToken) {
      ApiResponseHelper.unauthorized(res, "Invalid verification token");
      return;
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      ApiResponseHelper.unauthorized(res, "Verification token has expired");
      return;
    }

    // Check if token is already used
    if (verificationToken.used) {
      ApiResponseHelper.unauthorized(res, "Verification token has already been used");
      return;
    }

    // Check if token is for email verification
    if (verificationToken.type !== "email_verification") {
      ApiResponseHelper.validationError(res, "Invalid token type");
      return;
    }

    // Get user
    let user;
    try {
      user = await userModel.getUserById(verificationToken.userId);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during password setup", dbError, { token: req.body.token });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }

    // Setup password and activate user
    try {
      await userModel.setupPassword(user.id, password);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during password setup", dbError, { token: req.body.token });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }

    // Mark token as used
    await verificationTokenModel.markTokenAsUsed(verificationToken.id);

    // Generate JWT token
    const jwtToken = generateAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

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

    ApiResponseHelper.success(
      res,
      userWithoutPassword,
      "Password setup successful! Your account is now active."
    );
  } catch (error) {
    logger.error("Password setup error", error, { token: req.body.token });
    ApiResponseHelper.error(res, "Failed to setup password", 500, error);
  }
}

export async function handleForgotPassword(
  req: Request,
  res: Response,
  userModel: UserModel,
  verificationTokenModel: VerificationTokenModel
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      ApiResponseHelper.validationError(res, "Email is required");
      return;
    }

    // Check if user exists
    let user;
    try {
      user = await userModel.getUserByEmail(email);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during forgot password", dbError, { email: req.body.email });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }
    
    if (!user) {
      // For security, don't reveal if email exists or not
      res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent",
      });
      return;
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
    const emailSent = await emailService.sendPasswordResetEmail(email, resetToken);

    if (!emailSent) {
      ApiResponseHelper.error(res, "Failed to send password reset email", 500);
      return;
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

    ApiResponseHelper.success(
      res,
      null,
      "If an account with that email exists, a password reset link has been sent"
    );
  } catch (error) {
    logger.error("Forgot password error", error, { email: req.body.email });
    ApiResponseHelper.error(res, "Failed to process password reset request", 500, error);
  }
}

export async function handleResetPassword(
  req: Request,
  res: Response,
  userModel: UserModel,
  verificationTokenModel: VerificationTokenModel
): Promise<void> {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      ApiResponseHelper.validationError(res, "Token and password are required");
      return;
    }

    if (password.length < 6) {
      ApiResponseHelper.validationError(res, "Password must be at least 6 characters long");
      return;
    }

    // Find reset token
    let verificationToken;
    try {
      verificationToken = await verificationTokenModel.getTokenByTokenValue(token);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during password reset", dbError, { token: req.body.token });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }

    if (!verificationToken) {
      ApiResponseHelper.unauthorized(res, "Invalid reset token");
      return;
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      ApiResponseHelper.unauthorized(res, "Reset token has expired");
      return;
    }

    // Check if token is already used
    if (verificationToken.used) {
      ApiResponseHelper.unauthorized(res, "Reset token has already been used");
      return;
    }

    // Check if token is for password reset
    if (verificationToken.type !== "password_reset") {
      ApiResponseHelper.validationError(res, "Invalid token type");
      return;
    }

    // Get user
    let user;
    try {
      user = await userModel.getUserById(verificationToken.userId);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during password reset", dbError, { token: req.body.token });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }

    // Update password
    try {
      await userModel.updatePassword(user.id, password);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during password reset", dbError, { token: req.body.token });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }

    // Mark token as used
    await verificationTokenModel.markTokenAsUsed(verificationToken.id);

    // Log the activity
    try {
      const userName = `${user.firstName} ${user.lastName}`;
      await ActivityLogModel.createLog({
        type: "password_reset_completed",
        message: `User "${userName}" reset their password`,
        userId: user.id,
        userName,
        metadata: {
          userId: user.id,
          email: user.email,
        },
      });
    } catch (logError) {
      logger.warn("Failed to log password reset", { error: logError, userId: user.id });
    }

    ApiResponseHelper.success(res, null, "Password reset successful");
  } catch (error) {
    logger.error("Reset password error", error, { token: req.body.token });
    ApiResponseHelper.error(res, "Failed to reset password", 500, error);
  }
}

export async function handleChangePassword(
  req: Request,
  res: Response,
  userModel: UserModel,
  userId: string
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      ApiResponseHelper.validationError(res, "Current password and new password are required");
      return;
    }

    if (newPassword.length < 6) {
      ApiResponseHelper.validationError(res, "New password must be at least 6 characters long");
      return;
    }

    if (currentPassword === newPassword) {
      ApiResponseHelper.validationError(res, "New password must be different from current password");
      return;
    }

    // Get user with password
    const user = await userModel.getUserById(userId);

    if (!user.password) {
      ApiResponseHelper.validationError(
        res,
        "Password has not been set yet. Please use reset password flow."
      );
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await userModel.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      ApiResponseHelper.unauthorized(res, "Current password is incorrect");
      return;
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

    ApiResponseHelper.success(res, null, "Password changed successfully");
  } catch (error) {
    logger.error("Change password error", error, { userId });
    ApiResponseHelper.error(res, "Failed to change password", 500, error);
  }
}

