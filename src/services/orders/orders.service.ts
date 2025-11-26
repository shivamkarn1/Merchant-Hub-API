import { db } from "../../db/db";
import { ordersTable, orderItemsTable } from "../../db/orders.schema";
import { ApiError } from "../../utils/ApiError";
import Status from "../../utils/HttpStatusCodes";
import { AuthUser, Role } from "../../types/auth.types";
import { ABACPolicy } from "../../middlewares/abac.middleware";
import { eq, and } from "drizzle-orm";

export interface CreateOrderInput {
  customer_id: number;
  merchant_id: number;
  total_amount: string;
  currency?: string;
  shipping_address?: any;
  billing_address?: any;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: string;
  }>;
}

export async function createOrder(payload: CreateOrderInput, user: AuthUser) {
  try {
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // k order kelai
    const [order] = await db
      .insert(ordersTable)
      .values({
        order_number: orderNumber,
        customer_id: payload.customer_id,
        merchant_id: payload.merchant_id,
        total_amount: payload.total_amount,
        currency: payload.currency || "NPR",
        shipping_address: payload.shipping_address,
        billing_address: payload.billing_address,
      })
      .returning();

    // Insert order items -> kathi kathi order kelai
    if (payload.items && payload.items.length > 0) {
      const itemsData = payload.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: (parseFloat(item.unit_price) * item.quantity).toFixed(3),
      }));

      await db.insert(orderItemsTable).values(itemsData);
    }

    return order;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      Status.InternalServerError,
      "Error creating order",
      [],
      err?.stack ?? ""
    );
  }
}

export async function getOrderById(id: number, user: AuthUser) {
  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });

  if (!order) {
    throw new ApiError(Status.NotFound, "Order not found");
  }

  // Check access based on role
  const canAccess = ABACPolicy.canAccessResource({
    user,
    resourceOwnerId: order.customer_id,
    resourceMerchantId: order.merchant_id,
    action: "read",
  });

  if (!canAccess) {
    throw new ApiError(Status.Forbidden, "Access denied to this order");
  }

  return order;
}

export async function updateOrderStatus(
  id: number,
  status: string,
  user: AuthUser
) {
  const order = await getOrderById(id, user);

  const canAccess = ABACPolicy.canAccessResource({
    user,
    resourceOwnerId: order.customer_id,
    resourceMerchantId: order.merchant_id,
    action: "update",
  });

  if (!canAccess) {
    throw new ApiError(Status.Forbidden, "Access denied to update this order");
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: status as any, updated_at: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  return updated;
}

/*
 -Cancel order with proper ownership validation
 - Customers can only cancel their own orders
 - Merchants can cancel orders they manage
 - Admins can cancel any order
 */
export async function cancelOrder(id: number, user: AuthUser) {
  // First, fetch the order
  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });

  if (!order) {
    throw new ApiError(Status.NotFound, "Order not found");
  }

  // Strict ownership validation for cancel operation
  const canCancel = ABACPolicy.canCancelResource({
    user,
    resourceOwnerId: order.customer_id,
    resourceMerchantId: order.merchant_id,
    action: "cancel",
  });

  if (!canCancel) {
    // Provide specific error messages based on role
    if (user.role === Role.CUSTOMER) {
      throw new ApiError(
        Status.Forbidden,
        "You can only cancel your own orders"
      );
    } else {
      throw new ApiError(
        Status.Forbidden,
        "You don't have permission to cancel this order"
      );
    }
  }

  // Check if order can be cancelled (business logic)
  const cancellableStatuses = ["pending", "confirmed"];
  if (!cancellableStatuses.includes(order.status)) {
    throw new ApiError(
      Status.BadRequest,
      `Cannot cancel order with status: ${order.status}. Only pending or confirmed orders can be cancelled.`
    );
  }

  // Update order status to cancelled
  const [cancelled] = await db
    .update(ordersTable)
    .set({
      status: "cancelled",
      updated_at: new Date(),
    })
    .where(eq(ordersTable.id, id))
    .returning();

  return cancelled;
}

/**
  Helper function to get order owner info (for middleware)
 */
export async function getOrderOwnerInfo(orderId: number): Promise<{
  ownerId: number;
  merchantId: number;
}> {
  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, orderId),
  });

  if (!order) {
    throw new ApiError(Status.NotFound, "Order not found");
  }

  return {
    ownerId: order.customer_id,
    merchantId: order.merchant_id,
  };
}

export default {
  createOrder,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderOwnerInfo,
};
