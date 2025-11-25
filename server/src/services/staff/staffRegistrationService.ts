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
    // Check if user has permission to create staff (admin or owner only)
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "owner")) {
      ApiResponseHelper.forbidden(res, "Insufficient permissions to create staff members");
      return;
    }

    const staffData: CreateStaffRequest = req.body;

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
      createdBy: req.user.id,
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
        createdBy: req.user.id,
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
    logger.error("Staff registration error", error, { email: req.body.email, userId: req.user?.id });
    ApiResponseHelper.error(res, "Internal server error", 500, error);
  }
}

