import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../../models/UserModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { generateAuthToken } from "./tokenService";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

export async function handleRefreshToken(
  req: Request,
  res: Response,
  userModel: UserModel
): Promise<void> {
  try {
    const staffToken = req.cookies.staff_auth_token;
    const userToken = req.cookies.auth_token;

    const token = staffToken || userToken;

    if (!token) {
      ApiResponseHelper.unauthorized(res, "Access token required");
      return;
    }

    let decoded: jwt.JwtPayload & {
      userId?: string;
      staffId?: string;
      email?: string;
      role?: string;
      type?: string;
    };

    try {
      decoded = jwt.verify(token, getJwtSecret(), {
        ignoreExpiration: true,
      }) as typeof decoded;
    } catch (error) {
      logger.error("Token refresh verification failed", error);
      ApiResponseHelper.unauthorized(res, "Invalid token");
      return;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const tokenIsExpired = decoded.exp ? decoded.exp <= nowInSeconds : false;

    if (staffToken || decoded.type === "staff") {
      const { StaffModel } = await import("../../models/StaffModel");
      const staffModel = new StaffModel();
      const staffId = decoded.staffId;

      if (!staffId) {
        ApiResponseHelper.unauthorized(res, "Invalid staff token");
        return;
      }

      const staff = await staffModel.getStaffById(staffId);

      if (!staff || !staff.isActive) {
        ApiResponseHelper.unauthorized(res, "Invalid or expired token");
        return;
      }

      if (!tokenIsExpired) {
        ApiResponseHelper.success(res, null, "Token still valid");
        return;
      }

      const refreshedToken = jwt.sign(
        {
          staffId: staff.id,
          email: staff.email,
          role: staff.role,
          type: "staff",
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      // For cross-origin requests in development, use 'none' with secure: false
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("staff_auth_token", refreshedToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "strict" : "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      const { password: _, ...staffWithoutPassword } = staff;

      ApiResponseHelper.success(res, staffWithoutPassword, "Token refreshed successfully");
      return;
    }

    const userId = decoded.userId;

    if (!userId) {
      ApiResponseHelper.unauthorized(res, "Invalid token");
      return;
    }

    const user = await userModel.getActiveUserById(userId);

    if (!user) {
      ApiResponseHelper.unauthorized(res, "Invalid or expired token");
      return;
    }

    if (!tokenIsExpired) {
      const { password: _, ...userWithoutPassword } = user;
      ApiResponseHelper.success(res, userWithoutPassword, "Token still valid");
      return;
    }

    const refreshedToken = generateAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie("auth_token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { password: _, ...userWithoutPassword } = user;

    ApiResponseHelper.success(res, userWithoutPassword, "Token refreshed successfully");
  } catch (error) {
    logger.error("Token refresh error", error);
    ApiResponseHelper.unauthorized(res, "Failed to refresh token");
  }
}

