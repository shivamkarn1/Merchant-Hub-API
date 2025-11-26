import { OK, Created, BadRequest } from "../../utils/HttpStatusCodes";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { db } from "../../db/db";
import { productsTable } from "../../db/products.schema";
import Status from "../../utils/HttpStatusCodes";
import { ApiError } from "../../utils/ApiError";
import createProductSchema from "./product.validation";
import {
  createProduct,
  updateProduct,
  getProductById,
  deleteProduct,
} from "../../services/products/products.service";
import { zodToApiError } from "../../utils/handleZodError";
import { eq, and, like, gte, lte, desc, asc, or } from "drizzle-orm";
import { cache, CACHE_TTL, CACHE_KEYS } from "../../utils/redis";
import { z } from "zod";
import crypto from "crypto";

// query schema ahh query better kara k lagi , Production level things.
export const getProductQuerySchema = z.object({
  sku: z.string().optional(),
  q: z.string().optional(),
  price: z.preprocess(
    (v) => (v === undefined ? undefined : Number(v)),
    z.number().nonnegative().optional()
  ),
  minPrice: z.preprocess(
    (v) => (v === undefined ? undefined : Number(v)),
    z.number().nonnegative().optional()
  ),
  maxPrice: z.preprocess(
    (v) => (v === undefined ? undefined : Number(v)),
    z.number().nonnegative().optional()
  ),
  inStock: z.preprocess(
    (v) => (v === undefined ? undefined : v === "true"),
    z.boolean().optional()
  ),
  sortBy: z.enum(["price", "name", "created_at"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.preprocess(
    (v) => (v === undefined ? 20 : Number(v)),
    z.number().int().positive().max(100).optional()
  ),
  offset: z.preprocess(
    (v) => (v === undefined ? undefined : Number(v)),
    z.number().nonnegative().optional()
  ),
});

// either make extra type or just use zod , so hmra lagi ya zod infer method is good for now.
// export type ProductQueryParams = {
//   q?: string;
//   category?: string;
//   minPrice?: number;
//   maxPrice?: number;
//   inStock?: boolean;
//   sortBy?: "price" | "name" | "created_at";
//   sortOrder?: "asc" | "desc";
//   limit?: number;
//   offset?: number;
// };

type ProductQueryParams = z.infer<typeof getProductQuerySchema>;

/**
 * Build a deterministic cache key from query parameters
 */
function buildCacheKeyFromQuery(obj: ProductQueryParams): string {
  const normalized: Record<string, unknown> = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      const key = k as keyof ProductQueryParams;
      const v = obj[key];
      if (v !== undefined && v !== null && v !== "") normalized[k] = v;
    });
  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify(normalized))
    .digest("hex");
  return CACHE_KEYS.PRODUCTS.QUERY(hash);
}

const getAllProductsHandler = asyncHandler(async (req, res) => {
  const parsedResult = await getProductQuerySchema.safeParseAsync(req.query);
  if (!parsedResult.success) {
    throw zodToApiError(parsedResult.error);
  }
  const {
    sku,
    q,
    price,
    minPrice,
    maxPrice,
    inStock,
    sortBy = "created_at",
    sortOrder = "desc",
    limit = 20,
    offset = 0,
  } = parsedResult.data;

  const cacheKey = buildCacheKeyFromQuery({
    sku,
    q,
    price,
    minPrice,
    maxPrice,
    inStock,
    sortBy,
    sortOrder,
    limit,
    offset,
  });

  // Check cache first
  const cached = await cache.get<{ products: unknown[]; meta: unknown }>(
    cacheKey
  );
  if (cached) {
    return res
      .status(OK)
      .json(new ApiResponse(Status.OK, cached, "Products served from cache"));
  }

  // Building "where" clause beigns here
  const where: any[] = [];

  if (sku) {
    where.push(eq(productsTable.sku, sku));
  }

  if (typeof price === "number") {
    where.push(eq(productsTable.price, price.toString()));
  }

  if (q) {
    // search in name or desc
    where.push(
      or(
        like(productsTable.name, `%${q}%`),
        like(productsTable.description, `%${q}%`)
      )
    );
  }
  if (typeof minPrice === "number")
    where.push(gte(productsTable.price, minPrice.toString()));
  if (typeof maxPrice === "number")
    where.push(lte(productsTable.price, maxPrice.toString()));

  if (inStock !== undefined) {
    where.push(
      inStock ? gte(productsTable.stock, 1) : eq(productsTable.stock, 0)
    );
  }
  // Building "where" clause ends here

  // now sorting
  const sortMap = {
    price: productsTable.price,
    name: productsTable.name,
    created_at: productsTable.created_at,
  };
  const sortColumn = sortMap[sortBy] ?? productsTable.created_at;
  const direction = sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

  // Final Query for the db
  const products = await db
    .select()
    .from(productsTable)
    .where(where.length ? and(...where) : undefined)
    .orderBy(direction)
    .limit(limit)
    .offset(offset);

  // Response and cache
  const response = {
    products,
    meta: { limit, offset, count: products.length },
  };

  // Cache for configured TTL
  await cache.set(cacheKey, response, CACHE_TTL.PRODUCTS_LIST);

  // finally success response send
  return res
    .status(OK)
    .json(
      new ApiResponse(Status.OK, response, "Products fetched successfully")
    );
});

const createProductHandler = asyncHandler(async (req, res) => {
  // sabsa pahila ta input validation
  if (!req.user) {
    throw new ApiError(Status.Unauthorized, "Authentication Required");
  }
  const parseResult = await createProductSchema.safeParseAsync(req.body);
  // check kara prlai ki success velai ki nai parsing
  if (!parseResult.success) {
    throw zodToApiError(parseResult.error);
  }

  // okr baad service call kara partai nai
  const createdProduct = await createProduct(parseResult.data, req.user);

  // Invalidate all products cache after the product has been created
  await cache.invalidateProductCache();

  // and last me return success response
  return res
    .status(Created)
    .json(
      new ApiResponse(
        Status.Created,
        createdProduct,
        "Product Created Successfully"
      )
    );
});

const updateProductHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(Status.Unauthorized, "Authentication Required");
  }
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw new ApiError(Status.BadRequest, "Invalid Product ID");
  }
  const parseResult = await createProductSchema
    .partial()
    .safeParseAsync(req.body);

  if (!parseResult.success) {
    throw zodToApiError(parseResult.error);
  }
  const updateData = await updateProduct(id, parseResult.data, req.user);

  // Invalidate product cache after update
  await cache.invalidateProductCache(id);

  return res
    .status(OK)
    .json(
      new ApiResponse(Status.OK, { updateData }, "Product Updated Successfully")
    );
});

const deleteProductHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(Status.Unauthorized, "Authentication Required");
  }
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    throw new ApiError(Status.BadRequest, "Invalid product ID");
  }

  await deleteProduct(id, req.user);

  // Invalidate product cache after deletion
  await cache.invalidateProductCache(id);

  return res
    .status(OK)
    .json(new ApiResponse(Status.OK, {}, "Product Deleted Successfully"));
});

const getProductByIdHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(Status.Unauthorized, "Authentication required");
  }
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw new ApiError(Status.BadRequest, "Invalid product ID");
  }

  // Try to get from cache first
  const cacheKey = CACHE_KEYS.PRODUCTS.SINGLE(id);
  const cachedProduct = await cache.get(cacheKey);

  if (cachedProduct) {
    return res
      .status(OK)
      .json(
        new ApiResponse(
          Status.OK,
          { product: cachedProduct },
          `Product served from cache`
        )
      );
  }

  const product = await getProductById(id, req.user);

  // Cache the product
  await cache.set(cacheKey, product, CACHE_TTL.PRODUCT_DETAIL);

  return res
    .status(OK)
    .json(
      new ApiResponse(
        Status.OK,
        { product },
        `Product with id: ${id} fetched successfully`
      )
    );
});

export {
  getAllProductsHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
};
