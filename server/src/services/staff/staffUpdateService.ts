import { Request, Response } from "express";
import { StaffModel, UpdateStaffRequest } from "../../models/StaffModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { getUserNameFromRequest, getUserIdFromRequest } from "../../utils/activityLogHelper";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleUpdateStaff(
  req: AuthenticatedRequest,
  res: Response,
  staffModel: StaffModel
): Promise<void> {
  try {
    if (!req.user) {
      ApiResponseHelper.unauthorized(res, "Unauthorized");
      return;
    }

    const { id } = req.params;
    if (!id) {
      ApiResponseHelper.validationError(res, "Staff ID is required");
      return;
    }

    const requesterRole = req.user.role;
    const requesterId = req.user.id;

    // Check if staff member exists
    const existingStaff = await staffModel.getStaffById(id);
    if (!existingStaff) {
      ApiResponseHelper.notFound(res, "Staff member");
      return;
    }

    const isSelf = id === requesterId;

    // Permission checks
    if (isSelf) {
      // Everyone can edit their own information
    } else if (requesterRole === "admin") {
      // Admin can edit everyone
    } else if (requesterRole === "owner") {
      // Owner can edit staff in their store with lower access levels
      const requesterStaff = await staffModel.getStaffById(requesterId);
      if (!requesterStaff) {
        ApiResponseHelper.notFound(res, "Requester staff");
        return;
      }
      const requesterStoreId = (requesterStaff as any)?.storeId;
      const targetStoreId = (existingStaff as any)?.storeId;

      if (
        targetStoreId !== requesterStoreId ||
        existingStaff.role === "owner" ||
        existingStaff.role === "admin"
      ) {
        ApiResponseHelper.forbidden(res, "Insufficient permissions to edit this staff member");
        return;
      }
    } else if (requesterRole === "manager") {
      // Manager can edit employees and managers in same store
      const requesterStaff = await staffModel.getStaffById(requesterId);
      if (!requesterStaff) {
        ApiResponseHelper.notFound(res, "Requester staff");
        return;
      }
      const requesterStoreId = (requesterStaff as any)?.storeId;
      const targetStoreId = (existingStaff as any)?.storeId;

      if (
        targetStoreId !== requesterStoreId ||
        existingStaff.role === "owner" ||
        existingStaff.role === "admin"
      ) {
        ApiResponseHelper.forbidden(res, "Insufficient permissions to edit this staff member");
        return;
      }
    } else {
      // Employee can only edit themselves
      ApiResponseHelper.forbidden(res, "Insufficient permissions");
      return;
    }

    // Prepare update data
    const updateData: UpdateStaffRequest = {};
    if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
    if (req.body.phoneNumber !== undefined) updateData.phoneNumber = req.body.phoneNumber;
    if (req.body.role !== undefined) {
      // Role change restrictions
      if (isSelf) {
        // Users cannot change their own role
        ApiResponseHelper.forbidden(res, "You cannot change your own role");
        return;
      } else {
        // Role change restrictions for editing others
        if (requesterRole === "admin") {
          updateData.role = req.body.role;
        } else if (requesterRole === "owner") {
          if (req.body.role === "owner" || req.body.role === "admin") {
            ApiResponseHelper.forbidden(res, "Owner can only assign manager or employee roles");
            return;
          }
          if (existingStaff.role === "owner") {
            ApiResponseHelper.forbidden(res, "Cannot change role of owner");
            return;
          }
          updateData.role = req.body.role;
        } else if (requesterRole === "manager") {
          if (req.body.role === "owner" || req.body.role === "admin") {
            ApiResponseHelper.forbidden(res, "Cannot assign owner or admin role");
            return;
          }
          if (existingStaff.role === "employee" || existingStaff.role === "manager") {
            updateData.role = req.body.role;
          } else {
            ApiResponseHelper.forbidden(res, "Cannot change role of this staff member");
            return;
          }
        } else {
          ApiResponseHelper.forbidden(res, "Insufficient permissions to change role");
          return;
        }
      }
    }
    if (req.body.department !== undefined) updateData.department = req.body.department;
    if (req.body.employeeId !== undefined) {
      ApiResponseHelper.forbidden(res, "Employee ID cannot be changed");
      return;
    }
    if (req.body.isActive !== undefined) {
      if (isSelf) {
        ApiResponseHelper.forbidden(res, "Cannot change your own active status");
        return;
      }
      if (requesterRole === "admin") {
        updateData.isActive = req.body.isActive;
      } else {
        ApiResponseHelper.forbidden(res, "Only admin can change active status");
        return;
      }
    }

    // Update staff member
    const updatedStaff = await staffModel.updateStaff(id, updateData);
    if (!updatedStaff) {
      ApiResponseHelper.error(res, "Failed to update staff member", 500);
      return;
    }

    // Log activity
    const userId = getUserIdFromRequest(req);
    const userName = await getUserNameFromRequest(req);
    await ActivityLogModel.createLog({
      type: "profile_updated",
      message: `Staff member ${updatedStaff.email} profile updated`,
      userId,
      userName,
      metadata: {
        staffId: updatedStaff.id,
        email: updatedStaff.email,
        updatedFields: Object.keys(updateData),
      },
    });

    // Remove password from response
    const { password, ...staffWithoutPassword } = updatedStaff;

    ApiResponseHelper.success(res, staffWithoutPassword, "Staff member updated successfully");
  } catch (error: any) {
    logger.error("Error updating staff member", error, {
      staffId: req.params.id,
      userId: req.user?.id,
    });
    ApiResponseHelper.error(res, error.message || "Failed to update staff member", 500, error);
  }
}

