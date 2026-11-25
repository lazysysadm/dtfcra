import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import * as schema from "./schema";

// Reuse the pool across HMR reloads in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as { __dtfcraPool?: Pool };

function createPool(): Pool {
  const created = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    options: "-c statement_timeout=15000",
  });
  // An unhandled error on an idle client would otherwise crash the process.
  created.on("error", (err) => {
    logger.error({ err }, "idle postgres client error");
  });
  return created;
}

const pool = globalForDb.__dtfcraPool ?? createPool();

if (env.NODE_ENV !== "production") {
  globalForDb.__dtfcraPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
