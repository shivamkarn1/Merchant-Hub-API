import { OK, Created, BadRequest } from "../../utils/HttpStatusCodes";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { db } from "../../db/db";
import { productsTable } from "../../db/products.schema";
import Status from "../../utils/HttpStatusCodes";
import { ApiError } from "../../utils/ApiError";
import createProductSchema from "./product.validation";
import { createProduct } from "../../services/products/products.service";
import { zodToApiError } from "../../utils/handleZodError";
import { eq } from "drizzle-orm";
import { cache } from "../../utils/redis";
import { z } from "zod";
import crypto from "crypto";

const CACHE_TTL = {
  ALL_PRODUCTS: 600, // 10 mins
  SINGLE_PRODUCT: 300,
};

// query schema ahh query better kara k lagi , Production level things.
export const getProductQuerySchema = z.object({
  q: z.string().optional(),
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
// now cache key banaba prtaiiiii for ofcourse redis
function buildCacheKeyFromQuery(obj: ProductQueryParams) {
  const normalized: Record<string, unknown> = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      const key = k as keyof ProductQueryParams;
      const v = obj[key];
      if (v !== undefined && v !== null && v !== "") normalized[k] = v;
    });
  return (
    "products:query:" +
    crypto.createHash("sha1").update(JSON.stringify(normalized)).digest("hex")
  );
}

const getAllProductsHandler = asyncHandler(async (req, res) => {
  const parsedResult = await getProductQuerySchema.safeParseAsync(req.query);
  if (!parsedResult.success) {
    throw zodToApiError(parsedResult.error);
  }
  const {
    q,
    minPrice,
    maxPrice,
    inStock,
    sortBy = "created_at",
    sortOrder = "desc",
    limit = 20,
    offset = 0,
  } = parsedResult.data;

  // check in cache
  const cacheKey = buildCacheKeyFromQuery({
    q,
    minPrice,
    maxPrice,
    inStock,
    sortBy,
    sortOrder,
    limit,
    offset,
  });

  const cached = await cache.get(cacheKey);
  if (cached) {
    return res
      .status(OK)
      .json(new ApiResponse(Status.OK, cached, "Products served from Cache"));
  }

  // REST CODE REMAINING
});

const createProductHandler = asyncHandler(async (req, res) => {
  // sabsa pahila ta input validation
  const parseResult = await createProductSchema.safeParseAsync(req.body);
  // check kara prlai ki success velai ki nai parsing
  if (!parseResult.success) {
    throw zodToApiError(parseResult.error);
  }

  console.log("The data to be sent for creation is : ", parseResult.data);
  // okr baad service call kara partai nai
  const createdProduct = await createProduct(parseResult.data);

  // invalidate all products cache after the product has been created
  await cache.del("products:all");

  // and last me return success response
  return res
    .status(Created)
    .json(
      new ApiResponse(
        Status.Created,
        { createdProduct },
        "Product Created Successfully"
      )
    );
});

const updateProductHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // invalidate related caches
  await cache.del("products:all");
  await cache.del(`products:${id}`);

  // validate partial update payload
  const parseResult = await createProductSchema
    .partial()
    .safeParseAsync(req.body);

  if (!parseResult.success) {
    throw zodToApiError(parseResult.error);
  }
  const updateData = parseResult.data;

  // Remove undefined fields because drizzle .set(...) doesn't accept values that may be undefined
  const updatePayload = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;

  /*  
function bana sake xiyai e kaam k lagi but I don't think it's much necessary right now, And I feel lazy for it too, lol.
  export function removeUndefinedFromObejects < T extends Record<string,any>>(obj: T){
  return Object.FromEnteries(
  Object.enteries(obj.filter(([_,v])=> v!== undefined)) as T;
  )
  }
  */

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(Status.BadRequest, "No Field for update");
  }

  const updatedRows = await db
    .update(productsTable)
    .set(updatePayload)
    .where(eq(productsTable.id, Number(id)))
    .returning();

  const [updatedProduct] = updatedRows ?? [];
  if (!updatedProduct) {
    throw new ApiError(Status.NotFound, "Product not found");
  }

  // refresh single product cache with updated value
  await cache.set(`products:${id}`, updatedProduct, CACHE_TTL.SINGLE_PRODUCT);

  return res
    .status(OK)
    .json(
      new ApiResponse(
        Status.OK,
        { updatedProduct },
        "Product Updated Successfully"
      )
    );
});

const deleteProductHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // invalidate related caches
  await cache.del("products:all");
  await cache.del(`products:${id}`);

  const deletedRows = await db
    .delete(productsTable)
    .where(eq(productsTable.id, Number(id)))
    .returning();

  const [deletedProduct] = deletedRows ?? [];
  if (!deletedProduct) {
    throw new ApiError(Status.NotFound, "Product not found");
  }

  return res
    .status(OK)
    .json(
      new ApiResponse(
        Status.OK,
        { deletedProduct },
        "Product Deleted Successfully"
      )
    );
});

const getProductByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cacheKey = `products:${id}`;
  // Try to get from cache
  const productInCache = await cache.get(cacheKey);
  if (productInCache) {
    return res
      .status(OK)
      .json(
        new ApiResponse(
          Status.OK,
          { product: productInCache },
          "The required Product served"
        )
      );
  }
  // if not in cache then fetch from db
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, Number(id)));

  if (product) {
    await cache.set(cacheKey, product, CACHE_TTL.SINGLE_PRODUCT);
  }
  return res
    .status(OK)
    .json(
      new ApiResponse(Status.OK, { product }, "Here you go the product by Id")
    );
});

export {
  getAllProductsHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
};
