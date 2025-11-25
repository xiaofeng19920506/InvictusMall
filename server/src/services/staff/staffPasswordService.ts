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

    // Create staff member
    const staff = await staffModel.createStaff({
      email: invitation.email,
      password,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      phoneNumber,
      role: invitation.role,
      department: invitation.department,
      employeeId: invitation.employeeId,
      storeId: invitation.storeId,
      createdBy: invitation.invitedBy,
    });

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

    // Log activity
    const userName = `${staff.firstName} ${staff.lastName}`;
    await ActivityLogModel.createLog({
      type: "staff_registered",
      message: `Staff member ${staff.email} completed registration via invitation.`,
      userId: staff.id,
      userName,
      metadata: {
        staffId: staff.id,
        email: staff.email,
        role: staff.role,
        invitationId: invitation.id,
      },
    });

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

