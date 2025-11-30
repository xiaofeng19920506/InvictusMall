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
    // Check if user has permission to create staff
    if (!req.staff) {
      ApiResponseHelper.unauthorized(res, "Authentication required");
      return;
    }

    const requesterRole = req.staff.role;
    const requesterId = req.staff.id;
    const { email, firstName, lastName, role, department, employeeId, storeId } = req.body;

    // Role-based permission checks
    if (requesterRole === "admin") {
      // Admin can invite all roles (admin, owner, manager, employee)
      // No restrictions
    } else if (requesterRole === "owner") {
      // Owner can only invite manager and employee for their stores
      if (role !== "manager" && role !== "employee") {
        ApiResponseHelper.forbidden(
          res,
          "Owner can only invite manager and employee roles for their stores"
        );
        return;
      }
    } else if (requesterRole === "manager") {
      // Manager can only invite employee
      if (role !== "employee") {
        ApiResponseHelper.forbidden(
          res,
          "Manager can only invite employee role"
        );
        return;
      }
    } else {
      ApiResponseHelper.forbidden(res, "Insufficient permissions to invite staff members");
      return;
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
    if (requesterRole === "owner") {
      // Owner: ensure store belongs to them
      const { getAccessibleStoreIds } = await import("../../utils/ownerPermissions");
      const accessibleStoreIds = await getAccessibleStoreIds(req);
      if (!accessibleStoreIds || accessibleStoreIds.length === 0) {
        ApiResponseHelper.forbidden(res, "Owner is not associated with any store");
        return;
      }
      // If storeId is provided, verify it belongs to the owner
      if (storeId && !accessibleStoreIds.includes(storeId)) {
        ApiResponseHelper.forbidden(res, "You can only invite staff for your own stores");
        return;
      }
      // If no storeId provided, assign to the first accessible store
      if (!storeId) {
        finalStoreId = accessibleStoreIds[0];
      }
    } else if (requesterRole === "manager") {
      // Manager: assign to their store
      const requesterStaff = await staffModel.getStaffById(requesterId);
      const requesterStoreId = (requesterStaff as any)?.storeId;
      if (!requesterStoreId) {
        ApiResponseHelper.forbidden(res, "Manager is not associated with any store");
        return;
      }
      // If storeId is provided, verify it matches the manager's store
      if (storeId && storeId !== requesterStoreId) {
        ApiResponseHelper.forbidden(res, "You can only invite employees for your own store");
        return;
      }
      finalStoreId = requesterStoreId;
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
      invitedBy: req.staff.id,
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
        invitedBy: req.staff.id,
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
    logger.error("Staff invitation error", error, { email: req.body.email, staffId: req.staff?.id });
    ApiResponseHelper.error(res, "Internal server error", 500, error);
  }
}

