import { Request, Response } from "express";
import { StaffModel } from "../../models/StaffModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";
import { getAccessibleStoreIds } from "../../utils/ownerPermissions";

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

    // Get accessible store IDs for owner filtering
    const accessibleStoreIds = await getAccessibleStoreIds(req);

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
      // Admin can see ALL staff members regardless of store
      const allStaff = await staffModel.getAllStaff();
      staffMembers = allStaff;
      total = staffMembers.length;
      // Apply pagination manually if limit is provided
      if (limit !== undefined) {
        const limitValue = parseInt(limit as string) || 0;
        const offsetValue = offset !== undefined ? parseInt(offset as string) : 0;
        staffMembers = staffMembers.slice(offsetValue, offsetValue + limitValue);
      }
    } else if (requesterRole === "owner") {
      // Owner can see all staff in their accessible stores
      if (accessibleStoreIds !== null && accessibleStoreIds.length > 0) {
        const allStaff = await staffModel.getAllStaff();
        staffMembers = allStaff.filter((staff: any) => 
          staff.storeId && accessibleStoreIds.includes(staff.storeId)
        );
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
      // Manager can only see themselves and employees in the same store (not other managers, owner, or admin)
      // Get requester's staff info to check store_id
      const requesterStaff = await staffModel.getStaffById(requesterId);
      const requesterStoreId = (requesterStaff as any)?.storeId || null;
      
      if (requesterStoreId) {
        const allStaff = await staffModel.getAllStaff();
        staffMembers = allStaff.filter((staff: any) => 
          staff.storeId === requesterStoreId &&
          (staff.role === "employee" || (staff.id === requesterId && staff.role === "manager"))
        );
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

    // Get requester's store ID for manager (needed for edit permission check)
    let requesterStoreId: string | null = null;
    if (requesterRole === "manager") {
      const requesterStaff = await staffModel.getStaffById(requesterId);
      requesterStoreId = (requesterStaff as any)?.storeId || null;
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
        // Owner can edit staff in their accessible stores (except other owners)
        canEdit =
          (staff as any).storeId && 
          accessibleStoreIds !== null && 
          accessibleStoreIds.includes((staff as any).storeId) &&
          staff.role !== "owner";
      } else if (requesterRole === "manager") {
        // Manager can only edit themselves and employees in their own store (not other managers, owner, or admin)
        canEdit =
          (staff as any).storeId === requesterStoreId &&
          (
            staff.role === "employee" ||
            (isSelf && staff.role === "manager")
          );
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

