import { OK, Created } from "../../utils/HttpStatusCodes";
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

const CACHE_TTL = {
  ALL_PRODUCTS: 600, // 10 mins
  SINGLE_PRODUCT: 300,
};

const getAllProductsHandler = asyncHandler(async (req, res) => {
  const cacheKey = "products:all";
  // TRY TO GET FROM CACHE
  const cachedProducts = await cache.get(cacheKey);
  if (cachedProducts) {
    return res
      .status(OK)
      .json(
        new ApiResponse(
          Status.OK,
          { products: cachedProducts },
          "All Products Data Served"
        )
      );
  }

  // if not in cache then fetch from db
  const products = await db.select().from(productsTable);

  // meanwhile save in cache also
  await cache.set(cacheKey, products, CACHE_TTL.ALL_PRODUCTS);

  return res
    .status(OK)
    .json(
      new ApiResponse(
        Status.OK,
        { products },
        "Here you go all the products served"
      )
    );
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

  // invalidate all products cache
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
  return res
    .status(OK)
    .json(new ApiResponse(Status.OK, {}, "Product Updated Successfully"));
});

const deleteProductHandler = asyncHandler(async (req, res) => {
  return res
    .status(OK)
    .json(new ApiResponse(Status.OK, {}, "Product Deleted Successfully"));
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
