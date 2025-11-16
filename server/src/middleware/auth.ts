import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/UserModel";
import { StaffModel } from "../models/StaffModel";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

type AuthType = "user" | "staff";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  staff?: {
    id: string;
    email: string;
    role: string;
  };
  authType?: AuthType;
}

class AuthError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const userModel = new UserModel();
const staffModel = new StaffModel();

const getBearerToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return undefined;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
};

const getUserToken = (req: Request): string | undefined => {
  return req.cookies?.auth_token || getBearerToken(req);
};

const getStaffToken = (req: Request): string | undefined => {
  return req.cookies?.staff_auth_token || getBearerToken(req);
};

const verifyJwt = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new AuthError(401, "Invalid or expired token");
  }
};

const hydrateUserFromToken = async (
  req: AuthenticatedRequest,
  decoded: any
): Promise<void> => {
  if (!decoded?.userId) {
    throw new AuthError(401, "Invalid token payload");
  }

  const user = await userModel.getActiveUserById(decoded.userId);
  if (!user) {
    throw new AuthError(401, "Invalid or expired token");
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  req.staff = undefined;
  req.authType = "user";
};

const hydrateStaffFromToken = async (
  req: AuthenticatedRequest,
  decoded: any
): Promise<void> => {
  if (!decoded?.staffId) {
    throw new AuthError(401, "Invalid staff token");
  }

  const staff = await staffModel.getStaffById(decoded.staffId);
  if (!staff || !staff.isActive) {
    throw new AuthError(401, "Invalid or expired token");
  }

  req.staff = {
    id: staff.id,
    email: staff.email,
    role: staff.role,
  };

  // For compatibility with existing code that reads req.user
  req.user = {
    id: staff.id,
    email: staff.email,
    role: staff.role,
  };

  req.authType = "staff";
};

const verifyUserToken = async (req: AuthenticatedRequest): Promise<void> => {
  const token = getUserToken(req);

  if (!token) {
    throw new AuthError(401, "Access token required");
  }

  const decoded = verifyJwt(token);

  if (decoded?.type === "staff") {
    throw new AuthError(403, "Staff token cannot access this resource");
  }

  await hydrateUserFromToken(req, decoded);
};

const verifyStaffToken = async (req: AuthenticatedRequest): Promise<void> => {
  const token = getStaffToken(req);

  if (!token) {
    throw new AuthError(401, "Access token required");
  }

  const decoded = verifyJwt(token);

  if (decoded?.type !== "staff") {
    throw new AuthError(403, "User token cannot access this resource");
  }

  await hydrateStaffFromToken(req, decoded);
};

const handleAuthError = (res: Response, error: unknown): void => {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error("Authentication error:", error);
  res.status(401).json({
    success: false,
    message: "Invalid or expired token",
  });
};

export const authenticateUserToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await verifyUserToken(req);
    next();
  } catch (error) {
    handleAuthError(res, error);
  }
};

export const authenticateStaffToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await verifyStaffToken(req);
    next();
  } catch (error) {
    handleAuthError(res, error);
  }
};

export const authenticateAnyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from any source (prefer cookies, fallback to Bearer)
    const staffCookieToken = req.cookies?.staff_auth_token;
    const userCookieToken = req.cookies?.auth_token;
    const bearerToken = getBearerToken(req);
    
    // Determine which token to use
    let token: string | undefined;
    
    if (staffCookieToken) {
      token = staffCookieToken;
    } else if (userCookieToken) {
      token = userCookieToken;
    } else if (bearerToken) {
      token = bearerToken;
    }
    
    if (!token) {
      throw new AuthError(401, "Access token required");
    }
    
    // Decode token to determine type
    let decoded: any;
    try {
      decoded = verifyJwt(token);
    } catch (jwtError) {
      throw new AuthError(401, "Invalid or expired token");
    }
    
    // Verify based on token type
    if (decoded?.type === "staff" || decoded?.staffId) {
      // It's a staff token - verify as staff
      // Set the token in cookies if it came from Bearer header
      if (!staffCookieToken && bearerToken) {
        if (!req.cookies) req.cookies = {};
        req.cookies.staff_auth_token = bearerToken;
      }
      await verifyStaffToken(req);
      console.log(`[authenticateAnyToken] Authenticated as staff. Role: ${req.user?.role}, ID: ${req.user?.id}`);
    } else if (decoded?.userId) {
      // It's a user token - verify as user
      // Set the token in cookies if it came from Bearer header
      if (!userCookieToken && bearerToken) {
        if (!req.cookies) req.cookies = {};
        req.cookies.auth_token = bearerToken;
      }
      await verifyUserToken(req);
      console.log(`[authenticateAnyToken] Authenticated as user. Role: ${req.user?.role}, ID: ${req.user?.id}`);
    } else {
      throw new AuthError(401, "Invalid token payload");
    }
    
    next();
  } catch (error) {
    handleAuthError(res, error);
  }
};

export const authenticateToken = authenticateAnyToken;

export const requireRole = (roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      console.log(`[requireRole] Access denied. User role: ${req.user.role}, Required roles: ${roles.join(', ')}`);
      res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        userRole: req.user.role,
        requiredRoles: roles,
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireStoreOwner = requireRole(["owner", "admin"]);
export const requireCustomer = requireRole(["customer"]);