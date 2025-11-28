import { z } from "zod";

// USER REGISTRATION SCHEMAS

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase, one uppercase, and one number"
    ),
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  role: z
    .enum(["super_admin", "admin", "merchant", "customer", "viewer"])
    .optional()
    .default("customer"),
  merchant_id: z.number().int().positive().optional(),
  parent_user_id: z.number().int().positive().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// USER MANAGEMENT SCHEMAS
export const updateUserSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  name: z.string().min(2).max(255).optional(),
  role: z
    .enum(["super_admin", "admin", "merchant", "customer", "viewer"])
    .optional(),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  merchant_id: z.number().int().positive().nullable().optional(),
  parent_user_id: z.number().int().positive().nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase, one uppercase, and one number"
    ),
});

// PERMISSION MANAGEMENT SCHEMAS

export const grantPermissionSchema = z.object({
  user_id: z.number().int().positive(),
  permission: z.enum([
    "products.create",
    "products.read",
    "products.update",
    "products.delete",
    "orders.create",
    "orders.read",
    "orders.update",
    "orders.delete",
    "orders.cancel",
    "users.create",
    "users.read",
    "users.update",
    "users.delete",
  ]),
  granted: z.boolean(),
});

export const revokePermissionSchema = z.object({
  user_id: z.number().int().positive(),
  permission: z.enum([
    "products.create",
    "products.read",
    "products.update",
    "products.delete",
    "orders.create",
    "orders.read",
    "orders.update",
    "orders.delete",
    "orders.cancel",
    "users.create",
    "users.read",
    "users.update",
    "users.delete",
  ]),
});

// QUERY SCHEMAS

export const getUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  role: z
    .enum(["super_admin", "admin", "merchant", "customer", "viewer"])
    .optional(),
  is_active: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  search: z.string().optional(),
});

// Type exports
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
