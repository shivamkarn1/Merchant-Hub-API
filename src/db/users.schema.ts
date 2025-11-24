import {
  bigint,
  integer,
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

// Define role enum
export const roleEnum = pgEnum("role", [
  "super_admin",
  "admin",
  "merchant",
  "customer",
  "viewer",
]);

// Define permission enum
export const permissionEnum = pgEnum("permission", [
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
]);

export const usersTable = pgTable(
  "users",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    email: varchar("email", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),

    role: roleEnum("role").default("customer").notNull(),

    // For merchant isolation - each merchant can only see their own data
    merchant_id: bigint("merchant_id", { mode: "number" }),

    // For hierarchical access - admin can see data of merchants under them
    parent_user_id: bigint("parent_user_id", { mode: "number" }),

    is_active: boolean("is_active").default(true).notNull(),
    is_verified: boolean("is_verified").default(false).notNull(),

    last_login: timestamp("last_login"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

// Role-Permission mapping table
export const rolePermissionsTable = pgTable("role_permissions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),

  role: roleEnum("role").notNull(),
  permission: permissionEnum("permission").notNull(),

  created_at: timestamp("created_at").defaultNow().notNull(),
});

// User-specific permission overrides
export const userPermissionsTable = pgTable("user_permissions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),

  user_id: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  permission: permissionEnum("permission").notNull(),
  granted: boolean("granted").notNull(), // true = grant and false = don't grant simple :)

  created_at: timestamp("created_at").defaultNow().notNull(),
});
