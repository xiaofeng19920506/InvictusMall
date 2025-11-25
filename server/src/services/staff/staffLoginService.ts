import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StaffModel } from "../../models/StaffModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export async function handleStaffLogin(
  req: Request,
  res: Response,
  staffModel: StaffModel
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Get staff member
    const staff = await staffModel.getStaffByEmail(email);
    if (!staff) {
      ApiResponseHelper.unauthorized(res, "Invalid email or password");
      return;
    }

    // Verify password
    const isValidPassword = await staffModel.verifyPassword(staff, password);
    if (!isValidPassword) {
      ApiResponseHelper.unauthorized(res, "Invalid email or password");
      return;
    }

    // Update last login
    await staffModel.updateLastLogin(staff.id);

    // Generate JWT token
    const tokenPayload = {
      staffId: staff.id,
      email: staff.email,
      role: staff.role,
      type: "staff",
    };

    logger.debug("JWT Payload", { tokenPayload, jwtSecretLength: JWT_SECRET?.length || 0 });

    // Calculate expiration time explicitly (7 days from now)
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 7 * 24 * 60 * 60; // 7 days in seconds

    logger.debug("JWT signing", { now, exp, expDate: new Date(exp * 1000) });

    const token = jwt.sign(
      {
        ...tokenPayload,
        iat: now,
        exp: exp,
      },
      JWT_SECRET
    );

    // Decode and log the token to check expiration
    const decoded = jwt.decode(token) as any;
    logger.debug("JWT decoded", {
      iat: decoded.iat,
      exp: decoded.exp,
      expDate: new Date(decoded.exp * 1000),
    });

    // Log the activity
    try {
      const userName = `${staff.firstName} ${staff.lastName}`;
      await ActivityLogModel.createLog({
        type: "user_login",
        message: `Staff member "${userName}" logged in`,
        userId: staff.id,
        userName,
        metadata: {
          staffId: staff.id,
          email: staff.email,
          role: staff.role,
          type: "staff_login",
        },
      });
    } catch (logError) {
      logger.warn("Failed to log staff login", { error: logError, staffId: staff.id });
    }

    // Set HTTP-only cookie with JWT token
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("staff_auth_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Return staff data without password
    const { password: _, ...staffWithoutPassword } = staff;

    // In development, also return token in response body as fallback
    const responseData: any = {
      success: true,
      message: "Login successful",
      user: staffWithoutPassword,
    };

    if (process.env.NODE_ENV !== "production") {
      responseData.token = token;
    }

    ApiResponseHelper.success(res, responseData, "Login successful");
  } catch (error) {
    logger.error("Staff login error", error, { email: req.body.email });
    ApiResponseHelper.error(res, "Failed to login", 500, error);
  }
}

