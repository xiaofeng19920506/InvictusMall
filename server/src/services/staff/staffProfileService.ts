import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StaffModel } from "../../models/StaffModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export async function handleGetStaffProfile(
  req: Request,
  res: Response,
  staffModel: StaffModel
): Promise<void> {
  try {
    // Check if this is a staff token
    const token =
      req.cookies.staff_auth_token ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      ApiResponseHelper.unauthorized(res, "Access token required");
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.type !== "staff") {
      ApiResponseHelper.unauthorized(res, "Invalid token type");
      return;
    }

    // Get staff member
    const staff = await staffModel.getStaffById(decoded.staffId);
    if (!staff) {
      ApiResponseHelper.unauthorized(res, "Staff member not found");
      return;
    }

    ApiResponseHelper.success(res, { user: staff });
  } catch (error) {
    logger.error("Get staff member error", error);
    ApiResponseHelper.unauthorized(res, "Invalid or expired token");
  }
}

