import { Request, Response } from "express";
import { StaffModel } from "../../models/StaffModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleGetAllStaff(
  req: AuthenticatedRequest,
  res: Response,
  staffModel: StaffModel
): Promise<void> {
  try {
    if (!req.user) {
      ApiResponseHelper.unauthorized(res, "Unauthorized");
      return;
    }

    const requesterRole = req.user.role;
    const requesterId = req.user.id;
    const { limit, offset } = req.query;
    let staffMembers: any[] = [];
    let total = 0;

    // Get requester's staff info to check store_id
    const requesterStaff = await staffModel.getStaffById(requesterId);
    const requesterStoreId = (requesterStaff as any)?.storeId || null;

    // Role-based data filtering
    if (requesterRole === "admin") {
      // Admin can see all staff members - use pagination if limit is provided
      if (limit !== undefined) {
        const { staff, total: totalCount } = await staffModel.getAllStaffWithPagination({
          limit: parseInt(limit as string) || undefined,
          offset: offset !== undefined ? parseInt(offset as string) : undefined,
        });
        staffMembers = staff;
        total = totalCount;
      } else {
        staffMembers = await staffModel.getAllStaff();
        total = staffMembers.length;
      }
    } else if (requesterRole === "owner") {
      // Store owner can see all staff in the same store
      if (requesterStoreId) {
        const allStaff = await staffModel.getAllStaff();
        staffMembers = allStaff.filter((staff: any) => staff.storeId === requesterStoreId);
        total = staffMembers.length;
        // Apply pagination manually if limit is provided
        if (limit !== undefined) {
          const limitValue = parseInt(limit as string) || 0;
          const offsetValue = offset !== undefined ? parseInt(offset as string) : 0;
          staffMembers = staffMembers.slice(offsetValue, offsetValue + limitValue);
        }
      } else {
        staffMembers = [];
        total = 0;
      }
    } else if (requesterRole === "manager") {
      // Manager can see all staff including owner (in same store)
      if (requesterStoreId) {
        const allStaff = await staffModel.getAllStaff();
        staffMembers = allStaff.filter((staff: any) => staff.storeId === requesterStoreId);
        total = staffMembers.length;
        // Apply pagination manually if limit is provided
        if (limit !== undefined) {
          const limitValue = parseInt(limit as string) || 0;
          const offsetValue = offset !== undefined ? parseInt(offset as string) : 0;
          staffMembers = staffMembers.slice(offsetValue, offsetValue + limitValue);
        }
      } else {
        staffMembers = [];
        total = 0;
      }
    } else if (requesterRole === "employee") {
      // Employee can only see themselves
      const staff = await staffModel.getStaffById(requesterId);
      staffMembers = staff ? [staff] : [];
      total = staffMembers.length;
    } else {
      ApiResponseHelper.forbidden(res, "Insufficient permissions");
      return;
    }

    // Remove password from response and add edit permission info
    const staffWithPermissions = staffMembers.map(({ password, ...staff }) => {
      let canEdit = false;
      const isSelf = staff.id === requesterId;

      // Edit permission logic
      if (isSelf) {
        canEdit = true;
      } else if (requesterRole === "admin") {
        canEdit = true;
      } else if (requesterRole === "owner") {
        canEdit =
          (staff as any).storeId === requesterStoreId && staff.role !== "owner";
      } else if (requesterRole === "manager") {
        canEdit =
          staff.role !== "owner" &&
          staff.role !== "admin" &&
          (staff.role === "employee" || staff.role === "manager");
      }

      return {
        ...staff,
        canEdit,
      };
    });

    const response: any = {
      success: true,
      data: staffWithPermissions || [],
      count: staffWithPermissions.length,
    };

    // Include total only if limit was provided (indicating pagination)
    if (limit !== undefined) {
      response.total = total;
    }

    res.json(response);
  } catch (error) {
    logger.error("Error fetching all staff", error, {
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
    });
    ApiResponseHelper.error(res, "Failed to fetch staff members", 500, error);
  }
}

