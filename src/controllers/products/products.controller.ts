import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";

const getAllProductsHandler = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Here you go all the products served"));
});

const createProductHandler = asyncHandler(async (req, res) => {
  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Product Created Successfully"));
});

const updateProductHandler = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Product Updated Successfully"));
});

const deleteProductHandler = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Product Deleted Successfully"));
});

const getProductByIdHandler = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Here you go the product by Id"));
});

export {
  getAllProductsHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
};
