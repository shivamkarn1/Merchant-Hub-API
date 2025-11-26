import swaggerJsdoc from "swagger-jsdoc";
import { version } from "../../package.json";

/**
 * Swagger/OpenAPI Configuration
 * Production-ready API documentation setup
 */

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: "3.0.0",
  info: {
    title: "Merchant Hub API",
    version,
    description: `
## Overview
A production-ready RESTful API for merchant and e-commerce management.

### Features
- **Products Management**: Full CRUD operations with advanced filtering
- **Orders Management**: Order lifecycle management with status tracking
- **Authentication**: JWT-based authentication with role-based access
- **Authorization**: RBAC (Role-Based) and ABAC (Attribute-Based) access control
- **Caching**: Redis caching for optimized performance

### Authentication
This API uses JWT Bearer token authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your_token>
\`\`\`

### Rate Limiting
API endpoints are rate-limited to ensure fair usage and service stability.

### Roles
- **super_admin**: Full system access
- **admin**: Administrative access
- **merchant**: Merchant-level access to own resources
- **customer**: Customer-level access to own data
- **viewer**: Read-only access
    `,
    contact: {
      name: "API Support",
      email: "support@merchant-hub.com",
    },
    license: {
      name: "ISC",
      url: "https://opensource.org/licenses/ISC",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "API v1",
    },
    {
      url: "http://localhost:6767/api/v1",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Products",
      description: "Product management endpoints",
    },
    {
      name: "Orders",
      description: "Order management endpoints",
    },
    {
      name: "Health",
      description: "Service health check endpoints",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT Authorization header using Bearer scheme",
      },
    },
    schemas: {
      // Common schemas
      ApiResponse: {
        type: "object",
        properties: {
          statusCode: {
            type: "integer",
            description: "HTTP status code",
          },
          data: {
            type: "object",
            description: "Response data",
          },
          message: {
            type: "string",
            description: "Response message",
          },
          success: {
            type: "boolean",
            description: "Operation success status",
          },
        },
      },
      ApiError: {
        type: "object",
        properties: {
          statusCode: {
            type: "integer",
            description: "HTTP status code",
          },
          message: {
            type: "string",
            description: "Error message",
          },
          errors: {
            type: "array",
            items: {
              type: "object",
            },
            description: "Detailed error information",
          },
          success: {
            type: "boolean",
            example: false,
          },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "Number of items per page",
          },
          offset: {
            type: "integer",
            description: "Offset from start",
          },
          count: {
            type: "integer",
            description: "Number of items returned",
          },
        },
      },

      // Product schemas
      Product: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "Product ID",
          },
          name: {
            type: "string",
            description: "Product name",
          },
          description: {
            type: "string",
            description: "Product description",
          },
          sku: {
            type: "string",
            description: "Stock Keeping Unit",
          },
          price: {
            type: "string",
            description: "Product price",
          },
          stock: {
            type: "integer",
            description: "Available stock quantity",
          },
          merchant_id: {
            type: "integer",
            description: "Merchant ID who owns the product",
          },
          created_by: {
            type: "integer",
            description: "User ID who created the product",
          },
          created_at: {
            type: "string",
            format: "date-time",
            description: "Creation timestamp",
          },
          updated_at: {
            type: "string",
            format: "date-time",
            description: "Last update timestamp",
          },
          deleted_at: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Soft delete timestamp",
          },
        },
      },
      CreateProductInput: {
        type: "object",
        required: ["name", "price"],
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 255,
            description: "Product name",
          },
          description: {
            type: "string",
            description: "Product description",
          },
          sku: {
            type: "string",
            description: "Stock Keeping Unit",
          },
          price: {
            type: "number",
            minimum: 0,
            description: "Product price",
          },
          stock: {
            type: "integer",
            minimum: 0,
            default: 0,
            description: "Initial stock quantity",
          },
        },
      },
      UpdateProductInput: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 255,
            description: "Product name",
          },
          description: {
            type: "string",
            description: "Product description",
          },
          sku: {
            type: "string",
            description: "Stock Keeping Unit",
          },
          price: {
            type: "number",
            minimum: 0,
            description: "Product price",
          },
          stock: {
            type: "integer",
            minimum: 0,
            description: "Stock quantity",
          },
        },
      },

      // Order schemas
      Order: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "Order ID",
          },
          order_number: {
            type: "string",
            description: "Unique order number",
          },
          customer_id: {
            type: "integer",
            description: "Customer user ID",
          },
          merchant_id: {
            type: "integer",
            description: "Merchant user ID",
          },
          status: {
            type: "string",
            enum: [
              "pending",
              "confirmed",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
            ],
            description: "Order status",
          },
          total_amount: {
            type: "string",
            description: "Total order amount",
          },
          currency: {
            type: "string",
            default: "NPR",
            description: "Currency code",
          },
          shipping_address: {
            type: "object",
            description: "Shipping address details",
          },
          billing_address: {
            type: "object",
            description: "Billing address details",
          },
          created_at: {
            type: "string",
            format: "date-time",
            description: "Order creation timestamp",
          },
          updated_at: {
            type: "string",
            format: "date-time",
            description: "Last update timestamp",
          },
        },
      },
      CreateOrderInput: {
        type: "object",
        required: ["customer_id", "merchant_id", "total_amount", "items"],
        properties: {
          customer_id: {
            type: "integer",
            description: "Customer user ID",
          },
          merchant_id: {
            type: "integer",
            description: "Merchant user ID",
          },
          total_amount: {
            type: "string",
            description: "Total order amount",
          },
          currency: {
            type: "string",
            default: "NPR",
            description: "Currency code",
          },
          shipping_address: {
            type: "object",
            description: "Shipping address details",
          },
          billing_address: {
            type: "object",
            description: "Billing address details",
          },
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["product_id", "quantity", "unit_price"],
              properties: {
                product_id: {
                  type: "integer",
                  description: "Product ID",
                },
                quantity: {
                  type: "integer",
                  minimum: 1,
                  description: "Order quantity",
                },
                unit_price: {
                  type: "string",
                  description: "Unit price at time of order",
                },
              },
            },
          },
        },
      },
      UpdateOrderStatusInput: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: [
              "pending",
              "confirmed",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
            ],
            description: "New order status",
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication token missing or invalid",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ApiError",
            },
            example: {
              statusCode: 401,
              message: "Authentication required",
              success: false,
            },
          },
        },
      },
      ForbiddenError: {
        description: "Insufficient permissions",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ApiError",
            },
            example: {
              statusCode: 403,
              message: "Access denied to this resource",
              success: false,
            },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ApiError",
            },
            example: {
              statusCode: 404,
              message: "Resource not found",
              success: false,
            },
          },
        },
      },
      ValidationError: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ApiError",
            },
            example: {
              statusCode: 400,
              message: "Validation failed",
              errors: [
                {
                  path: "name",
                  message: "Name is required",
                },
              ],
              success: false,
            },
          },
        },
      },
      InternalServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ApiError",
            },
            example: {
              statusCode: 500,
              message: "Internal server error",
              success: false,
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const swaggerOptions: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ["./src/routes/**/*.ts", "./src/controllers/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export default swaggerSpec;
