import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import type { SessionUser, UserPrefs } from "@/lib/types";

export const SESSION_COOKIE = "aether_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MIN_TOKEN_LENGTH = 32;

export function createSalt(): string {
  return randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password.normalize("NFKC"), salt, 64).toString("hex");
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = Buffer.from(hashPassword(password, salt), "hex");
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export function createToken(): string {
  return randomBytes(28).toString("hex");
}

export function usernameFromInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 24);
}

export function validateCredentials(username: string, password: string): string | null {
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
    return "Username must be 3–24 characters: letters, numbers, dot, dash or underscore.";
  }
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password.length > 128) return "Password must be under 128 characters.";
  return null;
}

export function toSessionUser(row: typeof users.$inferSelect): SessionUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    isDemo: row.isDemo,
    createdAt: row.createdAt,
    prefs: row.prefs as UserPrefs,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = createToken();
  await db.insert(sessions).values({
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  return token;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.token, token));
}

async function userForToken(token: string): Promise<SessionUser | null> {
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date().toISOString())))
    .limit(1);
  const row = rows[0];
  return row ? toSessionUser(row.user) : null;
}

export async function resolveSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  return userForToken(token);
}

export async function resolveSessionWithToken(
  request: Request,
): Promise<{ user: SessionUser; token: string } | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const user = await userForToken(token);
  return user ? { user, token } : null;
}

/**
 * `SameSite=None; Secure` keeps the cookie usable when the app is embedded in a
 * cross-site iframe (preview panes). The bearer token below is the fallback for
 * browsers that block third-party cookie storage entirely.
 */
export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${Math.floor(
    SESSION_TTL_MS / 1000,
  )}`;
}

export function clearCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
}

/** Prefers `Authorization: Bearer`, then falls back to the session cookie. */
export function readSessionToken(request: Request): string | undefined {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const [scheme, value] = authorization.split(" ");
    if (scheme?.toLowerCase() === "bearer" && value && value.length >= MIN_TOKEN_LENGTH) {
      return value.trim();
    }
  }
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  const pair = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = pair?.slice(SESSION_COOKIE.length + 1);
  return token && token.length >= MIN_TOKEN_LENGTH ? token : undefined;
}
