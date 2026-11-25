import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
  client,
  clientContact,
  freelancerProfile,
  mission,
  timesheet,
  timesheetEntry,
} from "@/server/db/schema";
import { enforceRateLimit } from "@/server/services/rate-limit";

// RGPD portability: full JSON dump of the user's business data.
// Auth secrets (password hashes, sessions, tokens) are never included.
// Requires a fresh session (< 10 min) since it exposes all personal data.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ageMs = Date.now() - new Date(session.session.createdAt).getTime();
  if (ageMs > 10 * 60 * 1000) {
    return Response.json(
      { error: "Session trop ancienne : reconnectez-vous pour exporter vos données." },
      { status: 401 },
    );
  }
  await enforceRateLimit(`me-export:${session.user.id}`, 5, 60);
  const userId = session.user.id;
  const [profile, clients, contacts, missions, sheets, entries] = await Promise.all([
    db.select().from(freelancerProfile).where(eq(freelancerProfile.userId, userId)),
    db.select().from(client).where(eq(client.userId, userId)),
    db.select().from(clientContact).where(eq(clientContact.userId, userId)),
    db.select().from(mission).where(eq(mission.userId, userId)),
    db.select().from(timesheet).where(eq(timesheet.userId, userId)),
    db.select().from(timesheetEntry).where(eq(timesheetEntry.userId, userId)),
  ]);
  return Response.json(
    {
      exportedAt: new Date().toISOString(),
      user: { id: userId, email: session.user.email, name: session.user.name },
      profile,
      clients,
      contacts,
      missions,
      timesheets: sheets,
      entries,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="dtfcra-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
