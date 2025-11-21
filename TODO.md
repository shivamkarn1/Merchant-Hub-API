# TODO

## Current Status

- Basic merchant API with products CRUD endpoints, Zod validation, error handling, and PostgreSQL + Drizzle ORM.

## Next Steps

### Performance & Caching

- [ ] Add Redis for caching frequently accessed products
- [ ] Implement cache invalidation on create/update/delete
- [ ] Add database indexes on `sku`, `name`, and `deleted_at`

### Core Features

- [ ] Add query params (pagination, search, filters) to GET /products
- [ ] Implement update product (PUT/PATCH /products/:id)
- [ ] Implement delete product (soft delete with `deleted_at`)
- [ ] Add get product by ID with validation
- [ ] Build orders module (schema, routes, controllers)
- [ ] Add authentication & authorization (JWT)

### Infrastructure

- [ ] Dockerize the app (Dockerfile + docker-compose with postgres + redis)
- [ ] Add environment-based config (dev/staging/prod)
- [ ] Set up database migrations workflow
- [ ] Add health check endpoint

### Code Quality

- [ ] Add input validation middleware (centralized Zod handler)
- [ ] Make `ApiResponse` generic for type-safe responses
- [ ] Add request logging middleware
- [ ] Add API documentation

### Would be Nice to Have

- [ ] Add rate limiting
- [ ] Image upload for products
- [ ] Full-text search with Postgres or Elasticsearch
