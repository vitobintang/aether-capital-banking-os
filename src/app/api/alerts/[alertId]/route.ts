import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { readSessionToken, resolveSession } from "@/lib/auth";
import type { SecurityAlert } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ResolveBody {
  resolved?: boolean;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ alertId: string }> },
): Promise<Response> {
  const user = await resolveSession(readSessionToken(request));
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const { alertId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as ResolveBody;

  const [updated] = await db
    .update(alerts)
    .set({ resolved: Boolean(body.resolved ?? true) })
    .where(and(eq(alerts.id, alertId), eq(alerts.ownerId, user.id)))
    .returning();

  if (!updated) return Response.json({ error: "alert not found" }, { status: 404 });

  const alert: SecurityAlert = {
    id: updated.id,
    ts: updated.ts,
    severity: updated.severity,
    title: updated.title,
    detail: updated.detail,
    confidence: updated.confidence,
    geo: updated.geo,
    ledgerId: updated.ledgerId,
    resolved: updated.resolved,
    vector: updated.vector,
  };

  return Response.json({ alert });
}
