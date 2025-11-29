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
    // Check for staff authentication first (staff routes use req.staff)
    if (!req.staff && !req.user) {
      ApiResponseHelper.unauthorized(res, "Unauthorized");
      return;
    }

    // Use staff authentication if available, otherwise fall back to user
    const requesterRole = req.staff?.role || req.user?.role;
    const requesterId = req.staff?.id || req.user?.id;
    
    // Ensure we have both role and id
    if (!requesterRole || !requesterId) {
      ApiResponseHelper.unauthorized(res, "Unauthorized: Missing role or id");
      return;
    }
    
    const { limit, offset, forStoreCreation } = req.query;
    let staffMembers: any[] = [];
    let total = 0;

    // Get requester's staff info to check store_id
    const requesterStaff = await staffModel.getStaffById(requesterId);
    const requesterStoreId = (requesterStaff as any)?.storeId || null;

    // Special case: When creating a store, admin should see all available owners and admins
    // This is used when creating a store to show available store owners
    if (forStoreCreation === "true" && requesterRole === "admin") {
      const allStaff = await staffModel.getAllStaff();
      // Filter for active owners and admins only (they can be store owners)
      staffMembers = allStaff.filter(
        (staff: any) => 
          (staff.role === "owner" || staff.role === "admin") && 
          staff.isActive
      );
      total = staffMembers.length;
      // Apply pagination manually if limit is provided
      if (limit !== undefined) {
        const limitValue = parseInt(limit as string) || 0;
        const offsetValue = offset !== undefined ? parseInt(offset as string) : 0;
        staffMembers = staffMembers.slice(offsetValue, offsetValue + limitValue);
      }
    }
    // Role-based data filtering
    else if (requesterRole === "admin") {
      // Admin can see all staff in their own store only
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
        // Admin without store can see all admins and owners (for store creation)
        const allStaff = await staffModel.getAllStaff();
        staffMembers = allStaff.filter(
          (staff: any) => 
            (staff.role === "owner" || staff.role === "admin") && 
            staff.isActive
        );
        total = staffMembers.length;
        // Apply pagination manually if limit is provided
        if (limit !== undefined) {
          const limitValue = parseInt(limit as string) || 0;
          const offsetValue = offset !== undefined ? parseInt(offset as string) : 0;
          staffMembers = staffMembers.slice(offsetValue, offsetValue + limitValue);
        }
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
      requesterId: req.staff?.id || req.user?.id,
      requesterRole: req.staff?.role || req.user?.role,
    });
    ApiResponseHelper.error(res, "Failed to fetch staff members", 500, error);
  }
}

