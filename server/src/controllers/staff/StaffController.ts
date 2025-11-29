import { Response } from "express";
import { BaseController } from "../BaseController";
import { AuthenticatedRequest } from "../../middleware/auth";
import { staffStoreService } from "../../services/staff/staffStoreService";

/**
 * Controller for staff-related operations
 * Handles HTTP request/response and delegates business logic to services
 */
export class StaffController extends BaseController {
  /**
   * Get stores associated with the current staff member
   * GET /api/staff/my-stores
   */
  getMyStores = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      if (!req.staff) {
        return this.unauthorized(res, "Unauthorized");
      }

      const staffId = req.staff.id;
      const staffRole = req.staff.role;

      const stores = await staffStoreService.getStoresForStaff(staffId, staffRole);

      return this.successWithCount(res, stores, stores.length);
    } catch (error: any) {
      // If staff member not found, return 404
      if (error.message?.includes("not found")) {
        return this.notFound(res, "Staff member");
      }
      // Otherwise return 500
      return this.error(res, "Failed to fetch stores", 500, error);
    }
  };
}

// Export singleton instance
export const staffController = new StaffController();
