import { Request, Response } from "express";
import { UserModel } from "../../models/UserModel";
import { ActivityLogModel, ActivityLog } from "../../models/ActivityLogModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { isConnectionError } from "./authUtils";

export async function handleGetProfile(
  req: Request,
  res: Response,
  userModel: UserModel,
  userId: string
): Promise<void> {
  try {
    // User is already authenticated and available in req.user
    let user;
    try {
      user = await userModel.getActiveUserById(userId);
    } catch (dbError: any) {
      if (isConnectionError(dbError)) {
        logger.error("Database connection error during /me", dbError, { userId });
        ApiResponseHelper.error(res, "Service temporarily unavailable. Please try again later.", 503);
        return;
      }
      throw dbError;
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    logger.error("Get profile error", error, { userId });
    ApiResponseHelper.error(res, "Failed to get user profile", 500, error);
  }
}

export async function handleUpdateProfile(
  req: Request,
  res: Response,
  userModel: UserModel,
  userId: string
): Promise<void> {
  try {
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

    ApiResponseHelper.success(res, userWithoutPassword, "Profile updated successfully");
  } catch (error) {
    logger.error("Update profile error", error, { userId });
    ApiResponseHelper.error(res, "Failed to update profile", 500, error);
  }
}

