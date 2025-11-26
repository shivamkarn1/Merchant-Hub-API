import { createClient, RedisClientType } from "redis";

/**
 * Redis Cache Configuration
 * Production-ready caching layer with connection pooling and error handling
 */

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 min - for frequently changing data
  MEDIUM: 300, // 5 mins - for moderately changing data
  LONG: 600, // 10 mins - for stable data
  VERY_LONG: 3600, // 1 hr - for rarely changing data
  PRODUCTS_LIST: 120, // 2 mins - product listings
  PRODUCT_DETAIL: 300, // 5 mins - single product
  ORDERS_LIST: 60, // 1 mi- order listings
  ORDER_DETAIL: 120, // 2 mins - single order
} as const;

// Cache key prefixes for organization
export const CACHE_KEYS = {
  PRODUCTS: {
    ALL: "products:all",
    SINGLE: (id: number) => `products:${id}`,
    QUERY: (hash: string) => `products:query:${hash}`,
    USER: (userId: number) => `products:user:${userId}`,
  },
  ORDERS: {
    ALL: "orders:all",
    SINGLE: (id: number) => `orders:${id}`,
    USER: (userId: number) => `orders:user:${userId}`,
    MERCHANT: (merchantId: number) => `orders:merchant:${merchantId}`,
  },
} as const;

let redisClient: RedisClientType;
let isConnected = false;

/**
 * Initialize Redis client with connection handling
 */
const initializeRedis = (): RedisClientType => {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error("Redis: Max reconnection attempts reached");
          return new Error("Max reconnection attempts reached");
        }
        const delay = Math.min(retries * 100, 3000);
        console.log(
          `Redis: Reconnecting in ${delay}ms... (attempt ${retries})`
        );
        return delay;
      },
      connectTimeout: 10000,
    },
  });

  redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err.message);
    isConnected = false;
  });

  redisClient.on("connect", () => {
    console.log("Redis Client Connected Successfully");
    isConnected = true;
  });

  redisClient.on("disconnect", () => {
    console.log(" Redis Client Disconnected");
    isConnected = false;
  });

  redisClient.on("reconnecting", () => {
    console.log("Redis Client Reconnecting...");
  });

  return redisClient;
};

/**
 * Connect to Redis
 */
const connectRedis = async (): Promise<void> => {
  try {
    const client = initializeRedis();
    if (!client.isOpen) {
      await client.connect();
    }
  } catch (error) {
    console.error("Redis connection error:", error);
    // not throwingerror->Allowing apps to work without cache
  }
};

/**
 * Graceful shutdown
 */
const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      console.log("Redis client disconnected gracefully");
    }
  } catch (error) {
    console.error("Redis disconnect error:", error);
  }
};

/**
 * Cache utility object with production-ready methods
 */
const cache = {
  /**
   * Check if Redis is connected and available
   */
  isAvailable(): boolean {
    return isConnected && redisClient?.isOpen === true;
  },

  /**
   * Get cached value by key
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const data = await redisClient.get(key);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Redis GET error for key "${key}":`, error);
      return null;
    }
  },

  /**
   * Set cached value with TTL
   */
  async set(
    key: string,
    value: unknown,
    ttlSeconds: number = CACHE_TTL.MEDIUM
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Redis SET error for key "${key}":`, error);
      return false;
    }
  },

  /**
   * Delete a single cache key
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key "${key}":`, error);
      return false;
    }
  },

  /**
   * Delete multiple keys matching a pattern
   * Warning: Use sparingly in production as KEYS command can be slow
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error(`Redis DEL_PATTERN error for pattern "${pattern}":`, error);
      return 0;
    }
  },

  /**
   * Get or set cache with a factory function
   * Implements cache-aside pattern
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute factory function
    const value = await factory();

    // Cache the result (fire and forget)
    this.set(key, value, ttlSeconds).catch(() => {});

    return value;
  },

  /**
   * Invalidate all caches related to products
   */
  async invalidateProductCache(productId?: number): Promise<void> {
    const promises: Promise<unknown>[] = [this.delPattern("products:*")];

    if (productId) {
      promises.push(this.del(CACHE_KEYS.PRODUCTS.SINGLE(productId)));
    }

    await Promise.allSettled(promises);
  },

  /**
   * Invalidate all caches related to orders
   */
  async invalidateOrderCache(
    orderId?: number,
    userId?: number,
    merchantId?: number
  ): Promise<void> {
    const promises: Promise<unknown>[] = [this.del(CACHE_KEYS.ORDERS.ALL)];

    if (orderId) {
      promises.push(this.del(CACHE_KEYS.ORDERS.SINGLE(orderId)));
    }
    if (userId) {
      promises.push(this.del(CACHE_KEYS.ORDERS.USER(userId)));
    }
    if (merchantId) {
      promises.push(this.del(CACHE_KEYS.ORDERS.MERCHANT(merchantId)));
    }

    await Promise.allSettled(promises);
  },

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key "${key}":`, error);
      return false;
    }
  },

  /**
   * Get TTL remaining for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) return -1;

    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key "${key}":`, error);
      return -1;
    }
  },
};

// Initialize connection on module load
connectRedis();

// Handle process termination
process.on("SIGINT", async () => {
  await disconnectRedis();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectRedis();
  process.exit(0);
});

export { redisClient, cache, connectRedis, disconnectRedis };
