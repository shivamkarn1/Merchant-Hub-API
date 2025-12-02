import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import Status from "../../utils/HttpStatusCodes";
import { asyncHandler } from "../../utils/asyncHandler";
import { zodToApiError } from "../../utils/handleZodError";
import * as authService from "../../services/auth/auth.service";
import {
  registerUserSchema,
  loginSchema,
  updateUserSchema,
  changePasswordSchema,
  grantPermissionSchema,
  getUsersQuerySchema,
} from "./auth.validation";

// AUTHENTICATION CONTROLLERS

/**
 * Register a new user (public registration for customers)
 */
export const register = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = registerUserSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw zodToApiError(parseResult.error);
    }

    // Public registration only allows customer role
    const data = {
      ...parseResult.data,
      role: "customer" as const,
    };

    const user = await authService.registerUser(data);

    return res
      .status(Status.Created)
      .json(new ApiResponse(Status.Created, user, "Registration successful"));
  }
);

/**
 * Create user (admin only - can create any role)
 */
export const createUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = registerUserSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw zodToApiError(parseResult.error);
    }

    const user = await authService.registerUser(parseResult.data, req.user?.id);

    return res
      .status(Status.Created)
      .json(new ApiResponse(Status.Created, user, "User created successfully"));
  }
);

/**
 * Login
 */
export const login = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = loginSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw zodToApiError(parseResult.error);
    }

    const result = await authService.loginUser(parseResult.data);

    return res
      .status(Status.OK)
      .json(new ApiResponse(Status.OK, result, "Login successful"));
  }
);

/**
 * Refresh token
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(Status.BadRequest, "Refresh token is required");
    }

    const result = await authService.refreshAccessToken(refreshToken);

    return res
      .status(Status.OK)
      .json(new ApiResponse(Status.OK, result, "Token refreshed successfully"));
  }
);

/**
 * Logout (client should discard tokens)
 */
export const logout = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // In a production app, you might want to:
    // 1. Add the token to a blacklist in Redis
    // 2. Clear any session data
    // For now, we just return success (client should discard tokens)

    return res
      .status(Status.OK)
      .json(new ApiResponse(Status.OK, null, "Logout successful"));
  }
);

// USER PROFILE CONTROLLERS

/**
 * Get current user profile
 */
export const getMe = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(Status.Unauthorized, "Authentication required");
    }

    const user = await authService.getCurrentUser(req.user.id);

    return res
      .status(Status.OK)
      .json(new ApiResponse(Status.OK, user, "Profile retrieved successfully"));
  }
);

/**
 * Update current user profile
 */
export const updateMe = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(Status.Unauthorized, "Authentication required");
    }

    const parseResult = updateUserSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw zodToApiError(parseResult.error);
    }

    // Users can only update certain fields for themselves
    const allowedFields = {
      email: parseResult.data.email,
      name: parseResult.data.name,
    };

    const user = await authService.updateUser(
      req.user.id,
      allowedFields,
      req.user
    );

    return res
      .status(Status.OK)
      .json(new ApiResponse(Status.OK, user, "Profile updated successfully"));
  }
);

/**
 * Change password
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(Status.Unauthorized, "Authentication required");
    }

    const parseResult = changePasswordSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw zodToApiError(parseResult.error);
    }

    const result = await authService.changePassword(
      req.user.id,
      parseResult.data
    );

    return res
      .status(Status.OK)
      .json(
        new ApiResponse(Status.OK, result, "Password changed successfully")
      );
  }
);

// USER MANAGEMENT CONTROLLERS (Admin)

/**
 * Get all users
 */
export const getUsers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(Status.Unauthorized, "Authentication required");
    }

    const parseResult = getUsersQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      throw zodToApiError(parseResult.error);
    }

    const result = await authService.getUsers(parseResult.data, req.user);

    return res
      .status(Status.OK)
      .json(new ApiResponse(Status.OK, result, "Users retrieved successfully"));
  }
);

/**
 * Get user by ID
 */
export const getUserById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(Status.Unauthorized, "Authentication required");
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ApiError(Status.BadRequest, "Invalid user ID");
    }

    const user = await authService.getUserById(userId, req.user);

    return res
      .status(Status.OK)
      .json(new ApiResponse(Status.OK, user, "User retrieved successfully"));
  }
);

/**
 * Update user by ID
 */
export const updateUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(Status.Unauthorized, "Authentication required");
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ApiError(Status.BadRequest, "Invalid user ID");
    }

    const parseResult = updateUserSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw zodToApiError(parseResult.error);
    }

    const user = await authService.updateUser(
      userId,
      parseResult.data,
      req.user
    );

    return res
      .status(Status.OK)
      .json(new ApiResponse(Status.OK, user, "User updated successfully"));
  }
);

/**
 * Delete user by ID
 */
export const deleteUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(Status.Unauthorized, "Authentication required");
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ApiError(Status.BadRequest, "Invalid user ID");
    }

    const result = await authService.deleteUser(userId, req.user);

    return res
      .status(Status.OK)
      .json(new ApiResponse(Status.OK, result, "User deleted successfully"));
  }
);

/**
 * Grant or revoke permission
 */
export const managePermission = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(Status.Unauthorized, "Authentication required");
    }

    const parseResult = grantPermissionSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw zodToApiError(parseResult.error);
    }

    const result = await authService.grantPermission(
      parseResult.data,
      req.user
    );

    return res
      .status(Status.OK)
      .json(
        new ApiResponse(Status.OK, result, "Permission updated successfully")
      );
  }
);

/**
 * Get user permissions
 */
export const getUserPermissions = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(Status.Unauthorized, "Authentication required");
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new ApiError(Status.BadRequest, "Invalid user ID");
    }

    // Get the user to check their role
    const user = await authService.getUserById(userId, req.user);
    const permissions = await authService.getUserPermissions(
      userId,
      user.role as any
    );

    return res
      .status(Status.OK)
      .json(
        new ApiResponse(
          Status.OK,
          { user_id: userId, permissions },
          "Permissions retrieved successfully"
        )
      );
  }
);
