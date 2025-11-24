import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import Status from "../utils/HttpStatusCodes";
import { Role, Permission } from "../types/auth.types";
import { db } from "../db/db";
import { userPermissionsTable } from "../db/schema";
import { eq, and } from "drizzle-orm";

// Role hierarchy - higher roles inherit lower role permissions
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 5,
  [Role.ADMIN]: 4,
  [Role.MERCHANT]: 3,
  [Role.CUSTOMER]: 2,
  [Role.VIEWER]: 1,
};

// Default role-based permissions
const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // All permissions
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_UPDATE,
    Permission.PRODUCTS_DELETE,
    Permission.ORDERS_CREATE,
    Permission.ORDERS_READ,
    Permission.ORDERS_UPDATE,
    Permission.ORDERS_DELETE,
    Permission.ORDERS_CANCEL,
    Permission.USERS_CREATE,
    Permission.USERS_READ,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
  ],
  [Role.ADMIN]: [
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_UPDATE,
    Permission.PRODUCTS_DELETE,
    Permission.ORDERS_READ,
    Permission.ORDERS_UPDATE,
    Permission.ORDERS_CANCEL,
    Permission.USERS_READ,
  ],
  [Role.MERCHANT]: [
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_UPDATE,
    Permission.ORDERS_READ,
    Permission.ORDERS_UPDATE,
    Permission.ORDERS_CANCEL,
  ],
  [Role.CUSTOMER]: [
    Permission.PRODUCTS_READ,
    Permission.ORDERS_CREATE,
    Permission.ORDERS_READ,
    Permission.ORDERS_CANCEL,
  ],
  [Role.VIEWER]: [Permission.PRODUCTS_READ, Permission.ORDERS_READ],
};

/*
 -> Check if user has required permission
 -> Combines role-based and user-specific permissions
 */
async function hasPermission(
  userId: number,
  role: Role,
  requiredPermission: Permission
): Promise<boolean> {
  // FIrst of all Simplest check Super admin has all permissions
  if (role === Role.SUPER_ADMIN) {
    return true;
  }

  // Check default role permissions
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

  // Check user-specific permission overrides from DB
  const userPermissionOverrides = await db
    .select()
    .from(userPermissionsTable)
    .where(eq(userPermissionsTable.user_id, userId));

  // Build final permission set
  let hasAccess = rolePermissions.includes(requiredPermission);

  // Apply user-specific overrides
  for (const override of userPermissionOverrides) {
    if (override.permission === requiredPermission) {
      hasAccess = override.granted;
    }
  }

  return hasAccess;
}

/*
  Middleware to check if user has required permission
 */
export const requirePermission = (...permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ApiError(Status.Unauthorized, "Authentication required");
      }

      const { id, role } = req.user;

      // Check if user has at least one of the required permissions
      const hasAnyPermission = await Promise.all(
        permissions.map((perm) => hasPermission(id, role as Role, perm))
      );

      if (!hasAnyPermission.some((result) => result)) {
        throw new ApiError(
          Status.Forbidden,
          "Insufficient permissions to perform this action"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/*
  Middleware to check if user has required role
 */
export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ApiError(Status.Unauthorized, "Authentication required");
      }

      const userRole = req.user.role as Role;
      if (!roles.includes(userRole)) {
        // Check role hierarchy - higher roles can access lower role endpoints
        const userRoleLevel = ROLE_HIERARCHY[userRole];
        const requiredLevel = Math.max(
          ...roles.map((r) => ROLE_HIERARCHY[r] || 0)
        );

        if (userRoleLevel < requiredLevel) {
          throw new ApiError(
            Status.Forbidden,
            "Insufficient role to perform this action"
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
