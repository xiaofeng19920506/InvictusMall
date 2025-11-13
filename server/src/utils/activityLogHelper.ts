import { AuthenticatedRequest } from '../middleware/auth';
import { StaffModel } from '../models/StaffModel';

const staffModel = new StaffModel();

/**
 * Get user name from authenticated request
 * Returns the full name (firstName lastName) of the user/staff
 */
export async function getUserNameFromRequest(req: AuthenticatedRequest): Promise<string | undefined> {
  if (req.staff) {
    // For staff, get full name from database
    try {
      const staff = await staffModel.getStaffById(req.staff.id);
      if (staff) {
        return `${staff.firstName} ${staff.lastName}`;
      }
    } catch (error) {
      console.error('Error fetching staff name for activity log:', error);
    }
    // Fallback to email if staff not found
    return req.staff.email;
  }
  
  if (req.user) {
    // For regular users, we might need to fetch from UserModel
    // For now, return email as fallback
    return req.user.email;
  }
  
  return undefined;
}

/**
 * Get user ID from authenticated request
 */
export function getUserIdFromRequest(req: AuthenticatedRequest): string | undefined {
  return req.staff?.id || req.user?.id;
}

