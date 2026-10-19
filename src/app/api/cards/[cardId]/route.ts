import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { readSessionToken, resolveSession } from "@/lib/auth";
import { toCard } from "@/app/api/cards/route";
import type { CardControls } from "@/lib/types";
import { clamp } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PatchBody {
  controls?: Partial<CardControls>;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ cardId: string }> },
): Promise<Response> {
  const user = await resolveSession(readSessionToken(request));
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const { cardId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as PatchBody;

  const [existing] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.ownerId, user.id)));
  if (!existing) return Response.json({ error: "card not found" }, { status: 404 });

  const next: CardControls = { ...existing.controls, ...(body.controls ?? {}) };
  next.dailyOnlineLimit = clamp(Math.round(next.dailyOnlineLimit ?? 0), 0, 250_000);
  next.dailyAtmLimit = clamp(Math.round(next.dailyAtmLimit ?? 0), 0, 20_000);
  next.frozen = Boolean(next.frozen);

  const [updated] = await db
    .update(cards)
    .set({ controls: next })
    .where(and(eq(cards.id, cardId), eq(cards.ownerId, user.id)))
    .returning();

  if (!updated) return Response.json({ error: "update failed" }, { status: 500 });

  return Response.json({ card: toCard(updated) });
}
