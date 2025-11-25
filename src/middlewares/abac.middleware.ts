import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import Status from "../utils/HttpStatusCodes";
import { Role, AccessContext } from "../types/auth.types";

/*
  Attribute-Based Access Control Rules
  Determines if user can access specific resource based on attributes
 */
export class ABACPolicy {
  /*
    Check if user can access a resource based on ownership
   */
  static canAccessResource(context: AccessContext): boolean {
    const { user, resourceOwnerId, resourceMerchantId, action } = context;

    // Super admin can access everything
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Admin can access resources in their hierarchy
    if (user.role === Role.ADMIN) {
      // Admin can access their own resources
      if (resourceOwnerId === user.id) return true;

      // Admin can access resources of their merchants
      if (user.id === resourceMerchantId) return true;

      return true; // Admin can see all for now, refine based on your needs
    }

    // Merchant can only access their own resources
    if (user.role === Role.MERCHANT) {
      return (
        resourceOwnerId === user.id ||
        resourceMerchantId === user.merchant_id ||
        resourceMerchantId === user.id
      );
    }

    // ✅ FIXED: Customer ownership validation
    // Customer can only access their own resources
    if (user.role === Role.CUSTOMER) {
      // For orders, customer_id is the owner
      // Customers can only cancel/read/update their own orders
      return resourceOwnerId === user.id;
    }

    // Viewer can read but not modify
    if (user.role === Role.VIEWER) {
      return action === "read";
    }

    return false;
  }

  /*
   Enhanced ownership validation specifically for cancel operations
    This is called before allowing cancel operations
   */
  static canCancelResource(context: AccessContext): boolean {
    const { user, resourceOwnerId, resourceMerchantId } = context;

    // Super admin can cancel anything
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Admin can cancel any order
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Merchant can cancel orders in their merchant scope
    if (user.role === Role.MERCHANT) {
      return (
        resourceMerchantId === user.merchant_id ||
        resourceMerchantId === user.id
      );
    }
    // Customer can cancel only their orders.
    if (user.role === Role.CUSTOMER) {
      return resourceOwnerId === user.id;
    }

    return false;
  }

  /*
   Get data filter for queries based on user attributes
    This is used to filter data at query level
   */
  static getDataFilter(user: any) {
    switch (user.role) {
      case Role.SUPER_ADMIN:
        // No filter - can see everything
        return {};

      case Role.ADMIN:
        // Can see all data (or filtered by their organization)
        // Later this can be refined based on parend_user_id or organization
        return {};

      case Role.MERCHANT:
        // Can only see their own data
        return {
          merchant_id: user.merchant_id || user.id,
        };

      case Role.CUSTOMER:
        // Can only see data related to them
        return {
          customer_id: user.id,
        };

      case Role.VIEWER:
        // Can see all but with read-only access
        return {};

      default:
        // Deny all by default
        return { id: -1 }; // Impossible filter
    }
  }
}

// just A Helper Function
export type GetResourceOwnerFn = (resourceId: number) => Promise<{
  ownerId: number;
  merchantId: number;
}>;
/*
  Middleware to check resource ownership
 */
export const checkResourceOwnership = (
  resourceIdParam: string = "id",
  getResourceOwner: GetResourceOwnerFn
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ApiError(Status.Unauthorized, "Authentication required");
      }

      const resourceId = parseInt(req.params[resourceIdParam]);

      if (isNaN(resourceId)) {
        throw new ApiError(Status.BadRequest, "Invalid resource ID");
      }

      const { ownerId, merchantId } = await getResourceOwner(resourceId);

      const context: AccessContext = {
        user: req.user,
        resourceOwnerId: ownerId,
        resourceMerchantId: merchantId,
        action: req.method.toLowerCase(),
      };

      const canAccess = ABACPolicy.canAccessResource(context);

      if (!canAccess) {
        throw new ApiError(
          Status.Forbidden,
          "You don't have access to this resource"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * ✅ NEW: Middleware specifically for cancel operations with ownership validation
 */
export const checkCancelOwnership = (
  resourceIdParam: string = "id",
  getResourceOwner: (resourceId: number) => Promise<{
    ownerId: number;
    merchantId: number;
  }>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ApiError(Status.Unauthorized, "Authentication required");
      }

      const resourceId = parseInt(req.params[resourceIdParam]);

      if (isNaN(resourceId)) {
        throw new ApiError(Status.BadRequest, "Invalid resource ID");
      }

      const { ownerId, merchantId } = await getResourceOwner(resourceId);

      const context: AccessContext = {
        user: req.user,
        resourceOwnerId: ownerId,
        resourceMerchantId: merchantId,
        action: "cancel",
      };

      // Use specific cancel validation
      const canCancel = ABACPolicy.canCancelResource(context);

      if (!canCancel) {
        throw new ApiError(
          Status.Forbidden,
          "You don't have permission to cancel this resource"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
