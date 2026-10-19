import { readSessionToken, resolveSession } from "@/lib/auth";
import { updatePrefs } from "@/db/seed";
import type { UserPrefs } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PrefsBody {
  prefs?: Partial<UserPrefs>;
}

/** Persists UI state (theme, view mode, simulation, active card…) per account. */
export async function PATCH(request: Request): Promise<Response> {
  const user = await resolveSession(readSessionToken(request));
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as PrefsBody;
  const prefs = await updatePrefs(user.id, body.prefs ?? {});
  return Response.json({ prefs });
}
