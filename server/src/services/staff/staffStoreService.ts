import { StoreModel } from "../../models/StoreModel";
import { StaffModel } from "../../models/StaffModel";
import { Store } from "../../types/store";
import { logger } from "../../utils/logger";

/**
 * Service for handling staff-related store operations
 * This service layer contains pure business logic without HTTP concerns
 */
export class StaffStoreService {
  private storeModel: typeof StoreModel;
  private staffModel: StaffModel;

  constructor() {
    this.storeModel = StoreModel;
    this.staffModel = new StaffModel();
  }

  /**
   * Get all stores associated with a staff member
   * - Admin can see all active stores
   * - Other roles see only their assigned store
   * TODO: Also get stores where this staff member is the owner
   */
  async getStoresForStaff(staffId: string, staffRole: string): Promise<Store[]> {
    try {
      // Get staff member details
      const staffMember = await this.staffModel.getStaffById(staffId);
      if (!staffMember) {
        throw new Error(`Staff member with ID ${staffId} not found`);
      }

      let stores: Store[] = [];

      // Admin can see all active stores
      if (staffRole === "admin") {
        stores = await this.storeModel.findAll();
        // Filter only active stores
        stores = stores.filter((store) => store.isActive);
      } else {
        // For other roles, get their assigned store
        if (staffMember.storeId) {
          const store = await this.storeModel.findById(staffMember.storeId);
          if (store && store.isActive) {
            stores = [store];
          }
        }

        // TODO: Also get stores where this staff member is the owner
        // This requires checking store_owner_id field if it exists
      }

      return stores;
    } catch (error) {
      logger.error("Error in getStoresForStaff", error, { staffId, staffRole });
      throw error;
    }
  }
}

// Export singleton instance
export const staffStoreService = new StaffStoreService();
