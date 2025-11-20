import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { db } from "../../db/db";
import { productsTable } from "../../db/products.schema";
import Status from "../../utils/HttpStatusCodes";
import { ApiError } from "../../utils/ApiError";
import createProductSchema from "./product.validation";
import { createProduct } from "../../services/products/products.service";
import { zodToApiError } from "../../utils/handleZodError";

const getAllProductsHandler = asyncHandler(async (req, res) => {
  const products = await db.select().from(productsTable);
  return res
    .status(Status.OK)
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
  // and last me return success response
  return res
    .status(Status.Created)
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
    .status(Status.OK)
    .json(new ApiResponse(Status.OK, {}, "Product Updated Successfully"));
});

const deleteProductHandler = asyncHandler(async (req, res) => {
  return res
    .status(Status.OK)
    .json(new ApiResponse(Status.OK, {}, "Product Deleted Successfully"));
});

const getProductByIdHandler = asyncHandler(async (req, res) => {
  return res
    .status(Status.OK)
    .json(new ApiResponse(Status.OK, {}, "Here you go the product by Id"));
});

export {
  getAllProductsHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
};
