import {
  bigint,
  pgTable,
  numeric,
  text,
  varchar,
  timestamp,
  json,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

import { usersTable } from "./users.schema";
import { productsTable } from "./products.schema";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const ordersTable = pgTable("orders", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),

  order_number: varchar("order_number", { length: 64 }).notNull().unique(),

  customer_id: bigint("customer_id", { mode: "number" })
    .notNull()
    .references(() => usersTable.id),

  merchant_id: bigint("merchant_id", { mode: "number" })
    .notNull()
    .references(() => usersTable.id),

  status: orderStatusEnum("status").default("pending").notNull(),

  total_amount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NPR").notNull(),

  shipping_address: json("shipping_address"),
  billing_address: json("billing_address"),

  metadata: json("metadata"),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItemsTable = pgTable("order_items", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),

  order_id: bigint("order_id", { mode: "number" })
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),

  product_id: bigint("product_id", { mode: "number" })
    .notNull()
    .references(() => productsTable.id),

  quantity: integer("quantity").notNull(),
  unit_price: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),

  created_at: timestamp("created_at").defaultNow().notNull(),
});
