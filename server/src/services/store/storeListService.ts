import { Request, Response } from "express";
import { StoreService } from "../storeService";
import { StoreModel } from "../../models/StoreModel";
import { ProductModel } from "../../models/ProductModel";
import { StaffModel } from "../../models/StaffModel";
import { Store } from "../../types/store";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { handleETagValidation } from "../../utils/cacheUtils";
import { getAccessibleStoreIds } from "../../utils/ownerPermissions";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function handleGetAllStores(
  req: Request,
  res: Response,
  storeService: StoreService
): Promise<void> {
  try {
    const { category, search, searchType, limit, offset } = req.query;
    const authReq = req as AuthenticatedRequest;

    // Get accessible store IDs for owner filtering
    const accessibleStoreIds = await getAccessibleStoreIds(authReq);

    // Generate ETag based on last modified timestamp
    const lastModified = await StoreModel.getLastModifiedTimestamp();
    const cacheKey = `${category || ""}-${search || ""}-${searchType || ""}-${limit || ""}-${offset || ""}-${accessibleStoreIds?.join(",") || "all"}`;

    // Check ETag validation (returns true if 304 was sent)
    if (handleETagValidation(req, res, lastModified, cacheKey)) {
      return; // 304 Not Modified already sent
    }

    // Use pagination if limit is provided (typically for admin app)
    if (limit !== undefined && !search && !category) {
      const { stores, total } = await StoreModel.findAllWithPagination({
        limit: parseInt(limit as string) || undefined,
        offset: offset !== undefined ? parseInt(offset as string) : undefined,
        storeIds: accessibleStoreIds || undefined, // Filter by accessible stores
      });

      // Add owner information to each store
      const staffModel = new StaffModel();
      const storesWithOwner = await Promise.all(
        stores.map(async (store) => {
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
            return {
              ...store,
              owner: ownerInfo,
            } as any;
          } catch (error) {
            // Silently fail - owner info is optional
            return {
              ...store,
              owner: null,
            } as any;
          }
        })
      );

      ApiResponseHelper.successWithPagination(res, storesWithOwner, total);
      return;
    }

    // Regular fetch without pagination (for client app or when category/search is provided)
    let stores: Store[] = [];
    
    // Handle product search - find stores that have matching products
    if (search && typeof search === "string" && searchType === "Products") {
      const products = await ProductModel.search(search);
      const storeIds = [...new Set(products.map(p => p.storeId))];
      
      if (storeIds.length === 0) {
        stores = [];
      } else {
        // Fetch stores that have matching products
        const allStores = await storeService.getAllStores();
        stores = allStores.filter(store => storeIds.includes(store.id));
      }
    } else if (search && typeof search === "string" && searchType === "All") {
      // Search both stores and products, then combine unique stores
      const [foundStores, products] = await Promise.all([
        storeService.searchStores(search),
        ProductModel.search(search)
      ]);
      
      const productStoreIds = [...new Set(products.map(p => p.storeId))];
      const allStores = await storeService.getAllStores();
      const storesWithProducts = allStores.filter(store => productStoreIds.includes(store.id));
      
      // Combine and deduplicate stores
      const combinedStores: Store[] = [...foundStores];
      storesWithProducts.forEach(store => {
        if (!combinedStores.find(s => s.id === store.id)) {
          combinedStores.push(store);
        }
      });
      
      stores = combinedStores;
    } else if (search && typeof search === "string") {
      // Regular store search (searchType is "Store")
      stores = await storeService.searchStores(search);
    } else if (category && typeof category === "string") {
      stores = await storeService.getStoresByCategory(category);
    } else {
      stores = await storeService.getAllStores();
    }

    // Filter stores by accessible store IDs for owner
    if (accessibleStoreIds !== null && accessibleStoreIds.length > 0) {
      stores = stores.filter(store => accessibleStoreIds.includes(store.id));
    }

    // Add owner information to each store
    const staffModel = new StaffModel();
    const storesWithOwner = await Promise.all(
      stores.map(async (store) => {
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
          return {
            ...store,
            owner: ownerInfo,
          } as any;
        } catch (error) {
          // Silently fail - owner info is optional
          return {
            ...store,
            owner: null,
          } as any;
        }
      })
    );

    ApiResponseHelper.successWithCount(res, storesWithOwner, storesWithOwner.length);
  } catch (error) {
    logger.error("Error fetching stores", error);
    ApiResponseHelper.error(res, "Failed to fetch stores", 500, error);
  }
}

