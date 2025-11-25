import { Request, Response } from "express";
import { StoreService } from "../storeService";
import { StaffModel } from "../../models/StaffModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { getUserNameFromRequest, getUserIdFromRequest } from "../../utils/activityLogHelper";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleCreateStore(
  req: AuthenticatedRequest,
  res: Response,
  storeService: StoreService
): Promise<void> {
  try {
    // Only admins can create stores
    if (!req.user || req.user.role !== "admin") {
      ApiResponseHelper.forbidden(res, "Only administrators can create stores");
      return;
    }

    const { ownerId, ...storeData } = req.body;

    // Validate owner exists and has the 'owner' role before creating store
    const staffModel = new StaffModel();
    const owner = await staffModel.getStaffById(ownerId);

    if (!owner) {
      ApiResponseHelper.validationError(res, "Store owner not found");
      return;
    }

    if (owner.role !== "owner") {
      ApiResponseHelper.validationError(res, "Selected staff member must have the 'owner' role");
      return;
    }

    const store = await storeService.createStore(storeData);

    // Link the owner to the store
    try {
      await staffModel.updateStaff(ownerId, { storeId: store.id });
    } catch (ownerError) {
      logger.error("Error linking owner to store", ownerError, { storeId: store.id, ownerId });
      ApiResponseHelper.error(
        res,
        "Store created but failed to link owner. Please update the store manually.",
        500,
        ownerError
      );
      return;
    }

    // Fetch the created store with owner information included
    let storeWithOwner = { ...store };
    try {
      const owner = await staffModel.getOwnerByStoreId(store.id);
      const ownerInfo = owner
        ? {
            id: owner.id,
            firstName: owner.firstName,
            lastName: owner.lastName,
            email: owner.email,
            phoneNumber: owner.phoneNumber,
            role: owner.role,
          }
        : null;
      storeWithOwner = {
        ...store,
        owner: ownerInfo,
      } as any;
    } catch (error) {
      logger.warn("Failed to fetch store owner after creation", { storeId: store.id, error });
    }

    // Log the activity
    const userId = getUserIdFromRequest(req);
    const userName = await getUserNameFromRequest(req);
    await ActivityLogModel.createLog({
      type: "store_created",
      message: `New store "${store.name}" has been added`,
      storeName: store.name,
      storeId: store.id,
      userId,
      userName,
      metadata: {
        categories: store.category,
        rating: store.rating,
        isVerified: store.isVerified,
        ownerId: ownerId || null,
      },
    });

    ApiResponseHelper.success(res, storeWithOwner, "Store created successfully", 201);
  } catch (error) {
    logger.error("Failed to create store", error, { userId: req.user?.id });
    ApiResponseHelper.error(res, "Failed to create store", 500, error);
  }
}

