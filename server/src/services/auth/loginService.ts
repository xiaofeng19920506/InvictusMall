import { Request, Response } from "express";
import { UserModel, LoginRequest } from "../../models/UserModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { isConnectionError } from "./authUtils";
import { generateAuthToken } from "./tokenService";

export async function handleLogin(
  req: Request,
  res: Response,
  userModel: UserModel
): Promise<void> {
  try {
    const { email, password }: LoginRequest = req.body;

    // Get user by email
    let user;
    try {
      user = await userModel.getUserByEmail(email);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during login", dbError, { email: req.body.email });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      logger.error("Unexpected database error during login", dbError, { email: req.body.email });
      throw dbError;
    }

    if (!user) {
      ApiResponseHelper.unauthorized(res, "Invalid email or password");
      return;
    }

    // Verify password
    if (!user.password) {
      ApiResponseHelper.unauthorized(res, "Invalid email or password");
      return;
    }

    const isPasswordValid = await userModel.verifyPassword(password, user.password!);
    if (!isPasswordValid) {
      ApiResponseHelper.unauthorized(res, "Invalid email or password");
      return;
    }

    // Update last login (don't fail login if this fails)
    try {
      await userModel.updateLastLogin(user.id);
    } catch (updateError) {
      logger.warn("Failed to update last login", { error: updateError, userId: user.id });
    }

    // Generate JWT token
    const token = generateAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

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

    ApiResponseHelper.success(res, userWithoutPassword, "Login successful");
  } catch (error) {
    logger.error("Login error", error, { email: req.body.email });
    ApiResponseHelper.error(res, "Failed to login. Please try again later.", 500, error);
  }
}

