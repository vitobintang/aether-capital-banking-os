import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { GeoPoint, LedgerCategory, LedgerEntry } from "./types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* ------------------------- deterministic randomness ------------------------ */

/** mulberry32 — tiny deterministic PRNG so server/client renders stay in sync. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

export function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

let idCounter = 0;

export function createId(prefix: string): string {
  idCounter += 1;
  const entropy =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${entropy}${idCounter.toString(36)}`;
}

/* ------------------------------- validation -------------------------------- */

const IBAN_LENGTHS: Record<string, number> = {
  DE: 22,
  FR: 27,
  GB: 22,
  NL: 18,
  CH: 21,
  ES: 24,
  IT: 27,
  US: 0,
  SG: 23,
  JP: 0,
  AE: 23,
  PT: 25,
};

export function formatIban(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim()
    .slice(0, 42);
}

/** ISO 13616 mod-97 validation. */
export function validateIban(raw: string): boolean {
  const iban = raw.toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const expected = IBAN_LENGTHS[iban.slice(0, 2)];
  if (expected && expected !== iban.length) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (const char of rearranged) {
    const value = /[0-9]/.test(char)
      ? Number(char)
      : char.charCodeAt(0) - "A".charCodeAt(0) + 10;
    remainder = (remainder * (value > 9 ? 100 : 10) + value) % 97;
  }
  return remainder === 1;
}

export function validateSwift(raw: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(
    raw.toUpperCase().replace(/\s+/g, ""),
  );
}

export function formatSwift(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

export function maskPan(last4: string): string {
  return `•••• •••• •••• ${last4}`;
}

/* ------------------------------- risk engine ------------------------------- */

const HIGH_RISK_COUNTRIES = new Set(["RU", "IR", "KP", "PA", "NG"]);
const HIGH_RISK_CATEGORIES: ReadonlySet<LedgerCategory> = new Set([
  "Crypto",
  "Wire",
  "FX",
]);

/**
 * Lightweight, explainable fraud heuristic standing in for the production
 * gradient-boosted model. Returns 0–100 plus the dominant contributing factor.
 */
export function scoreRisk(entry: {
  amount: number;
  ts: string;
  category: LedgerCategory;
  geo: GeoPoint;
  channel: string;
}): { score: number; vector: string } {
  let score = 4;
  let vector = "baseline behavioural match";

  const usd = Math.abs(entry.amount);
  if (usd > 25_000) {
    score += 34;
    vector = "outlier amount vs. 90-day merchant profile";
  } else if (usd > 8_000) {
    score += 21;
    vector = "amount above 95th percentile for account";
  } else if (usd > 2_500) {
    score += 9;
    vector = "elevated ticket size";
  }

  const hour = new Date(entry.ts).getUTCHours();
  if (hour >= 1 && hour <= 4) {
    score += 16;
    vector = `${vector} · dormant-hours activity (0${hour}:00 UTC)`;
  }

  if (HIGH_RISK_COUNTRIES.has(entry.geo.countryCode)) {
    score += 38;
    vector = `sanctioned-adjacent jurisdiction ${entry.geo.countryCode}`;
  }

  if (HIGH_RISK_CATEGORIES.has(entry.category)) {
    score += 12;
    vector = `${vector} · high-velocity liquidity category`;
  }

  if (entry.channel === "wire") {
    score += 6;
  }

  return { score: clamp(Math.round(score), 1, 99), vector };
}

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

/* -------------------------------- display ---------------------------------- */

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function relativeTime(ts: string | number | Date, now: number = Date.now()): string {
  const then = typeof ts === "number" ? ts : new Date(ts).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export const CATEGORY_COLORS: Record<LedgerCategory, string> = {
  SaaS: "#6e56f8",
  Travel: "#31e1f9",
  Payroll: "#ff4d6d",
  Equipment: "#ffb020",
  Dining: "#2ee6a8",
  Marketing: "#b8ff3c",
  Wire: "#a78bfa",
  FX: "#38bdf8",
  Crypto: "#f472b6",
  Utilities: "#94a3b8",
  Retail: "#fb923c",
  Professional: "#22d3ee",
};

export function severityTone(score: number): "positive" | "warning" | "negative" {
  if (score >= 70) return "negative";
  if (score >= 35) return "warning";
  return "positive";
}

export function isLedgerFlagged(entry: LedgerEntry): boolean {
  return entry.riskScore >= 70;
}
