import type { CurrencyAccount, CurrencyCode, FxQuote } from "./types";
import { clamp } from "./utils";

/** Base mid-market rates: units of currency per 1 USD. */
export const BASE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.9214,
  GBP: 0.7842,
  BTC: 0.0000148,
  ETH: 0.000286,
};

export const CURRENCY_ORDER: CurrencyCode[] = ["USD", "EUR", "GBP", "BTC", "ETH"];

/** Live rates mutated by the simulation engine (units per USD). */
export type RateTable = Record<CurrencyCode, number>;

export function createRateTable(): RateTable {
  return { ...BASE_RATES };
}

/** Cross rate: how many units of `to` you receive for 1 unit of `from`. */
export function crossRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rates: RateTable = BASE_RATES as RateTable,
): number {
  const fromPerUsd = rates[from] ?? BASE_RATES[from];
  const toPerUsd = rates[to] ?? BASE_RATES[to];
  if (fromPerUsd === 0) return 0;
  return toPerUsd / fromPerUsd;
}

export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: RateTable = BASE_RATES as RateTable,
): number {
  return amount * crossRate(from, to, rates);
}

/** Convert any account balance into USD using its live rate. */
export function toUsd(
  account: Pick<CurrencyAccount, "code" | "balance">,
  rates: RateTable = BASE_RATES as RateTable,
): number {
  const perUsd = rates[account.code] ?? BASE_RATES[account.code];
  if (perUsd === 0) return 0;
  return account.balance / perUsd;
}

/** Tiered AETHER fee schedule — zero-fee inside the internal ledger. */
export function quoteFee(
  sourceAmount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): { fee: number; spreadBps: number } {
  const isCrypto = from === "BTC" || from === "ETH" || to === "BTC" || to === "ETH";
  const spreadBps = isCrypto ? 18 : 6;
  const base = isCrypto ? 1.4 : 0.6;
  const proportional = sourceAmount * (spreadBps / 10_000);
  const fee = clamp(base + proportional * 0.35, 0, sourceAmount * 0.05);
  return { fee: Number(fee.toFixed(2)), spreadBps };
}

export function buildQuote(
  sourceAmount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: RateTable = BASE_RATES as RateTable,
): FxQuote {
  const mid = crossRate(from, to, rates);
  const { fee, spreadBps } = quoteFee(sourceAmount, from, to);
  const clientRate = mid * (1 - spreadBps / 10_000);
  const netSource = Math.max(0, sourceAmount - fee);
  const targetAmount = netSource * clientRate;
  const etaSeconds = estimateEta(from, to, sourceAmount);
  const route = buildRoute(from, to);
  return {
    midRate: Number(mid.toPrecision(10)),
    clientRate: Number(clientRate.toPrecision(10)),
    spreadBps,
    fee,
    targetAmount,
    etaSeconds,
    route,
  };
}

function estimateEta(
  from: CurrencyCode,
  to: CurrencyCode,
  amount: number,
): number {
  const crypto = from === "BTC" || from === "ETH" || to === "BTC" || to === "ETH";
  if (crypto) return amount > 100_000 ? 240 : 45;
  if (from === to) return 8;
  const sameRegion =
    ["USD", "EUR", "GBP"].includes(from) && ["USD", "EUR", "GBP"].includes(to);
  if (sameRegion) return amount > 250_000 ? 3600 : 42;
  return 5400;
}

function buildRoute(from: CurrencyCode, to: CurrencyCode): string[] {
  if (from === to) return [`AETHER internal ledger · ${from}`];
  const crypto = from === "BTC" || from === "ETH" || to === "BTC" || to === "ETH";
  if (crypto) {
    return [
      `${from} → USD (AETHER book)`,
      "USD → settlement rail (Fireblocks MPC)",
      `USD → ${to} (on-chain confirm ×2)`,
    ];
  }
  return [
    `${from} → USD ( correspondent net )`.replace("  ", " "),
    "USD → SWIFT gpi tracker",
    `USD → ${to} (beneficiary bank)`,
  ];
}

export function jitterRate(rates: RateTable, volatility: number): RateTable {
  const next = { ...rates };
  (Object.keys(next) as CurrencyCode[]).forEach((code) => {
    if (code === "USD") return;
    const shock = (Math.random() - 0.5) * volatility;
    next[code] = Number((next[code] * (1 + shock)).toPrecision(10));
  });
  return next;
}
