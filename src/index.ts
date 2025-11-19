import express, { Request, Response } from "express";
import productRouter from "./routes/products/product.routes";
import app from "./app";

const PORT = process.env.PORT || 6767;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
