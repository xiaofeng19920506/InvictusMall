import { Request, Response } from "express";
import { UserModel } from "../../models/UserModel";
import { VerificationTokenModel } from "../../models/VerificationTokenModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { isConnectionError } from "./authUtils";

export async function handleVerifyEmail(
  req: Request,
  res: Response,
  userModel: UserModel,
  verificationTokenModel: VerificationTokenModel
): Promise<void> {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      ApiResponseHelper.validationError(res, "Verification token is required");
      return;
    }

    // Find verification token
    let verificationToken;
    try {
      verificationToken = await verificationTokenModel.getTokenByTokenValue(token);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during email verification", dbError, { token });
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
        logger.error("Database connection error during email verification", dbError, { token });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }

    // Mark token as used
    await verificationTokenModel.markTokenAsUsed(verificationToken.id);

    // Log the activity (using user_registered type since email_verified doesn't exist)
    try {
      const userName = `${user.firstName} ${user.lastName}`;
      await ActivityLogModel.createLog({
        type: "user_registered",
        message: `User "${userName}" verified their email`,
        userId: user.id,
        userName,
        metadata: {
          userId: user.id,
          email: user.email,
        },
      });
    } catch (logError) {
      logger.warn("Failed to log email verification", { error: logError, userId: user.id });
    }

    ApiResponseHelper.success(
      res,
      null,
      "Email verified successfully! Please complete your account setup by setting a password."
    );
  } catch (error) {
    logger.error("Email verification error", error, { token: req.query.token });
    ApiResponseHelper.error(res, "Failed to verify email", 500, error);
  }
}

