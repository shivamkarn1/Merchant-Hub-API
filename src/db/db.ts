import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

export const db = drizzle(pool);

// export const connectDB = async () => {
//   try {
//     console.log("Attempting database connection...");
//     console.log(
//       "DATABASE_URL:",
//       process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")
//     ); // Hide password

//     const client = await pool.connect();
//     const result = await client.query("SELECT NOW()");
//     console.log("✅ Database connected successfully");
//     client.release();
//   } catch (err) {
//     console.error("❌ Database connection failed:", err);
//     console.error("\n Troubleshooting tips:");
//     console.error("   1. Check if DATABASE_URL is set correctly in .env file");
//     console.error("   2. Verify the database server is running and accessible");
//     console.error("   3. Check firewall/network settings");
//     console.error("   4. Ensure credentials are correct");
//     throw err;
//   }
// };
