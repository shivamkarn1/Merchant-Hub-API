<div align="center">

# 🏪 Merchant Hub API

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

**A production-ready, scalable RESTful API for merchant and e-commerce management**

[Getting Started](#-getting-started) •
[API Documentation](#-api-documentation) •
[Features](#-features) •
[Architecture](#-architecture) •
[Contributing](#-contributing)

</div>

---

## Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Docker Deployment](#-docker-deployment)
  - [Development with Docker](#development-with-docker)
  - [Production Deployment](#production-deployment)
- [API Documentation](#-api-documentation)
  - [Authentication](#authentication)
  - [Products API](#products-api)
  - [Orders API](#orders-api)
- [Architecture](#-architecture)
  - [Project Structure](#project-structure)
  - [Database Schema](#database-schema)
  - [Caching Strategy](#caching-strategy)
  - [Security](#security)
- [Configuration](#-configuration)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## Features

### Core Features

- ** Product Management** - Full CRUD operations with advanced filtering, sorting, and pagination
- **Order Management** - Complete order lifecycle with status tracking
- **Authentication** - JWT-based secure authentication
- **Authorization** - Role-Based (RBAC) and Attribute-Based (ABAC) access control
- **High Performance** - Redis caching for optimized response times
- **API Documentation** - Interactive Swagger/OpenAPI documentation

### Technical Features

- **Containerized** - Docker and Docker Compose ready for any environment
- **Type-Safe ORM** - Drizzle ORM with full TypeScript support
- **Input Validation** - Zod schema validation for all endpoints
- **Error Handling** - Centralized error handling with structured responses
- **Health Checks** - Built-in health monitoring endpoints
- **Graceful Shutdown** - Proper cleanup of connections on termination

---

## Tech Stack

| Category             | Technology              |
| -------------------- | ----------------------- |
| **Runtime**          | Node.js 20+             |
| **Language**         | TypeScript 5.9          |
| **Framework**        | Express 5.x             |
| **Database**         | PostgreSQL 16           |
| **ORM**              | Drizzle ORM             |
| **Cache**            | Redis 7                 |
| **Validation**       | Zod                     |
| **Documentation**    | Swagger/OpenAPI         |
| **Containerization** | Docker & Docker Compose |
| **Package Manager**  | pnpm                    |

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** >= 20.x ([Download](https://nodejs.org/))
- **pnpm** >= 8.x (\`npm install -g pnpm\`)
- **PostgreSQL** >= 16 ([Download](https://www.postgresql.org/download/))
- **Redis** >= 7 ([Download](https://redis.io/download/))
- **Docker** (optional) ([Download](https://www.docker.com/get-started/))

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/shivamkarn1/Merchant-Hub-API.git
   cd Merchant-Hub-API
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   pnpm install
   \`\`\`

### Environment Setup

1. **Create environment file**
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. **Configure environment variables**
   \`\`\`env

   # Server

   NODE_ENV=development
   PORT=6767

   # Database

   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/merchant_hub

   # Redis

   REDIS_URL=redis://localhost:6379

   # JWT

   JWT_SECRET=your-super-secret-key-change-in-production
   \`\`\`

### Database Setup

1. **Create the database**
   \`\`\`bash
   createdb merchant_hub
   \`\`\`

2. **Run migrations**
   \`\`\`bash
   pnpm db:migrate
   \`\`\`

3. **Generate migrations (for schema changes)**
   \`\`\`bash
   pnpm db:generate
   \`\`\`

4. **View database with Drizzle Studio**
   \`\`\`bash
   pnpm db:studio
   \`\`\`

### Running the Application

**Development mode** (with hot-reload):
\`\`\`bash
pnpm dev
\`\`\`

**Production mode**:
\`\`\`bash
pnpm build
pnpm start
\`\`\`

The API will be available at \`http://localhost:6767\`

---

## 🐳 Docker Deployment

### Development with Docker

Start all services with hot-reload enabled:

\`\`\`bash

# Start development environment

docker-compose -f docker-compose.dev.yml up -d

# View logs

docker-compose -f docker-compose.dev.yml logs -f api

# Stop services

docker-compose -f docker-compose.dev.yml down
\`\`\`

**Optional:** Enable Redis Commander for GUI access:
\`\`\`bash
docker-compose -f docker-compose.dev.yml --profile tools up -d

# Access at http://localhost:8081

\`\`\`

### Production Deployment

1. **Build and start production services**
   \`\`\`bash

   # Build the image

   docker-compose build

   # Start services

   docker-compose up -d

   # Check status

   docker-compose ps
   \`\`\`

2. **Run migrations in container**
   \`\`\`bash
   docker-compose exec api pnpm db:migrate
   \`\`\`

3. **View logs**
   \`\`\`bash
   docker-compose logs -f api
   \`\`\`

4. **Stop and remove containers**
   \`\`\`bash
   docker-compose down

   # Remove volumes (WARNING: deletes data)

   docker-compose down -v
   \`\`\`

**Docker Services:**

| Service      | Port | Description          |
| ------------ | ---- | -------------------- |
| \`api\`      | 6767 | Main API application |
| \`postgres\` | 5432 | PostgreSQL database  |
| \`redis\`    | 6379 | Redis cache server   |

---

## API Documentation

### Interactive Documentation

Swagger UI is available at:
\`\`\`
http://localhost:6767/api-docs
\`\`\`

OpenAPI specification (JSON):
\`\`\`
http://localhost:6767/api-docs.json
\`\`\`

### Authentication

All protected endpoints require JWT authentication:

\`\`\`http
Authorization: Bearer <your_jwt_token>
\`\`\`

**User Roles:**
| Role | Description | Permissions |
|------|-------------|-------------|
| \`super_admin\` | Full system access | All operations |
| \`admin\` | Administrative access | Manage all resources |
| \`merchant\` | Merchant-level access | Own resources only |
| \`customer\` | Customer-level access | Own data only |
| \`viewer\` | Read-only access | View resources |

### Products API

| Method     | Endpoint                                | Description                     | Auth |
| ---------- | --------------------------------------- | ------------------------------- | ---- |
| \`GET\`    | \`/api/v1/products/allProducts\`        | Get all products with filtering | ❌   |
| \`GET\`    | \`/api/v1/products/allProducts/search\` | Search products                 | ❌   |
| \`GET\`    | \`/api/v1/products/:id\`                | Get product by ID               | ✅   |
| \`POST\`   | \`/api/v1/products/create\`             | Create new product              | ✅   |
| \`PUT\`    | \`/api/v1/products/update/:id\`         | Update product                  | ✅   |
| \`DELETE\` | \`/api/v1/products/delete/:id\`         | Delete product (soft)           | ✅   |

**Query Parameters for GET /products/allProducts:**

| Parameter     | Type    | Description                                      |
| ------------- | ------- | ------------------------------------------------ |
| \`q\`         | string  | Search in name/description                       |
| \`sku\`       | string  | Filter by SKU                                    |
| \`minPrice\`  | number  | Minimum price filter                             |
| \`maxPrice\`  | number  | Maximum price filter                             |
| \`inStock\`   | boolean | Filter by stock availability                     |
| \`sortBy\`    | string  | Sort field (\`price\`, \`name\`, \`created_at\`) |
| \`sortOrder\` | string  | Sort direction (\`asc\`, \`desc\`)               |
| \`limit\`     | number  | Items per page (max: 100)                        |
| \`offset\`    | number  | Pagination offset                                |

### Orders API

| Method   | Endpoint                      | Description                       | Auth | Permission        |
| -------- | ----------------------------- | --------------------------------- | ---- | ----------------- |
| \`GET\`  | \`/api/v1/orders\`            | Get all orders (filtered by role) | ✅   | \`orders.read\`   |
| \`GET\`  | \`/api/v1/orders/:id\`        | Get order by ID                   | ✅   | \`orders.read\`   |
| \`POST\` | \`/api/v1/orders/create\`     | Create new order                  | ✅   | \`orders.create\` |
| \`PUT\`  | \`/api/v1/orders/:id/status\` | Update order status               | ✅   | \`orders.update\` |
| \`PUT\`  | \`/api/v1/orders/:id/cancel\` | Cancel order                      | ✅   | \`orders.cancel\` |

### Health Check

\`\`\`http
GET /health
\`\`\`

Response:
\`\`\`json
{
"status": "healthy",
"timestamp": "2025-11-26T10:30:00.000Z",
"uptime": 3600,
"version": "1.0.0"
}
\`\`\`

---

## 🏗️ Architecture

### Project Structure

\`\`\`
merchant-api/
├── src/
│ ├── app.ts # Express app configuration
│ ├── index.ts # Application entry point
│ ├── config/
│ │ └── swagger.ts # Swagger/OpenAPI configuration
│ ├── controllers/ # Request handlers
│ │ ├── orders/
│ │ │ └── orders.controller.ts
│ │ └── products/
│ │ ├── product.validation.ts
│ │ └── products.controller.ts
│ ├── db/ # Database layer
│ │ ├── db.ts # Database connection
│ │ ├── schema.ts # Combined schema exports
│ │ ├── orders.schema.ts # Orders table schema
│ │ ├── products.schema.ts # Products table schema
│ │ └── users.schema.ts # Users table schema
│ ├── middlewares/ # Express middlewares
│ │ ├── abac.middleware.ts # Attribute-based access control
│ │ ├── auth.middleware.ts # JWT authentication
│ │ ├── errorHandler.ts # Global error handler
│ │ └── rbac.middleware.ts # Role-based access control
│ ├── routes/ # Route definitions
│ │ ├── orders/
│ │ │ └── orders.routes.ts
│ │ └── products/
│ │ └── products.routes.ts
│ ├── services/ # Business logic
│ │ ├── orders/
│ │ │ └── orders.service.ts
│ │ └── products/
│ │ └── products.service.ts
│ ├── types/ # TypeScript type definitions
│ │ ├── auth.types.ts
│ │ └── express.d.ts
│ └── utils/ # Utility functions
│ ├── ApiError.ts
│ ├── ApiResponse.ts
│ ├── asyncHandler.ts
│ ├── handleZodError.ts
│ ├── HttpStatusCodes.ts
│ └── redis.ts # Redis client & caching
├── drizzle/ # Database migrations
├── docker-compose.yml # Production Docker setup
├── docker-compose.dev.yml # Development Docker setup
├── Dockerfile # Production Dockerfile
├── Dockerfile.dev # Development Dockerfile
├── drizzle.config.ts # Drizzle ORM configuration
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

### Database Schema

\`\`\`
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ users │ │ products │ │ orders │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ id │ │ id │ │ id │
│ email │ │ name │ │ order_number │
│ name │ │ description │ │ customer_id │
│ password_hash │ │ sku │ │ merchant_id │
│ role │ │ price │ │ status │
│ merchant_id │ │ stock │ │ total_amount │
│ parent_user_id │ │ merchant_id │ │ currency │
│ is_active │ │ created_by │ │ shipping_addr │
│ created_at │ │ created_at │ │ billing_addr │
│ updated_at │ │ updated_at │ │ created_at │
└─────────────────┘ │ deleted_at │ │ updated_at │
└─────────────────┘ └─────────────────┘
│
▼
┌─────────────────┐
│ order_items │
├─────────────────┤
│ id │
│ order_id │
│ product_id │
│ quantity │
│ unit_price │
│ subtotal │
│ created_at │
└─────────────────┘
\`\`\`

### Caching Strategy

Redis caching is implemented with the following TTLs:

| Cache Type     | TTL   | Description                |
| -------------- | ----- | -------------------------- |
| Product List   | 2 min | Paginated product queries  |
| Single Product | 5 min | Individual product details |
| Order List     | 1 min | User-specific order lists  |
| Single Order   | 2 min | Individual order details   |

**Cache Invalidation:**

- Product cache invalidated on create/update/delete
- Order cache invalidated on create/status update/cancel

### Security

- **JWT Authentication** - Stateless token-based authentication
- **RBAC** - Role-based permission system
- **ABAC** - Attribute-based resource access control
- **Input Validation** - Zod schema validation on all inputs
- **SQL Injection Prevention** - Parameterized queries via Drizzle ORM
- **Security Headers** - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Non-root Docker User** - Container runs as unprivileged user

---

## ⚙️ Configuration

### Environment Variables

| Variable         | Required | Default                    | Description                  |
| ---------------- | -------- | -------------------------- | ---------------------------- |
| \`NODE_ENV\`     | No       | \`development\`            | Environment mode             |
| \`PORT\`         | No       | \`6767\`                   | Server port                  |
| \`DATABASE_URL\` | Yes      | -                          | PostgreSQL connection string |
| \`REDIS_URL\`    | No       | \`redis://localhost:6379\` | Redis connection string      |
| \`JWT_SECRET\`   | Yes      | -                          | JWT signing secret           |
| \`PGSSLMODE\`    | No       | -                          | PostgreSQL SSL mode          |

### NPM Scripts

| Script               | Description                              |
| -------------------- | ---------------------------------------- |
| \`pnpm dev\`         | Start development server with hot-reload |
| \`pnpm build\`       | Build TypeScript to JavaScript           |
| \`pnpm start\`       | Start production server                  |
| \`pnpm db:generate\` | Generate database migrations             |
| \`pnpm db:migrate\`  | Run database migrations                  |
| \`pnpm db:studio\`   | Open Drizzle Studio GUI                  |

---

## 🧪 Testing

\`\`\`bash

# Run tests (coming soon)

pnpm test
\`\`\`

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   \`\`\`bash
   git checkout -b feature/amazing-feature
   \`\`\`
3. **Commit your changes**
   \`\`\`bash
   git commit -m 'feat: add amazing feature'
   \`\`\`
4. **Push to the branch**
   \`\`\`bash
   git push origin feature/amazing-feature
   \`\`\`
5. **Open a Pull Request**

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- \`feat:\` - New features
- \`fix:\` - Bug fixes
- \`docs:\` - Documentation changes
- \`style:\` - Code style changes
- \`refactor:\` - Code refactoring
- \`test:\` - Test additions/changes
- \`chore:\` - Build process/auxiliary tools

---

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by [Shivam Karn](https://github.com/shivamkarn1)**

⭐ Star this repository if you find it helpful!

</div>
