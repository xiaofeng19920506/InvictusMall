import { Request, Response } from "express";
import { StoreService } from "../storeService";
import { StaffModel } from "../../models/StaffModel";
import { ActivityLogModel } from "../../models/ActivityLogModel";
import { getUserNameFromRequest, getUserIdFromRequest } from "../../utils/activityLogHelper";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleUpdateStore(
  req: Request,
  res: Response,
  storeService: StoreService
): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      ApiResponseHelper.validationError(res, "Store ID is required");
      return;
    }

    const { ownerId, ...storeUpdateData } = req.body;
    const store = await storeService.updateStore(id, storeUpdateData);

    // Handle owner change if ownerId is provided
    if (ownerId !== undefined) {
      try {
        const staffModel = new StaffModel();

        // Get current owner
        const currentOwner = await staffModel.getOwnerByStoreId(id);

        // If there's a current owner and it's different from the new owner, unlink the current owner
        if (currentOwner && currentOwner.id !== ownerId) {
          await staffModel.updateStaff(currentOwner.id, { storeId: undefined });
        }

        // If a new owner is specified, link them to the store
        if (ownerId) {
          const newOwner = await staffModel.getStaffById(ownerId);
          if (newOwner) {
            // Verify the new owner has the 'owner' or 'admin' role
            if (newOwner.role !== "owner" && newOwner.role !== "admin") {
              logger.warn(`Staff member ${ownerId} is not an owner or admin, skipping store assignment`, {
                ownerId,
                storeId: id,
              });
            } else {
              // Update the new owner's storeId to link them to the store
              await staffModel.updateStaff(ownerId, { storeId: id });
            }
          } else {
            logger.warn(`Owner with ID ${ownerId} not found, skipping store assignment`, {
              ownerId,
              storeId: id,
            });
          }
        }
      } catch (ownerError) {
        // Log the error but don't fail the store update
        logger.error("Error updating store owner", ownerError, { storeId: id, ownerId });
      }
    }

    // Fetch the updated store with owner information included
    let storeWithOwner = { ...store };
    try {
      const staffModel = new StaffModel();
      const owner = await staffModel.getOwnerByStoreId(id);
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
      logger.warn("Failed to fetch store owner after update", { storeId: id, error });
    }

    // Log the activity
    const userId = getUserIdFromRequest(req as AuthenticatedRequest);
    const userName = await getUserNameFromRequest(req as AuthenticatedRequest);
    await ActivityLogModel.createLog({
      type: "store_updated",
      message: `Store "${store.name}" information has been updated`,
      storeName: store.name,
      storeId: store.id,
      userId,
      userName,
      metadata: {
        updatedFields: Object.keys(req.body),
        categories: store.category,
        rating: store.rating,
        isVerified: store.isVerified,
        ownerId: ownerId !== undefined ? ownerId : undefined,
      },
    });

    ApiResponseHelper.success(res, storeWithOwner, "Store updated successfully");
  } catch (error) {
    logger.error("Error updating store", error, { storeId: req.params.id });
    const statusCode =
      error instanceof Error && "statusCode" in error ? (error as any).statusCode : 500;
    ApiResponseHelper.error(
      res,
      error instanceof Error ? error.message : "Unknown error",
      statusCode,
      error
    );
  }
}

