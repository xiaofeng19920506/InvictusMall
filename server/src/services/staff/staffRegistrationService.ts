import { Request, Response } from "express";
import { StaffModel, CreateStaffRequest } from "../../models/StaffModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { getUserNameFromRequest, getUserIdFromRequest } from "../../utils/activityLogHelper";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleStaffRegister(
  req: AuthenticatedRequest,
  res: Response,
  staffModel: StaffModel
): Promise<void> {
  try {
    // Check if user has permission to create staff
    if (!req.staff) {
      ApiResponseHelper.unauthorized(res, "Authentication required");
      return;
    }

    const requesterRole = req.staff.role;
    const staffData: CreateStaffRequest = req.body;
    const requestedRole = staffData.role;

    // Role-based permission checks
    if (requesterRole === "admin") {
      // Admin can register all roles (admin, owner, manager, employee)
      // No restrictions
    } else if (requesterRole === "owner") {
      // Owner can only register manager and employee for their stores
      if (requestedRole !== "manager" && requestedRole !== "employee") {
        ApiResponseHelper.forbidden(
          res,
          "Owner can only register manager and employee roles for their stores"
        );
        return;
      }
      // Ensure the staff is assigned to one of the owner's stores
      const { getAccessibleStoreIds } = await import("../../utils/ownerPermissions");
      const accessibleStoreIds = await getAccessibleStoreIds(req);
      if (!accessibleStoreIds || accessibleStoreIds.length === 0) {
        ApiResponseHelper.forbidden(res, "Owner is not associated with any store");
        return;
      }
      // If storeId is provided, verify it belongs to the owner
      if (staffData.storeId && !accessibleStoreIds.includes(staffData.storeId)) {
        ApiResponseHelper.forbidden(res, "You can only register staff for your own stores");
        return;
      }
      // If no storeId provided, assign to the first accessible store
      if (!staffData.storeId) {
        staffData.storeId = accessibleStoreIds[0];
      }
    } else if (requesterRole === "manager") {
      // Manager can only register employee
      if (requestedRole !== "employee") {
        ApiResponseHelper.forbidden(
          res,
          "Manager can only register employee role"
        );
        return;
      }
      // Ensure the employee is assigned to the manager's store
      const requesterStaff = await staffModel.getStaffById(req.staff.id);
      const requesterStoreId = (requesterStaff as any)?.storeId;
      if (!requesterStoreId) {
        ApiResponseHelper.forbidden(res, "Manager is not associated with any store");
        return;
      }
      // If storeId is provided, verify it matches the manager's store
      if (staffData.storeId && staffData.storeId !== requesterStoreId) {
        ApiResponseHelper.forbidden(res, "You can only register employees for your own store");
        return;
      }
      // Assign to manager's store
      staffData.storeId = requesterStoreId;
    } else {
      ApiResponseHelper.forbidden(res, "Insufficient permissions to register staff members");
      return;
    }

    // Check if email already exists
    const emailExists = await staffModel.emailExists(staffData.email);
    if (emailExists) {
      ApiResponseHelper.error(res, "Email already registered", 409);
      return;
    }

    // Check if employee ID already exists (if provided)
    if (staffData.employeeId) {
      const employeeIdExists = await staffModel.employeeIdExists(staffData.employeeId);
      if (employeeIdExists) {
        ApiResponseHelper.error(res, "Employee ID already exists", 409);
        return;
      }
    }

    // Create staff member
    const staff = await staffModel.createStaff({
      ...staffData,
      createdBy: req.staff.id,
    });

    // Log activity
    const userId = getUserIdFromRequest(req);
    const userName = await getUserNameFromRequest(req);
    await ActivityLogModel.createLog({
      type: "staff_registered",
      message: `New staff member ${staff.email} (${staff.role}) registered`,
      userId,
      userName,
      metadata: {
        staffId: staff.id,
        email: staff.email,
        role: staff.role,
        createdBy: req.staff.id,
      },
    });

    ApiResponseHelper.success(
      res,
      {
        user: {
          id: staff.id,
          email: staff.email,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          employeeId: staff.employeeId,
        },
      },
      "Staff member created successfully",
      201
    );
  } catch (error) {
    logger.error("Staff registration error", error, { email: req.body.email, staffId: req.staff?.id });
    ApiResponseHelper.error(res, "Internal server error", 500, error);
  }
}

