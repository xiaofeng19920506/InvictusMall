/**
 * Utility functions for owner permission checks and data filtering
 */

import { StaffModel } from '../models/StaffModel';
import { AuthenticatedRequest } from '../middleware/auth';

const staffModel = new StaffModel();

/**
 * Get store IDs that the authenticated user has access to
 * - Admin: returns null (has access to all stores)
 * - Owner: returns array of store IDs they own
 * - Other roles: returns empty array
 */
export async function getAccessibleStoreIds(
  req: AuthenticatedRequest
): Promise<string[] | null> {
  // Check if user is authenticated staff
  if (!req.staff) {
    return [];
  }

  const { role, id } = req.staff;

  // Admin has access to all stores
  if (role === 'admin') {
    return null; // null means no filter (all stores)
  }

  // Owner has access only to their stores
  if (role === 'owner') {
    return await staffModel.getStoreIdsByOwnerId(id);
  }

  // Other roles (manager, employee) have access to their assigned store
  if (role === 'manager' || role === 'employee') {
    const staff = await staffModel.getStaffById(id);
    return staff?.storeId ? [staff.storeId] : [];
  }

  // Default: no access
  return [];
}

/**
 * Check if user has access to a specific store
 */
export async function hasStoreAccess(
  req: AuthenticatedRequest,
  storeId: string
): Promise<boolean> {
  const accessibleStoreIds = await getAccessibleStoreIds(req);

  // Admin has access to all stores
  if (accessibleStoreIds === null) {
    return true;
  }

  // Check if storeId is in accessible stores
  return accessibleStoreIds.includes(storeId);
}

