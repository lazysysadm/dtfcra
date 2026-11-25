import { readdirSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// Health probe: DB reachable and all local migrations applied.
// Deliberately leaks no detail (no version, no error message).
export async function GET() {
  try {
    const migrationsDir = path.join(process.cwd(), "src/server/db/migrations");
    const expected = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).length;
    const result = await db.execute(
      sql`select count(*)::text as count from drizzle.__drizzle_migrations`,
    );
    const rows = result.rows as Array<{ count: string }>;
    const applied = Number(rows[0]?.count ?? 0);
    if (applied < expected) {
      return NextResponse.json({ status: "error" }, { status: 503 });
    }
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
