import { Request, Response } from "express";
import { UserModel, CreateUserRequest } from "../../models/UserModel";
import { VerificationTokenModel } from "../../models/VerificationTokenModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { emailService } from "../emailService";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { isConnectionError } from "./authUtils";

export async function handleSignup(
  req: Request,
  res: Response,
  userModel: UserModel,
  verificationTokenModel: VerificationTokenModel
): Promise<void> {
  try {
    const { email, firstName, lastName, phoneNumber }: CreateUserRequest = req.body;

    // Check if email already exists
    let emailExists;
    try {
      emailExists = await userModel.emailExists(email);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during signup", dbError, { email });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }

    if (emailExists) {
      ApiResponseHelper.validationError(res, "Email already registered");
      return;
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
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during user creation", dbError, { email });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
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
    const emailSent = await emailService.sendVerificationEmail(email, verificationToken);

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
    }

    // Return success message (no token until email is verified)
    ApiResponseHelper.success(
      res,
      { emailSent },
      "Registration successful! Please check your email to verify your account and complete setup.",
      201
    );
  } catch (error) {
    logger.error("Signup error", error, { email: req.body.email });
    ApiResponseHelper.error(res, "Failed to register user", 500, error);
  }
}

