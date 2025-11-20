import express, { json, Response, Request, urlencoded } from "express";
const app = express();
app.use(json());

app.use(urlencoded({ extended: true }));

// products routes
import productRouter from "./routes/products/products.routes";
app.use("/api/v1/products", productRouter);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Server is Running Great", success: true });
});
// error handler (should be last middleware)
import errorHandler from "./middlewares/errorHandler";

app.use(errorHandler);

export default app;
