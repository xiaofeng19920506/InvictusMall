import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/UserModel';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to get token from HTTP-only cookie first
    let token = req.cookies.auth_token || req.cookies.staff_auth_token;
    
    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if this is a staff token or user token
    if (decoded.type === 'staff') {
      // Handle staff authentication
      const { StaffModel } = await import('../models/StaffModel');
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(decoded.staffId);
      
      if (!staff || !staff.isActive) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
        return;
      }

      req.user = {
        id: staff.id,
        email: staff.email,
        role: staff.role
      };
    } else {
      // Handle regular user authentication
      const userModel = new UserModel();
      const user = await userModel.getUserById(decoded.userId);
      
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
        return;
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireStoreOwner = requireRole(['store_owner', 'admin']);
export const requireCustomer = requireRole(['customer', 'admin', 'store_owner']);