import { time } from "drizzle-orm/mysql-core";
import {
  bigint,
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

//Role enum
export const roleEnum = pgEnum("role", [
  "super_admin",
  "admin",
  "merchat",
  "customer",
  "viewer",
]);

// Permisson enum
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
    name: varchar("name", { length: 100 }).notNull(),
    role: roleEnum("role").default("customer").notNull(),
    merchant_id: bigint("merchant_id", { mode: "number" }),
    parent_user_id: bigint("parent_id", { mode: "number" }),
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

export const rolePermissionsTable = pgTable("role_persmissoins", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  role: roleEnum("role").notNull(),
  permission: permissionEnum("persmission").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/// User specific persmission overrides
export const userPermissionsTable = pgTable("user_permissions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),

  user_id: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  permission: permissionEnum("permission").notNull(),
  granted: boolean("granted").notNull(), // true = grant and false = don't grant simple :)
  created_at: timestamp("created_at").defaultNow().notNull(),
});
