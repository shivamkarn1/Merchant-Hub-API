/**
 * Database Seed Script
 * Run with: pnpm seed
 *
 * This script creates:
 * 1. A super admin user
 * 2. A merchant user
 * 3. A customer user
 * 4. Sample products
 * 5. Sample orders
 */

import { db } from "./db/db";
import { usersTable, userPermissionsTable } from "./db/users.schema";
import { productsTable } from "./db/products.schema";
import { ordersTable, orderItemsTable } from "./db/orders.schema";
import * as bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // ============================================
    // 1. CREATE USERS
    // ============================================
    console.log("👤 Creating users...");

    // Super Admin
    const superAdminPassword = await bcrypt.hash("SuperAdmin@123", SALT_ROUNDS);
    let [superAdmin] = await db
      .insert(usersTable)
      .values({
        email: "superadmin@merchant-hub.com",
        password: superAdminPassword,
        name: "Super Administrator",
        role: "super_admin",
        is_active: true,
        is_verified: true,
      })
      .onConflictDoNothing()
      .returning();

    if (superAdmin) {
      console.log(
        `  ✅ Super Admin created: ${superAdmin.email} (ID: ${superAdmin.id})`
      );
    } else {
      console.log("  ⚠️ Super Admin already exists");
      const [existingSuperAdmin] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, "superadmin@merchant-hub.com"));
      superAdmin = existingSuperAdmin;
    }

    // Admin
    const adminPassword = await bcrypt.hash("Admin@123", SALT_ROUNDS);
    const [admin] = await db
      .insert(usersTable)
      .values({
        email: "admin@merchant-hub.com",
        password: adminPassword,
        name: "System Administrator",
        role: "admin",
        parent_user_id: superAdmin?.id,
        is_active: true,
        is_verified: true,
      })
      .onConflictDoNothing()
      .returning();

    if (admin) {
      console.log(`  ✅ Admin created: ${admin.email} (ID: ${admin.id})`);
    } else {
      console.log("  ⚠️ Admin already exists");
    }

    // Merchant 1
    const merchantPassword = await bcrypt.hash("Merchant@123", SALT_ROUNDS);
    const [merchant1] = await db
      .insert(usersTable)
      .values({
        email: "merchant1@merchant-hub.com",
        password: merchantPassword,
        name: "Tech Store Merchant",
        role: "merchant",
        is_active: true,
        is_verified: true,
      })
      .onConflictDoNothing()
      .returning();

    let merchantId: number;
    if (merchant1) {
      merchantId = merchant1.id;
      // Update merchant_id to self (for merchant isolation)
      await db
        .update(usersTable)
        .set({ merchant_id: merchant1.id })
        .where(eq(usersTable.id, merchant1.id));
      console.log(
        `  ✅ Merchant created: ${merchant1.email} (ID: ${merchant1.id})`
      );
    } else {
      console.log("  ⚠️ Merchant already exists");
      const [existing] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, "merchant1@merchant-hub.com"));
      merchantId = existing?.id || 1;
    }

    // Customer
    const customerPassword = await bcrypt.hash("Customer@123", SALT_ROUNDS);
    const [customer] = await db
      .insert(usersTable)
      .values({
        email: "customer@merchant-hub.com",
        password: customerPassword,
        name: "John Customer",
        role: "customer",
        is_active: true,
        is_verified: true,
      })
      .onConflictDoNothing()
      .returning();

    let customerId: number;
    if (customer) {
      customerId = customer.id;
      console.log(
        `  ✅ Customer created: ${customer.email} (ID: ${customer.id})`
      );
    } else {
      console.log("  ⚠️ Customer already exists");
      const [existing] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, "customer@merchant-hub.com"));
      customerId = existing?.id || 1;
    }

    // Viewer
    const viewerPassword = await bcrypt.hash("Viewer@123", SALT_ROUNDS);
    const [viewer] = await db
      .insert(usersTable)
      .values({
        email: "viewer@merchant-hub.com",
        password: viewerPassword,
        name: "View Only User",
        role: "viewer",
        is_active: true,
        is_verified: true,
      })
      .onConflictDoNothing()
      .returning();

    if (viewer) {
      console.log(`  ✅ Viewer created: ${viewer.email} (ID: ${viewer.id})`);
    } else {
      console.log("  ⚠️ Viewer already exists");
    }

    // ============================================
    // 2. CREATE PRODUCTS
    // ============================================
    console.log("\n📦 Creating products...");

    const products = [
      {
        sku: "TECH-001",
        name: "Wireless Bluetooth Headphones",
        description:
          "Premium noise-cancelling wireless headphones with 30-hour battery life",
        price: "149.99",
        compare_at_price: "199.99",
        cost_price: "75.00",
        stock: 100,
        low_stock_threshold: 10,
        category: "Electronics",
        brand: "TechPro",
        weight: "0.300",
        is_active: true,
        is_featured: true,
        created_by: merchantId,
        merchant_id: merchantId,
      },
      {
        sku: "TECH-002",
        name: "Mechanical Gaming Keyboard",
        description: "RGB backlit mechanical keyboard with Cherry MX switches",
        price: "129.99",
        compare_at_price: "159.99",
        cost_price: "65.00",
        stock: 75,
        low_stock_threshold: 15,
        category: "Electronics",
        brand: "GameGear",
        weight: "1.200",
        is_active: true,
        is_featured: false,
        created_by: merchantId,
        merchant_id: merchantId,
      },
      {
        sku: "TECH-003",
        name: "4K Ultra HD Monitor",
        description: "27-inch 4K IPS monitor with HDR support",
        price: "449.99",
        compare_at_price: "549.99",
        cost_price: "250.00",
        stock: 30,
        low_stock_threshold: 5,
        category: "Electronics",
        brand: "ViewMax",
        weight: "6.500",
        is_active: true,
        is_featured: true,
        created_by: merchantId,
        merchant_id: merchantId,
      },
      {
        sku: "TECH-004",
        name: "USB-C Hub Adapter",
        description: "7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader",
        price: "49.99",
        compare_at_price: "69.99",
        cost_price: "20.00",
        stock: 200,
        low_stock_threshold: 25,
        category: "Accessories",
        brand: "ConnectPro",
        weight: "0.150",
        is_active: true,
        is_featured: false,
        created_by: merchantId,
        merchant_id: merchantId,
      },
      {
        sku: "TECH-005",
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse with precision tracking",
        price: "39.99",
        compare_at_price: null,
        cost_price: "15.00",
        stock: 150,
        low_stock_threshold: 20,
        category: "Accessories",
        brand: "TechPro",
        weight: "0.100",
        is_active: true,
        is_featured: false,
        created_by: merchantId,
        merchant_id: merchantId,
      },
    ];

    for (const product of products) {
      const [created] = await db
        .insert(productsTable)
        .values(product as any)
        .onConflictDoNothing()
        .returning();

      if (created) {
        console.log(
          `  ✅ Product created: ${created.name} (SKU: ${created.sku})`
        );
      } else {
        console.log(`  ⚠️ Product ${product.sku} already exists`);
      }
    }

    // ============================================
    // 3. CREATE SAMPLE ORDER
    // ============================================
    console.log("\n🛒 Creating sample order...");

    // Get product IDs
    const [product1] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.sku, "TECH-001"));
    const [product2] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.sku, "TECH-004"));

    if (product1 && product2) {
      const orderNumber = `ORD-${Date.now()}`;
      const [order] = await db
        .insert(ordersTable)
        .values({
          order_number: orderNumber,
          customer_id: customerId,
          merchant_id: merchantId,
          status: "confirmed",
          total_amount: "199.98",
          currency: "NPR",
          shipping_address: {
            street: "123 Main Street",
            city: "Kathmandu",
            state: "Bagmati",
            postal_code: "44600",
            country: "Nepal",
          },
          billing_address: {
            street: "123 Main Street",
            city: "Kathmandu",
            state: "Bagmati",
            postal_code: "44600",
            country: "Nepal",
          },
        })
        .returning();

      if (order) {
        // Add order items
        await db.insert(orderItemsTable).values([
          {
            order_id: order.id,
            product_id: product1.id,
            quantity: 1,
            unit_price: "149.99",
            subtotal: "149.99",
          },
          {
            order_id: order.id,
            product_id: product2.id,
            quantity: 1,
            unit_price: "49.99",
            subtotal: "49.99",
          },
        ]);

        console.log(`  ✅ Order created: ${orderNumber} (ID: ${order.id})`);
      }
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Seed completed successfully!");
    console.log("=".repeat(60));
    console.log("\n📋 Test Credentials:\n");
    console.log(
      "┌─────────────────────────────────────────────────────────────┐"
    );
    console.log(
      "│ Role         │ Email                        │ Password      │"
    );
    console.log(
      "├─────────────────────────────────────────────────────────────┤"
    );
    console.log(
      "│ Super Admin  │ superadmin@merchant-hub.com  │ SuperAdmin@123│"
    );
    console.log(
      "│ Admin        │ admin@merchant-hub.com       │ Admin@123     │"
    );
    console.log(
      "│ Merchant     │ merchant1@merchant-hub.com   │ Merchant@123  │"
    );
    console.log(
      "│ Customer     │ customer@merchant-hub.com    │ Customer@123  │"
    );
    console.log(
      "│ Viewer       │ viewer@merchant-hub.com      │ Viewer@123    │"
    );
    console.log(
      "└─────────────────────────────────────────────────────────────┘"
    );
    console.log("\n🚀 You can now test the API with these credentials!");
    console.log("   1. Login: POST /api/v1/auth/login");
    console.log("   2. Use the accessToken in Authorization header");
    console.log("   3. Browse API docs at: http://localhost:6767/api-docs\n");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seed();
