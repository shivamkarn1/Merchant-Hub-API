import express, { Router } from "express";
import { getProductsHandler } from "../../controllers/products/products.controller";
const productRouter = Router();

productRouter.get("/allProducts", getProductsHandler);

export default productRouter;
