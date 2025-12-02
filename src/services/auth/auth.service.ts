import { db } from "../../db/db";
import { usersTable, userPermissionsTable } from "../../db/schema";
import { eq, and, ilike, or, sql, count } from "drizzle-orm";
import { ApiError } from "../../utils/ApiError";
import Status from "../../utils/HttpStatusCodes";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { Role, Permission, AuthUser } from "../../types/auth.types";
import {
  RegisterUserInput,
  LoginInput,
  UpdateUserInput,
  ChangePasswordInput,
  GrantPermissionInput,
  GetUsersQuery,
} from "../../controllers/auth/auth.validation";

const SALT_ROUNDS = 12;
const JWT_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY = "30d";

// AUTHENTICATION SERVICES

/**
 * Register a new user
 */
export async function registerUser(
  data: RegisterUserInput,
  creatorId?: number
) {
  // Check if email already exists
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, data.email.toLowerCase()))
    .limit(1);

  if (existingUser.length > 0) {
    throw new ApiError(Status.Conflict, "Email already registered");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Determine merchant_id based on role
  let merchantId = data.merchant_id || null;
  let parentUserId = data.parent_user_id || creatorId || null;

  // Insert user
  const [newUser] = await db
    .insert(usersTable)
    .values({
      email: data.email.toLowerCase(),
      password: hashedPassword,
      name: data.name,
      role: data.role as any,
      merchant_id: merchantId,
      parent_user_id: parentUserId,
      is_active: true,
      is_verified: false,
    })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      merchant_id: usersTable.merchant_id,
      is_active: usersTable.is_active,
      is_verified: usersTable.is_verified,
      created_at: usersTable.created_at,
    });

  return newUser;
}

/**
 * Login user and return tokens
 */
export async function loginUser(data: LoginInput) {
  // Find user by email
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, data.email.toLowerCase()))
    .limit(1);

  if (!user) {
    throw new ApiError(Status.Unauthorized, "Invalid email or password");
  }

  // Check if user is active
  if (!user.is_active) {
    throw new ApiError(
      Status.Forbidden,
      "Your account has been deactivated. Please contact support."
    );
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(data.password, user.password);
  if (!isValidPassword) {
    throw new ApiError(Status.Unauthorized, "Invalid email or password");
  }

  // Get user permissions
  const userPermissions = await getUserPermissions(user.id, user.role as Role);

  // Create JWT payload
  const tokenPayload: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    merchant_id: user.merchant_id,
    parent_user_id: user.parent_user_id,
    is_active: user.is_active,
    permissions: userPermissions,
  };

  // Generate tokens
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ id: user.id });

  // Update last login
  await db
    .update(usersTable)
    .set({ last_login: new Date() })
    .where(eq(usersTable.id, user.id));

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      merchant_id: user.merchant_id,
      is_verified: user.is_verified,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRY,
    },
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError(Status.InternalServerError, "JWT secret not configured");
  }

  try {
    const decoded = jwt.verify(refreshToken, secret) as { id: number };

    // Get fresh user data
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.id))
      .limit(1);

    if (!user || !user.is_active) {
      throw new ApiError(Status.Unauthorized, "Invalid refresh token");
    }

    const userPermissions = await getUserPermissions(
      user.id,
      user.role as Role
    );

    const tokenPayload: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      merchant_id: user.merchant_id,
      parent_user_id: user.parent_user_id,
      is_active: user.is_active,
      permissions: userPermissions,
    };

    const accessToken = generateAccessToken(tokenPayload);

    return {
      accessToken,
      expiresIn: JWT_EXPIRY,
    };
  } catch (error) {
    throw new ApiError(Status.Unauthorized, "Invalid or expired refresh token");
  }
}

// USER MANAGEMENT SERVICES

/**
 * Get current user profile
 */
export async function getCurrentUser(userId: number) {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      merchant_id: usersTable.merchant_id,
      parent_user_id: usersTable.parent_user_id,
      is_active: usersTable.is_active,
      is_verified: usersTable.is_verified,
      last_login: usersTable.last_login,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    throw new ApiError(Status.NotFound, "User not found");
  }

  // Get user's permissions
  const permissions = await getUserPermissions(user.id, user.role as Role);

  return { ...user, permissions };
}

/**
 * Get all users (with filters and pagination)
 */
export async function getUsers(query: GetUsersQuery, requestingUser: AuthUser) {
  const { limit, offset, role, is_active, search } = query;

  // Build conditions based on requesting user's role
  const conditions: any[] = [];

  // Role-based filtering
  if (requestingUser.role === Role.MERCHANT) {
    // Merchants can only see users under them
    conditions.push(
      or(
        eq(usersTable.merchant_id, requestingUser.id),
        eq(usersTable.parent_user_id, requestingUser.id)
      )
    );
  } else if (requestingUser.role === Role.ADMIN) {
    // Admins can see users under their hierarchy
    // For simplicity, showing all non-super_admin users
    conditions.push(sql`${usersTable.role} != 'super_admin'`);
  }
  // Super admins can see all users

  // Apply filters
  if (role) {
    conditions.push(eq(usersTable.role, role as any));
  }

  if (is_active !== undefined) {
    conditions.push(eq(usersTable.is_active, is_active));
  }

  if (search) {
    conditions.push(
      or(
        ilike(usersTable.email, `%${search}%`),
        ilike(usersTable.name, `%${search}%`)
      )
    );
  }

  // Get users
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      merchant_id: usersTable.merchant_id,
      parent_user_id: usersTable.parent_user_id,
      is_active: usersTable.is_active,
      is_verified: usersTable.is_verified,
      last_login: usersTable.last_login,
      created_at: usersTable.created_at,
    })
    .from(usersTable)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(usersTable.created_at);

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(usersTable)
    .where(whereClause);

  return {
    users,
    meta: {
      limit,
      offset,
      total,
    },
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number, requestingUser: AuthUser) {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      merchant_id: usersTable.merchant_id,
      parent_user_id: usersTable.parent_user_id,
      is_active: usersTable.is_active,
      is_verified: usersTable.is_verified,
      last_login: usersTable.last_login,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    throw new ApiError(Status.NotFound, "User not found");
  }

  // Check if requesting user has permission to view this user
  if (!canAccessUser(requestingUser, user)) {
    throw new ApiError(
      Status.Forbidden,
      "You don't have permission to view this user"
    );
  }

  // Get user's permissions
  const permissions = await getUserPermissions(user.id, user.role as Role);

  return { ...user, permissions };
}

/**
 * Update user
 */
export async function updateUser(
  userId: number,
  data: UpdateUserInput,
  requestingUser: AuthUser
) {
  // Get existing user
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!existingUser) {
    throw new ApiError(Status.NotFound, "User not found");
  }

  // Check permissions
  if (!canModifyUser(requestingUser, existingUser)) {
    throw new ApiError(
      Status.Forbidden,
      "You don't have permission to modify this user"
    );
  }

  // Prevent role escalation
  if (
    data.role &&
    !canAssignRole(requestingUser.role as Role, data.role as Role)
  ) {
    throw new ApiError(Status.Forbidden, "You cannot assign this role");
  }

  // Check email uniqueness if changing
  if (data.email && data.email.toLowerCase() !== existingUser.email) {
    const [emailExists] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, data.email.toLowerCase()))
      .limit(1);

    if (emailExists) {
      throw new ApiError(Status.Conflict, "Email already in use");
    }
  }

  // Update user
  const [updatedUser] = await db
    .update(usersTable)
    .set({
      ...data,
      email: data.email?.toLowerCase(),
      updated_at: new Date(),
    })
    .where(eq(usersTable.id, userId))
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      merchant_id: usersTable.merchant_id,
      is_active: usersTable.is_active,
      is_verified: usersTable.is_verified,
      updated_at: usersTable.updated_at,
    });

  return updatedUser;
}

/**
 * Delete user
 */
export async function deleteUser(userId: number, requestingUser: AuthUser) {
  // Get existing user
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!existingUser) {
    throw new ApiError(Status.NotFound, "User not found");
  }

  // Cannot delete yourself
  if (userId === requestingUser.id) {
    throw new ApiError(Status.Forbidden, "You cannot delete your own account");
  }

  // Check permissions
  if (!canModifyUser(requestingUser, existingUser)) {
    throw new ApiError(
      Status.Forbidden,
      "You don't have permission to delete this user"
    );
  }

  // Cannot delete super_admin unless you're also super_admin
  if (
    existingUser.role === "super_admin" &&
    requestingUser.role !== Role.SUPER_ADMIN
  ) {
    throw new ApiError(
      Status.Forbidden,
      "Only super admins can delete other super admins"
    );
  }

  await db.delete(usersTable).where(eq(usersTable.id, userId));

  return { message: "User deleted successfully" };
}

/**
 * Change password
 */
export async function changePassword(
  userId: number,
  data: ChangePasswordInput
) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    throw new ApiError(Status.NotFound, "User not found");
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(
    data.currentPassword,
    user.password
  );
  if (!isValidPassword) {
    throw new ApiError(Status.Unauthorized, "Current password is incorrect");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

  // Update password
  await db
    .update(usersTable)
    .set({
      password: hashedPassword,
      updated_at: new Date(),
    })
    .where(eq(usersTable.id, userId));

  return { message: "Password changed successfully" };
}

// PERMISSION MANAGEMENT SERVICES

/**
 * Grant or update permission for a user
 */
export async function grantPermission(
  data: GrantPermissionInput,
  requestingUser: AuthUser
) {
  // Check if requesting user can manage permissions
  if (
    requestingUser.role !== Role.SUPER_ADMIN &&
    requestingUser.role !== Role.ADMIN
  ) {
    throw new ApiError(Status.Forbidden, "Only admins can manage permissions");
  }

  // Get target user
  const [targetUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, data.user_id))
    .limit(1);

  if (!targetUser) {
    throw new ApiError(Status.NotFound, "User not found");
  }

  // Cannot modify super_admin permissions unless you're super_admin
  if (
    targetUser.role === "super_admin" &&
    requestingUser.role !== Role.SUPER_ADMIN
  ) {
    throw new ApiError(
      Status.Forbidden,
      "Only super admins can modify super admin permissions"
    );
  }

  // Check if permission already exists
  const [existing] = await db
    .select()
    .from(userPermissionsTable)
    .where(
      and(
        eq(userPermissionsTable.user_id, data.user_id),
        eq(userPermissionsTable.permission, data.permission as any)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing
    await db
      .update(userPermissionsTable)
      .set({ granted: data.granted })
      .where(eq(userPermissionsTable.id, existing.id));
  } else {
    // Insert new
    await db.insert(userPermissionsTable).values({
      user_id: data.user_id,
      permission: data.permission as any,
      granted: data.granted,
    });
  }

  return {
    message: `Permission ${data.granted ? "granted" : "revoked"} successfully`,
  };
}

/**
 * Get user permissions (including role defaults)
 */
export async function getUserPermissions(
  userId: number,
  role: Role
): Promise<Permission[]> {
  // Default role permissions
  const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    [Role.SUPER_ADMIN]: Object.values(Permission),
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

  const basePermissions = new Set(DEFAULT_ROLE_PERMISSIONS[role] || []);

  // Get user-specific overrides
  const overrides = await db
    .select()
    .from(userPermissionsTable)
    .where(eq(userPermissionsTable.user_id, userId));

  // Apply overrides
  for (const override of overrides) {
    if (override.granted) {
      basePermissions.add(override.permission as Permission);
    } else {
      basePermissions.delete(override.permission as Permission);
    }
  }

  return Array.from(basePermissions);
}

// HELPER FUNCTIONS

function generateAccessToken(payload: AuthUser): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError(Status.InternalServerError, "JWT secret not configured");
  }
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

function generateRefreshToken(payload: { id: number }): string {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError(Status.InternalServerError, "JWT secret not configured");
  }
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

function canAccessUser(requestingUser: AuthUser, targetUser: any): boolean {
  if (requestingUser.role === Role.SUPER_ADMIN) return true;
  if (requestingUser.role === Role.ADMIN) {
    return targetUser.role !== "super_admin";
  }
  if (requestingUser.role === Role.MERCHANT) {
    return (
      targetUser.id === requestingUser.id ||
      targetUser.merchant_id === requestingUser.id ||
      targetUser.parent_user_id === requestingUser.id
    );
  }
  // Users can always access their own data
  return targetUser.id === requestingUser.id;
}

function canModifyUser(requestingUser: AuthUser, targetUser: any): boolean {
  if (requestingUser.role === Role.SUPER_ADMIN) return true;
  if (requestingUser.role === Role.ADMIN) {
    return targetUser.role !== "super_admin";
  }
  if (requestingUser.role === Role.MERCHANT) {
    return (
      targetUser.merchant_id === requestingUser.id ||
      targetUser.parent_user_id === requestingUser.id
    );
  }
  // Users can modify only themselves
  return targetUser.id === requestingUser.id;
}

const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 5,
  [Role.ADMIN]: 4,
  [Role.MERCHANT]: 3,
  [Role.CUSTOMER]: 2,
  [Role.VIEWER]: 1,
};

function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  // Can only assign roles lower than your own
  return ROLE_HIERARCHY[assignerRole] > ROLE_HIERARCHY[targetRole];
}
