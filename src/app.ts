import express, { Response, Request, urlencoded } from "express";

const app = express();
app.use(express.json());

app.use(urlencoded({ extended: true }));

// products routes

import productRouter from "./routes/products/product.routes";
app.use("/products", productRouter);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Server is Running Great", success: true });
});

export default app;
