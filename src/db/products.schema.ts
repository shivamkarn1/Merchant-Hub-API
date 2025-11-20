import {
  bigint,
  integer,
  pgTable,
  numeric,
  text,
  varchar,
  timestamp,
  json,
  boolean,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const productsTable = pgTable(
  "products",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    sku: varchar("sku", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // use a string default for numeric to avoid some DB/driver issues
    price: numeric("price", { precision: 12, scale: 3 }).default("0").notNull(),
    currency: varchar("currency", { length: 3 }).default("NPR").notNull(),

    stock: integer("stock").default(0).notNull(),
    is_active: boolean("is_active").default(true).notNull(),

    image_url: varchar("image_url", { length: 2048 }),
    image_alt: varchar("image_alt", { length: 255 }),

    metadata: json("metadata"),

    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    deleted_at: timestamp("deleted_at"),
  },
  (table) => ({
    skuIdx: uniqueIndex("products_sku_idx").on(table.sku),
    priceCheck: check("products_price_check", sql`${table.price} >= 0`),
    stockCheck: check("products_stock_check", sql`${table.stock} >= 0`),
  })
);
