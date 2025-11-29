import { Request, Response } from "express";
import { StaffModel } from "../../models/StaffModel";
import { StaffInvitationModel } from "../../models/StaffInvitationModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { emailService } from "../emailService";
import { getUserNameFromRequest, getUserIdFromRequest } from "../../utils/activityLogHelper";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleStaffInvite(
  req: AuthenticatedRequest,
  res: Response,
  staffModel: StaffModel,
  invitationModel: StaffInvitationModel
): Promise<void> {
  try {
    // Check if user has permission to create staff (admin, owner, or manager)
    if (
      !req.user ||
      (req.user.role !== "admin" && req.user.role !== "owner" && req.user.role !== "manager")
    ) {
      ApiResponseHelper.forbidden(res, "Insufficient permissions to create staff members");
      return;
    }

    const { email, firstName, lastName, role, department, employeeId, storeId } = req.body;
    const requesterRole = req.user.role;
    const requesterId = req.user.id;

    // Role-based restrictions
    if (requesterRole === "admin") {
      // Admin can invite owner and admin roles
      if (role !== "owner" && role !== "admin") {
        ApiResponseHelper.forbidden(res, "Admin can only invite staff with owner or admin role");
        return;
      }
    } else if (requesterRole === "owner") {
      // Owner can only invite manager and employee roles
      if (role !== "manager" && role !== "employee") {
        ApiResponseHelper.forbidden(res, "Owner can only invite staff with manager or employee role");
        return;
      }
    } else if (requesterRole === "manager") {
      // Manager can only invite employee roles
      if (role !== "employee") {
        ApiResponseHelper.forbidden(res, "Manager can only invite staff with employee role");
        return;
      }
    }

    // Check if email already exists in staff table
    const emailExists = await staffModel.emailExists(email);
    if (emailExists) {
      ApiResponseHelper.error(res, "Email already registered", 409);
      return;
    }

    // Check if employee ID already exists (if provided)
    if (employeeId) {
      const employeeIdExists = await staffModel.employeeIdExists(employeeId);
      if (employeeIdExists) {
        ApiResponseHelper.error(res, "Employee ID already exists", 409);
        return;
      }
    }

    // Get final store ID based on requester role
    let finalStoreId: string | undefined = storeId || undefined;
    if (requesterRole === "owner" || requesterRole === "manager") {
      const requesterStaff = await staffModel.getStaffById(requesterId);
      const requesterStoreId = (requesterStaff as any)?.storeId;
      if (requesterStoreId) {
        finalStoreId = requesterStoreId;
      } else if (storeId) {
        finalStoreId = storeId;
      }
    }

    // Create invitation
    const invitation = await invitationModel.createInvitation({
      email,
      firstName,
      lastName,
      role,
      department,
      employeeId,
      storeId: finalStoreId,
      invitedBy: req.user.id,
    });

    // Send invitation email
    const emailSent = await emailService.sendStaffInvitationEmail(
      email,
      firstName,
      lastName,
      role,
      invitation.token
    );

    // Log activity
    const userId = getUserIdFromRequest(req);
    const userName = await getUserNameFromRequest(req);
    await ActivityLogModel.createLog({
      type: "staff_registered",
      message: `Staff invitation sent to ${email} (${role})`,
      userId,
      userName,
      metadata: {
        invitationId: invitation.id,
        email,
        role,
        invitedBy: req.user.id,
        emailSent,
      },
    });

    ApiResponseHelper.success(
      res,
      {
        emailSent,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      },
      "Staff invitation sent successfully",
      201
    );
  } catch (error) {
    logger.error("Staff invitation error", error, { email: req.body.email, userId: req.user?.id });
    ApiResponseHelper.error(res, "Internal server error", 500, error);
  }
}

