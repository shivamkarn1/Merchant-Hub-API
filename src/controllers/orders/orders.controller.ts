import { OK, Created } from "../../utils/HttpStatusCodes";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { db } from "../../db/db";
import { ordersTable } from "../../db/orders.schema";
import Status from "../../utils/HttpStatusCodes";
import { ApiError } from "../../utils/ApiError";
import ordersService from "../../services/orders/orders.service";
import { eq, and, desc } from "drizzle-orm";
import { ABACPolicy } from "../../middlewares/abac.middleware";
import { cache, CACHE_TTL, CACHE_KEYS } from "../../utils/redis";
import crypto from "crypto";

/**
 * Build cache key for orders list based on user context
 */
function buildOrdersCacheKey(
  userId: number,
  role: string,
  merchantId?: number | null
): string {
  const keyData = { userId, role, merchantId };
  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify(keyData))
    .digest("hex");
  return `orders:list:${hash}`;
}

/**
 * Get all orders with ABAC filtering
 * Users only see orders they're authorized to see
 */
const getAllOrdersHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(Status.Unauthorized, "Authentication required");
  }

  // Build cache key based on user context
  const cacheKey = buildOrdersCacheKey(
    req.user.id,
    req.user.role,
    req.user.merchant_id
  );

  // Try cache first
  const cached = await cache.get<unknown[]>(cacheKey);
  if (cached) {
    return res
      .status(OK)
      .json(new ApiResponse(Status.OK, cached, "Orders served from cache"));
  }

  // Build where clause with ABAC filter
  const where: any[] = [];
  const dataFilter = ABACPolicy.getDataFilter(req.user);

  if (dataFilter.merchant_id) {
    where.push(eq(ordersTable.merchant_id, dataFilter.merchant_id));
  }
  if (dataFilter.customer_id) {
    where.push(eq(ordersTable.customer_id, dataFilter.customer_id));
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(ordersTable.created_at));

  // Cache the results
  await cache.set(cacheKey, orders, CACHE_TTL.ORDERS_LIST);

  return res
    .status(OK)
    .json(new ApiResponse(Status.OK, orders, "Orders Fetched Successfully"));
});

/**
 * Create order
 */
const createOrderHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(Status.Unauthorized, "Authentication required");
  }

  const order = await ordersService.createOrder(req.body, req.user);

  // Invalidate relevant order caches
  await cache.invalidateOrderCache(
    undefined,
    req.body.customer_id,
    req.body.merchant_id
  );

  return res
    .status(Created)
    .json(new ApiResponse(Status.Created, order, "Order Created Successfully"));
});

/**
 * Get order by ID with ownership validation
 */
const getOrderByIdHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(Status.Unauthorized, "Authentication required");
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw new ApiError(Status.BadRequest, "Invalid order ID");
  }

  // Try cache first
  const cacheKey = CACHE_KEYS.ORDERS.SINGLE(id);
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res
      .status(OK)
      .json(new ApiResponse(Status.OK, cached, "Order served from cache"));
  }

  const order = await ordersService.getOrderById(id, req.user);

  // Cache the order
  await cache.set(cacheKey, order, CACHE_TTL.ORDER_DETAIL);

  return res
    .status(OK)
    .json(new ApiResponse(Status.OK, order, "Order Fetched Successfully"));
});

/**
 * Update order status
 */
const updateOrderStatusHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(Status.Unauthorized, "Authentication required");
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw new ApiError(Status.BadRequest, "Invalid order ID");
  }

  const { status } = req.body;
  if (!status) {
    throw new ApiError(Status.BadRequest, "Status is required");
  }

  const updated = await ordersService.updateOrderStatus(id, status, req.user);

  // Invalidate order cache after status update
  await cache.invalidateOrderCache(
    id,
    updated.customer_id,
    updated.merchant_id
  );

  return res
    .status(OK)
    .json(new ApiResponse(Status.OK, updated, "Order Status Updated"));
});

/**
 * Cancel order with strict ownership validation
 * Customers can ONLY cancel their own orders
 * Merchants can cancel orders they manage
 * Admins can cancel any order
 */
const cancelOrderHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(Status.Unauthorized, "Authentication required");
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw new ApiError(Status.BadRequest, "Invalid order ID");
  }

  // Service handles ownership validation
  const cancelled = await ordersService.cancelOrder(id, req.user);

  // Invalidate order cache after cancellation
  await cache.invalidateOrderCache(
    id,
    cancelled.customer_id,
    cancelled.merchant_id
  );

  return res
    .status(OK)
    .json(
      new ApiResponse(Status.OK, cancelled, "Order Cancelled Successfully")
    );
});

export {
  getAllOrdersHandler,
  createOrderHandler,
  getOrderByIdHandler,
  updateOrderStatusHandler,
  cancelOrderHandler,
};
