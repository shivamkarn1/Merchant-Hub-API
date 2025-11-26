import { Router } from "express";
import {
  getAllOrdersHandler,
  createOrderHandler,
  getOrderByIdHandler,
  updateOrderStatusHandler,
  cancelOrderHandler,
} from "../../controllers/orders/orders.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { Permission } from "../../types/auth.types";
import { checkCancelOwnership } from "../../middlewares/abac.middleware";
import ordersService from "../../services/orders/orders.service";

const orderRouter = Router();

// All routes require authentication
orderRouter.use(authenticate);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders
 *     description: |
 *       Retrieve all orders filtered by user's role and ownership:
 *       - Customers see only their orders
 *       - Merchants see orders for their merchant_id
 *       - Admins see all orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Orders Fetched Successfully"
 *                 success:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
orderRouter.get(
  "/",
  requirePermission(Permission.ORDERS_READ),
  getAllOrdersHandler
);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: Retrieve a single order by ID (ownership validated)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Order Fetched Successfully"
 *                 success:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
orderRouter.get(
  "/:id",
  requirePermission(Permission.ORDERS_READ),
  getOrderByIdHandler
);

/**
 * @swagger
 * /orders/create:
 *   post:
 *     summary: Create a new order
 *     description: Create a new order with items
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderInput'
 *           example:
 *             customer_id: 1
 *             merchant_id: 2
 *             total_amount: "999.99"
 *             currency: "NPR"
 *             shipping_address:
 *               street: "123 Main St"
 *               city: "Kathmandu"
 *               country: "Nepal"
 *             items:
 *               - product_id: 1
 *                 quantity: 2
 *                 unit_price: "499.99"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Order Created Successfully"
 *                 success:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
orderRouter.post(
  "/create",
  requirePermission(Permission.ORDERS_CREATE),
  createOrderHandler
);

/**
 * @swagger
 * /orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     description: Update the status of an order (merchants and admins only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderStatusInput'
 *           example:
 *             status: "confirmed"
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Order Status Updated"
 *                 success:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
orderRouter.put(
  "/:id/status",
  requirePermission(Permission.ORDERS_UPDATE),
  updateOrderStatusHandler
);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   put:
 *     summary: Cancel an order
 *     description: |
 *       Cancel an order with strict ownership validation:
 *       - Customers can ONLY cancel their own orders
 *       - Merchants can cancel orders they manage
 *       - Admins can cancel any order
 *       
 *       Only orders with status "pending" or "confirmed" can be cancelled.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Order Cancelled Successfully"
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Order cannot be cancelled (invalid status)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
orderRouter.put(
  "/:id/cancel",
  requirePermission(Permission.ORDERS_CANCEL),
  checkCancelOwnership("id", ordersService.getOrderOwnerInfo),
  cancelOrderHandler
);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   patch:
 *     summary: Cancel an order (alternative)
 *     description: Alternative PATCH endpoint for order cancellation
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Order Cancelled Successfully"
 *                 success:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
orderRouter.patch(
  "/:id/cancel",
  requirePermission(Permission.ORDERS_CANCEL),
  checkCancelOwnership("id", ordersService.getOrderOwnerInfo),
  cancelOrderHandler
);

export default orderRouter;
