import { Request, Response } from "express";
import { UserModel } from "../../models/UserModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";

export async function handleCheckAccount(
  req: Request,
  res: Response,
  userModel: UserModel
): Promise<void> {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      ApiResponseHelper.validationError(res, "Email or phone number is required");
      return;
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        ApiResponseHelper.validationError(res, "Invalid email format");
        return;
      }
    }

    const result = await userModel.checkAccountExists(email, phoneNumber);

    ApiResponseHelper.success(res, result);
  } catch (error) {
    logger.error("Check account error", error, { email: req.body.email, phoneNumber: req.body.phoneNumber });
    ApiResponseHelper.error(res, "Failed to check account", 500, error);
  }
}

