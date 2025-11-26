import { Router } from "express";
import {
  createProductHandler,
  getAllProductsHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
} from "../../controllers/products/products.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { Permission } from "../../types/auth.types";

const productRouter = Router();

// Prefix : /api/v1/products/.....

/**
 * @swagger
 * /products/allProducts:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a list of products with optional filtering, sorting, and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for product name or description
 *       - in: query
 *         name: sku
 *         schema:
 *           type: string
 *         description: Filter by SKU
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter by stock availability
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price, name, created_at]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *                 message:
 *                   type: string
 *                 success:
 *                   type: boolean
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
productRouter.get("/allProducts", getAllProductsHandler);

/**
 * @swagger
 * /products/allProducts/search:
 *   get:
 *     summary: Search products
 *     description: Search products with advanced filtering (alias for allProducts)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for product name or description
 *       - in: query
 *         name: sku
 *         schema:
 *           type: string
 *         description: Filter by SKU
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter by stock availability
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *                 message:
 *                   type: string
 *                 success:
 *                   type: boolean
 */
productRouter.get("/allProducts/search", getAllProductsHandler);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieve a single product by its ID (requires authentication)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       $ref: '#/components/schemas/Product'
 *                 message:
 *                   type: string
 *                 success:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
productRouter.get("/:id", authenticate, getProductByIdHandler);

/**
 * @swagger
 * /products/create:
 *   post:
 *     summary: Create a new product
 *     description: Create a new product (requires authentication and permission)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductInput'
 *           example:
 *             name: "Sample Product"
 *             description: "A sample product description"
 *             sku: "SKU-001"
 *             price: 99.99
 *             stock: 100
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *                 message:
 *                   type: string
 *                   example: "Product Created Successfully"
 *                 success:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
productRouter.post("/create", authenticate, createProductHandler);

/**
 * @swagger
 * /products/update/{id}:
 *   put:
 *     summary: Update a product
 *     description: Update an existing product (requires authentication and ownership)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProductInput'
 *           example:
 *             name: "Updated Product Name"
 *             price: 149.99
 *             stock: 50
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     updateData:
 *                       $ref: '#/components/schemas/Product'
 *                 message:
 *                   type: string
 *                   example: "Product Updated Successfully"
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
productRouter.put("/update/:id", authenticate, updateProductHandler);

/**
 * @swagger
 * /products/delete/{id}:
 *   delete:
 *     summary: Delete a product
 *     description: Soft delete a product (requires authentication and ownership)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: "Product Deleted Successfully"
 *                 success:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
productRouter.delete("/delete/:id", authenticate, deleteProductHandler);

export default productRouter;
