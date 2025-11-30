import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StaffModel } from "../../models/StaffModel";
import { StaffInvitationModel } from "../../models/StaffInvitationModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export async function handleStaffSetupPassword(
  req: Request,
  res: Response,
  staffModel: StaffModel,
  invitationModel: StaffInvitationModel
): Promise<void> {
  try {
    const { token, password, phoneNumber } = req.body;

    // Get invitation by token
    const invitation = await invitationModel.getInvitationByToken(token);
    if (!invitation) {
      ApiResponseHelper.notFound(res, "Invitation");
      return;
    }

    // Check if there's an existing inactive staff member with this email
    const existingStaff = await staffModel.getStaffByEmailIncludingInactive(invitation.email);
    let staff;

    if (existingStaff && !existingStaff.isActive) {
      // Reactivate and transfer existing inactive staff to new store
      const previousStoreId = existingStaff.storeId;
      
      // Update password first (before reactivation)
      await staffModel.updatePassword(existingStaff.id, password);

      // Update existing staff: reactivate, update role, and other info
      const updatedStaff = await staffModel.updateStaff(existingStaff.id, {
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        phoneNumber: phoneNumber || existingStaff.phoneNumber,
        role: invitation.role,
        department: invitation.department || existingStaff.department,
        employeeId: invitation.employeeId || existingStaff.employeeId,
        isActive: true, // Reactivate
      });

      if (!updatedStaff) {
        ApiResponseHelper.error(res, "Failed to reactivate staff member", 500);
        return;
      }

      staff = updatedStaff;

      // Add the new store to staff (supporting multiple stores)
      if (invitation.storeId) {
        await staffModel.addStoreToStaff(existingStaff.id, invitation.storeId);
      }

      // Log the transfer activity
      await ActivityLogModel.createLog({
        type: "staff_registered",
        message: `Inactive staff member ${invitation.email} reactivated and transferred to new store`,
        userId: existingStaff.id,
        userName: `${invitation.firstName} ${invitation.lastName}`,
        storeId: invitation.storeId,
        metadata: {
          staffId: existingStaff.id,
          email: invitation.email,
          role: invitation.role,
          previousStoreId,
          newStoreId: invitation.storeId,
          invitationId: invitation.id,
          reactivated: true,
        },
      });

      logger.info("Inactive staff reactivated and transferred", {
        staffId: existingStaff.id,
        email: invitation.email,
        previousStoreId,
        newStoreId: invitation.storeId,
      });
    } else if (existingStaff && existingStaff.isActive) {
      // Active staff already exists, cannot create duplicate
      ApiResponseHelper.error(res, "Email already registered with an active account", 409);
      return;
    } else {
      // Create new staff member
      staff = await staffModel.createStaff({
        email: invitation.email,
        password,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        phoneNumber,
        role: invitation.role,
        department: invitation.department,
        employeeId: invitation.employeeId,
        storeId: invitation.storeId, // Primary store
        createdBy: invitation.invitedBy,
      });

      // Also add to staff_stores table for consistency
      if (invitation.storeId) {
        await staffModel.addStoreToStaff(staff.id, invitation.storeId);
      }

      // Log activity for new staff
      await ActivityLogModel.createLog({
        type: "staff_registered",
        message: `Staff member ${staff.email} completed registration via invitation.`,
        userId: staff.id,
        userName: `${staff.firstName} ${staff.lastName}`,
        metadata: {
          staffId: staff.id,
          email: staff.email,
          role: staff.role,
          invitationId: invitation.id,
        },
      });
    }

    // Mark invitation as used
    await invitationModel.markInvitationAsUsed(token);

    // Generate JWT token for staff
    const jwtToken = jwt.sign(
      {
        staffId: staff.id,
        email: staff.email,
        role: staff.role,
        type: "staff",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set HTTP-only cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("staff_auth_token", jwtToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Activity logging is now handled above (either for reactivation or new staff)

    res.json({
      success: true,
      message: "Password set successfully. You are now logged in.",
      user: {
        id: staff.id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phoneNumber: staff.phoneNumber,
        role: staff.role,
        department: staff.department,
        employeeId: staff.employeeId,
        isActive: staff.isActive,
        emailVerified: staff.emailVerified,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
        lastLoginAt: staff.lastLoginAt,
        createdBy: staff.createdBy,
      },
    });
  } catch (error) {
    logger.error("Setup password error", error, { token: req.body.token });
    ApiResponseHelper.error(res, "Internal server error", 500, error);
  }
}

