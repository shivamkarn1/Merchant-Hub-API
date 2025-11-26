import express, { json, Response, Request, urlencoded } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";

const app = express();

// Body parsing middleware
app.use(json({ limit: "10mb" }));
app.use(urlencoded({ extended: true, limit: "10mb" }));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// API Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Merchant Hub API Documentation",
  })
);

// Serve swagger spec as JSON
app.get("/api-docs.json", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// products routes
import productRouter from "./routes/products/products.routes";
app.use("/api/v1/products", productRouter);

// orders routes
import orderRouter from "./routes/orders/orders.routes";
app.use("/api/v1/orders", orderRouter);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Merchant Hub API",
    version: "1.0.0",
    documentation: "/api-docs",
    health: "/health",
    success: true,
  });
});

// error handler (should be last middleware)
import errorHandler from "./middlewares/errorHandler";

app.use(errorHandler);

export default app;
