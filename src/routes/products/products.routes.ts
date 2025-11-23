import { Router } from "express";
import {
  createProductHandler,
  getAllProductsHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
} from "../../controllers/products/products.controller";
const productRouter = Router();

// Prefix : /api/v1/products/.....

productRouter.get("/allProducts", getAllProductsHandler);
productRouter.get("/allProducts/search", getAllProductsHandler);
productRouter.get("/:id", getProductByIdHandler);
productRouter.post("/create", createProductHandler);
productRouter.put("/update/:id", updateProductHandler);
productRouter.delete("/delete/:id", deleteProductHandler);

export default productRouter;
