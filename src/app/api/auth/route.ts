import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createUserRecord, DEMO_USERNAME, ensureSeeded } from "@/db/seed";
import {
  clearCookieHeader,
  createSession,
  destroySession,
  readSessionToken,
  resolveSessionWithToken,
  sessionCookieHeader,
  toSessionUser,
  usernameFromInput,
  validateCredentials,
  verifyPassword,
} from "@/lib/auth";
import type { AuthAction, SessionUser } from "@/lib/types";
import { createId } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface AuthBody {
  action?: AuthAction;
  username?: string;
  password?: string;
  displayName?: string;
}

/**
 * GET  → resolve the current session (cookie *or* bearer token)
 * POST → { action: "login" | "signup" | "logout" }
 *
 * The raw token is returned alongside the HttpOnly cookie so clients embedded
 * in cross-site iframes (where cookie storage is blocked) can authenticate.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    await ensureSeeded();
    const resolved = await resolveSessionWithToken(request);
    return Response.json({
      user: resolved?.user ?? null,
      token: resolved?.token ?? null,
      demoUsername: DEMO_USERNAME,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "auth lookup failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as AuthBody;
  const action = body.action ?? "login";

  try {
    await ensureSeeded();

    if (action === "logout") {
      await destroySession(readSessionToken(request));
      return Response.json({ ok: true }, { headers: { "set-cookie": clearCookieHeader() } });
    }

    const username = usernameFromInput(body.username ?? "");
    const password = body.password ?? "";
    const invalid = validateCredentials(username, password);
    if (invalid) return Response.json({ error: invalid }, { status: 422 });

    if (action === "signup") {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username));
      if (existing.length > 0) {
        return Response.json({ error: "That username is already registered." }, { status: 409 });
      }
      const id = createId("usr");
      const displayName = body.displayName?.trim() || username;
      await createUserRecord({ id, username, password, displayName });
      const [row] = await db.select().from(users).where(eq(users.id, id));
      if (!row) return Response.json({ error: "provisioning failed" }, { status: 500 });
      const token = await createSession(id);
      const user: SessionUser = toSessionUser(row);
      return Response.json(
        { user, token },
        { status: 201, headers: { "set-cookie": sessionCookieHeader(token) } },
      );
    }

    const [row] = await db.select().from(users).where(eq(users.username, username));
    if (!row || !verifyPassword(password, row.salt, row.passwordHash)) {
      return Response.json({ error: "Invalid username or password." }, { status: 401 });
    }
    const token = await createSession(row.id);
    return Response.json(
      { user: toSessionUser(row), token },
      { headers: { "set-cookie": sessionCookieHeader(token) } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "auth request failed" },
      { status: 500 },
    );
  }
}
