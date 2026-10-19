import type {
  CardControls,
  CurrencyCode,
  LedgerEntry,
  PaymentCard,
  PortfolioSnapshot,
  SecurityAlert,
  SessionUser,
  UserPrefs,
  WireTransfer,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* --------------------------- session token plumbing ---------------------------
 * The HttpOnly cookie is the primary transport, but it is dropped when the app
 * runs inside a cross-site iframe with third-party cookies blocked. The bearer
 * token mirrors the same session so authentication survives that environment.
 * --------------------------------------------------------------------------- */

const TOKEN_KEY = "aether.session";

let sessionToken: string | null = null;

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  sessionToken = token;
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — the in-memory token still covers this page session */
  }
}

export function getSessionToken(): string | null {
  return sessionToken ?? readStoredToken();
}

sessionToken = readStoredToken();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? (response.status === 401 ? "unauthenticated" : response.statusText),
      response.status,
    );
  }
  if (payload === null) throw new ApiError("Empty response from treasury API", 500);
  return payload;
}

/* --------------------------------- session -------------------------------- */

export interface SessionResult {
  user: SessionUser | null;
  token?: string | null;
  demoUsername?: string;
}

export function fetchSession(): Promise<SessionResult> {
  return request<SessionResult>("/api/auth");
}

export function login(
  username: string,
  password: string,
): Promise<{ user: SessionUser; token: string }> {
  return request<{ user: SessionUser; token: string }>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action: "login", username, password }),
  });
}

export function signup(
  username: string,
  password: string,
  displayName: string,
): Promise<{ user: SessionUser; token: string }> {
  return request<{ user: SessionUser; token: string }>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action: "signup", username, password, displayName }),
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action: "logout" }),
  });
}

export function savePrefs(prefs: Partial<UserPrefs>): Promise<{ prefs: UserPrefs }> {
  return request<{ prefs: UserPrefs }>("/api/prefs", {
    method: "PATCH",
    body: JSON.stringify({ prefs }),
  });
}

/* -------------------------------- portfolio ------------------------------- */

export function fetchPortfolio(): Promise<PortfolioSnapshot> {
  return request<PortfolioSnapshot>("/api/portfolio");
}

export interface PatchCardResult {
  card: PaymentCard;
}

export function patchCard(
  cardId: string,
  controls: Partial<CardControls>,
): Promise<PatchCardResult> {
  return request<PatchCardResult>(`/api/cards/${cardId}`, {
    method: "PATCH",
    body: JSON.stringify({ controls }),
  });
}

export interface MintBurnerInput {
  label?: string;
  network?: "VISA" | "MASTERCARD";
  finish?: "titanium" | "holographic" | "frosted";
  dailyOnlineLimit?: number;
  ttlMinutes?: number;
  funding?: number;
}

export function mintBurnerCard(input: MintBurnerInput): Promise<PatchCardResult> {
  return request<PatchCardResult>("/api/cards", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface CreateWireInput {
  recipientName: string;
  recipientEntity: string;
  iban: string;
  swift: string;
  sourceCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  sourceAmount: number;
  authMethod: "biometric" | "otp";
}

export interface CreateWireResult {
  wire: WireTransfer;
  entry: LedgerEntry | null;
}

export function createWire(input: CreateWireInput): Promise<CreateWireResult> {
  return request<CreateWireResult>("/api/wires", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface ResolveAlertResult {
  alert: SecurityAlert;
}

export function resolveAlert(
  alertId: string,
  resolved = true,
): Promise<ResolveAlertResult> {
  return request<ResolveAlertResult>(`/api/alerts/${alertId}`, {
    method: "PATCH",
    body: JSON.stringify({ resolved }),
  });
}
