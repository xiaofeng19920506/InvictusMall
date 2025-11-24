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
  } catch (error: any) {
    // Provide more specific error messages
    if (error.name === 'TokenExpiredError') {
      throw new AuthError(401, "Token expired. Please log in again.");
    } else if (error.name === 'JsonWebTokenError') {
      throw new AuthError(401, "Invalid token format.");
    }
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

  try {
    const user = await userModel.getActiveUserById(decoded.userId);
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    req.staff = undefined;
    req.authType = "user";
  } catch (error: any) {
    // If user not found as active, check if user exists but is inactive
    if (error.message === "User not found") {
      try {
        const inactiveUser = await userModel.getUserById(decoded.userId);
        if (inactiveUser && !inactiveUser.isActive) {
          throw new AuthError(403, "Account is inactive. Please contact support.");
        }
        // User exists but something else is wrong
        throw new AuthError(401, "Invalid or expired token");
      } catch (inactiveCheckError: any) {
        // If getUserById also fails, user doesn't exist
        if (inactiveCheckError instanceof AuthError) {
          throw inactiveCheckError;
        }
        throw new AuthError(401, "Invalid or expired token");
      }
    }
    // Re-throw if it's already an AuthError
    if (error instanceof AuthError) {
      throw error;
    }
    // Otherwise, user doesn't exist
    throw new AuthError(401, "Invalid or expired token");
  }
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
    
    // Debug logging
    console.log("[authenticateAnyToken] Token sources:", {
      hasStaffCookie: !!staffCookieToken,
      hasUserCookie: !!userCookieToken,
      hasBearerToken: !!bearerToken,
      cookies: req.cookies ? Object.keys(req.cookies) : 'no cookies',
      cookieNames: req.cookies ? Object.keys(req.cookies).join(', ') : 'none',
      authHeader: req.headers.authorization ? 'present' : 'missing',
      url: req.url,
      method: req.method,
    });
    
    // Determine which token to use
    // Priority: staff token (cookie or bearer) > bearer token (any) > user token
    // This ensures admin/staff tokens are preferred over customer tokens
    let token: string | undefined;
    let tokenSource: string = 'none';
    
    // First, check if bearer token is a staff token (highest priority)
    if (bearerToken) {
      try {
        const decodedBearer = jwt.decode(bearerToken) as any;
        if (decodedBearer?.type === "staff" || decodedBearer?.staffId) {
          token = bearerToken;
          tokenSource = 'bearer (staff)';
          console.log("[authenticateAnyToken] Using Bearer token (staff) - highest priority");
        }
      } catch (decodeError) {
        // Ignore decode errors, will check other sources
      }
    }
    
    // If no staff bearer token, check staff cookie
    if (!token && staffCookieToken) {
      token = staffCookieToken;
      tokenSource = 'staff cookie';
      console.log("[authenticateAnyToken] Using staff cookie token");
    }
    
    // If still no token, use bearer token (even if it's a user token)
    if (!token && bearerToken) {
      token = bearerToken;
      tokenSource = 'bearer (any)';
      console.log("[authenticateAnyToken] Using Bearer token");
    }
    
    // Last resort: use user cookie token
    if (!token && userCookieToken) {
      token = userCookieToken;
      tokenSource = 'user cookie';
      console.log("[authenticateAnyToken] Using user cookie token (fallback)");
    }
    
    if (!token) {
      console.error("[authenticateAnyToken] No token found in request");
      throw new AuthError(401, "Access token required");
    }
    
    // Decode token to determine type
    let decoded: any;
    try {
      decoded = verifyJwt(token);
    } catch (jwtError: any) {
      console.error("[authenticateAnyToken] JWT verification failed:", jwtError.message);
      throw new AuthError(401, "Invalid or expired token");
    }
    
    // Verify based on token type - directly hydrate since we already have the decoded token
    if (decoded?.type === "staff" || decoded?.staffId) {
      // It's a staff token - hydrate directly
      try {
        await hydrateStaffFromToken(req, decoded);
        console.log(`[authenticateAnyToken] Authenticated as staff. Role: ${req.user?.role}, ID: ${req.user?.id}`);
      } catch (error: any) {
        console.error("[authenticateAnyToken] Staff hydration failed:", error.message);
        throw error;
      }
    } else if (decoded?.userId) {
      // It's a user token - hydrate directly
      try {
        await hydrateUserFromToken(req, decoded);
        console.log(`[authenticateAnyToken] Authenticated as user. Role: ${req.user?.role}, ID: ${req.user?.id}`);
      } catch (error: any) {
        console.error("[authenticateAnyToken] User hydration failed:", error.message, "userId:", decoded.userId);
        throw error;
      }
    } else {
      console.error("[authenticateAnyToken] Invalid token payload - missing userId or staffId. Decoded:", JSON.stringify(decoded));
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