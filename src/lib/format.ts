import type { CurrencyCode } from "./types";

export const CURRENCY_META: Record<
  CurrencyCode,
  { symbol: string; decimals: number; name: string; flag: string }
> = {
  USD: { symbol: "$", decimals: 2, name: "US Dollar", flag: "🇺🇸" },
  EUR: { symbol: "€", decimals: 2, name: "Euro", flag: "🇪🇺" },
  GBP: { symbol: "£", decimals: 2, name: "Pound Sterling", flag: "🇬🇧" },
  BTC: { symbol: "₿", decimals: 8, name: "Bitcoin", flag: "₿" },
  ETH: { symbol: "Ξ", decimals: 6, name: "Ethereum", flag: "Ξ" },
};

const LOCALES: Record<CurrencyCode, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  BTC: "en-US",
  ETH: "en-US",
};

export function formatMoney(
  amount: number,
  code: CurrencyCode,
  options: { sign?: boolean; compact?: boolean; symbol?: boolean } = {},
): string {
  const { sign = false, compact = false, symbol = true } = options;
  const meta = CURRENCY_META[code];
  const value = Number.isFinite(amount) ? amount : 0;
  const prefix = sign && value > 0 ? "+" : "";
  const magnitude = Math.abs(value);

  if (compact && magnitude >= 1_000_000) {
    return `${prefix}${symbol ? meta.symbol : ""}${(value / 1_000_000).toLocaleString(
      "en-US",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    )}M`;
  }
  if (compact && magnitude >= 10_000) {
    return `${prefix}${symbol ? meta.symbol : ""}${(value / 1_000).toLocaleString(
      "en-US",
      { minimumFractionDigits: 1, maximumFractionDigits: 1 },
    )}K`;
  }

  const digits = code === "BTC" ? 6 : code === "ETH" ? 4 : 2;
  const formatted = value.toLocaleString(LOCALES[code], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${prefix}${symbol ? meta.symbol : ""}${formatted}`;
}

export function formatUsd(amount: number, options: { sign?: boolean } = {}): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const prefix = options.sign && value > 0 ? "+" : value < 0 ? "−" : "";
  return `${prefix}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number, digits = 2): string {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${prefix}${Math.abs(value).toFixed(digits)}%`;
}

export function formatSignedMoney(
  amount: number,
  code: CurrencyCode,
  direction: "debit" | "credit",
): string {
  const signed = direction === "credit" ? Math.abs(amount) : -Math.abs(amount);
  return formatMoney(signed, code, { sign: true });
}

export function formatDelta(value: number): string {
  return formatPercent(value, 2);
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatClock(ts: number | string | Date): string {
  const date = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDate(ts: number | string | Date): string {
  const date = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(ts: number | string | Date): string {
  const date = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function formatTimeShort(ts: number | string | Date): string {
  const date = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatExpiry(month: number, year: number): string {
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

export function formatCardNumber(last4: string): string {
  return `•••• •••• •••• ${last4}`;
}

export function formatCoordinates(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${ns} ${Math.abs(lng).toFixed(4)}°${ew}`;
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}
