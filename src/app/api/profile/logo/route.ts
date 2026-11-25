import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { apiErrorResponse, getClientIp, requireApiUser } from "@/server/auth/helpers";
import { db } from "@/server/db";
import { freelancerProfile } from "@/server/db/schema";
import { logAudit } from "@/server/services/audit";
import { DomainError } from "@/server/services/errors";
import { getProfile } from "@/server/services/profile";
import { enforceRateLimit } from "@/server/services/rate-limit";
import {
  MAX_LOGO_BYTES,
  deleteUpload,
  imageWithinLimits,
  readUpload,
  sniffImage,
  storeUpload,
} from "@/server/services/uploads";

export async function POST(request: Request) {
  try {
    const session = await requireApiUser(request);
    await enforceRateLimit(`upload:${session.user.id}`, 10, 60);
    const profile = await getProfile(session.user.id);
    if (!profile) {
      throw new DomainError("VALIDATION", "Créez d'abord votre profil freelance.");
    }
    const form = await request.formData();
    const file = form.get("logo");
    if (!(file instanceof File)) {
      throw new DomainError("VALIDATION", "Fichier manquant.");
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new DomainError("VALIDATION", "Logo trop volumineux (2 Mo max).");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = sniffImage(buffer);
    if (!kind) {
      throw new DomainError("VALIDATION", "Format invalide : PNG ou JPEG uniquement.");
    }
    if (!imageWithinLimits(buffer)) {
      throw new DomainError("VALIDATION", "Image trop grande (2000×2000 max) ou invalide.");
    }
    const relativePath = await storeUpload("logos", buffer, kind === "png" ? "png" : "jpg");
    if (profile.logoPath) {
      await deleteUpload(profile.logoPath);
    }
    await db
      .update(freelancerProfile)
      .set({ logoPath: relativePath })
      .where(eq(freelancerProfile.userId, session.user.id));
    await logAudit({
      userId: session.user.id,
      actor: "user",
      action: "profile.logo_upload",
      entity: "freelancer_profile",
      entityId: profile.id,
      ip: getClientIp(await headers()),
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const profile = await getProfile(session.user.id);
  if (!profile?.logoPath) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const buffer = await readUpload(profile.logoPath);
    const kind = sniffImage(buffer) ?? "png";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": `image/${kind}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
