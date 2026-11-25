import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });

async function main() {
  await migrate(drizzle(pool), { migrationsFolder: "src/server/db/migrations" });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
