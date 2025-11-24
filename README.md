# Merchant Hub API

A scalable backend service for managing merchants and products with TypeScript, Express, PostgreSQL, and Drizzle ORM.

## Current Status

- ✅ Products CRUD API (`/api/v1/products`)
- ✅ Zod validation for request payloads
- ✅ Global error handling with structured responses
- ✅ PostgreSQL database with Drizzle ORM
- ✅ Environment-based configuration

## Current Integrations Status

- **Redis**: Integrated via `src/utils/redis.ts`. Used for caching product queries (keys like `products:query:<hash>`) and single-product entries. TTLs in code: `ALL_PRODUCTS` ≈ 600s, `SINGLE_PRODUCT` ≈ 300s; some queries use shorter TTLs (e.g., 120s). Cache entries are invalidated on create/update/delete operations where implemented.

- **RBAC / ABAC Middleware**: Implemented under `src/middlewares` (`auth.middleware.ts`, `rbac.middleware.ts`, `abac.middleware.ts`). Permissions include `orders.cancel`; ownership checks ensure customers may cancel only their own orders (checked both in middleware and service layer).

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express 5
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Caching**: Redis
- **Containerization**: Docker
- **Package Manager**: pnpm

## Setup & Run

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Set up environment variables**
   Create `.env` file:

   ```env
   DATABASE_URL=your_pgDB_url
   PORT=6767
   ```

3. **Run database migrations**

   ```bash
   pnpm db:migrate
   ```

4. **Start development server**

   ```bash
   pnpm dev
   ```

5. **Build for production**
   ```bash
   pnpm build
   pnpm start
   ```

## API Endpoints

### Products

- `GET /api/v1/products` - Get all products
- `POST /api/v1/products` - Create a product
- `PUT /api/v1/products/:id` - Update a product (coming soon)
- `DELETE /api/v1/products/:id` - Delete a product (coming soon)

## Upcoming Features

- Orders management module
- Docker containerization

## Project Structure

```
src/
├── controllers/     # Request handlers
├── db/             # Database config & schemas
├── middlewares/    # Express middlewares
├── routes/         # API routes
├── services/       # Business logic
└── utils/          # Utilities (ApiError, ApiResponse, etc.)
```

## License

ISC
