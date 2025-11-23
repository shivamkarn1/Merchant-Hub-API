import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Client Error ", err));
redisClient.on("connect", () =>
  console.log("Redis  CLient Connected SuccessFully")
);

redisClient.connect().catch(console.error);

const cache = {
  async get(key: string) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Redis get error:", error);
      return null;
    }
  },

  async set(key: string, value: any, ttl: number) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error("Redis set error:", error);
    }
  },
  async del(key: string) {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error("Redis del error:", error);
    }
  },
  async delPattern(pattern: string) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error("Redis delPattern error:", error);
    }
  },
};

export { redisClient, cache };
