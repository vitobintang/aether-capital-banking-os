import type {
  CurrencyAccount,
  GeoPoint,
  LedgerCategory,
  LedgerChannel,
  LedgerEntry,
  LedgerStatus,
  MarketAsset,
  PaymentCard,
  Recipient,
  SecurityAlert,
  SeriesPoint,
  Timeframe,
} from "./types";
import { BASE_RATES } from "./fx";
import { between, clamp, createRng, pick, roundTo, scoreRisk } from "./utils";

const SEED = 20260214;

/* ------------------------------ geography -------------------------------- */

const GEOS: GeoPoint[] = [
  { lat: 37.7749, lng: -122.4194, city: "San Francisco", country: "United States", countryCode: "US" },
  { lat: 40.7128, lng: -74.006, city: "New York", country: "United States", countryCode: "US" },
  { lat: 51.5072, lng: -0.1276, city: "London", country: "United Kingdom", countryCode: "GB" },
  { lat: 52.52, lng: 13.405, city: "Berlin", country: "Germany", countryCode: "DE" },
  { lat: 48.8566, lng: 2.3522, city: "Paris", country: "France", countryCode: "FR" },
  { lat: 47.3769, lng: 8.5417, city: "Zürich", country: "Switzerland", countryCode: "CH" },
  { lat: 52.3676, lng: 4.9041, city: "Amsterdam", country: "Netherlands", countryCode: "NL" },
  { lat: 35.6762, lng: 139.6503, city: "Tokyo", country: "Japan", countryCode: "JP" },
  { lat: 1.3521, lng: 103.8198, city: "Singapore", country: "Singapore", countryCode: "SG" },
  { lat: 25.2048, lng: 55.2708, city: "Dubai", country: "UAE", countryCode: "AE" },
  { lat: 30.2672, lng: -97.7431, city: "Austin", country: "United States", countryCode: "US" },
  { lat: 38.7223, lng: -9.1393, city: "Lisbon", country: "Portugal", countryCode: "PT" },
  { lat: 37.5665, lng: 126.978, city: "Seoul", country: "South Korea", countryCode: "KR" },
  { lat: -33.8688, lng: 151.2093, city: "Sydney", country: "Australia", countryCode: "AU" },
  { lat: 43.6532, lng: -79.3832, city: "Toronto", country: "Canada", countryCode: "CA" },
  { lat: 59.3293, lng: 18.0686, city: "Stockholm", country: "Sweden", countryCode: "SE" },
  { lat: 19.4326, lng: -99.1332, city: "Mexico City", country: "Mexico", countryCode: "MX" },
  { lat: 6.5244, lng: 3.3792, city: "Lagos", country: "Nigeria", countryCode: "NG" },
];

/* ------------------------------- accounts -------------------------------- */

export const ACCOUNTS: CurrencyAccount[] = [
  {
    id: "acc_usd_ops",
    code: "USD",
    name: "Operating · USD",
    assetClass: "fiat",
    balance: 4_284_913.44,
    rateToUsd: BASE_RATES.USD,
    change24h: 0.42,
    iban: "US33 AETH 0019 4472 8891",
    available: 4_102_500,
  },
  {
    id: "acc_eur_emea",
    code: "EUR",
    name: "EMEA Treasury · EUR",
    assetClass: "fiat",
    balance: 1_842_306.18,
    rateToUsd: BASE_RATES.EUR,
    change24h: -0.18,
    iban: "DE89 3704 0044 0532 0130 00",
    available: 1_760_000,
  },
  {
    id: "acc_gbp_uk",
    code: "GBP",
    name: "UK Settlement · GBP",
    assetClass: "fiat",
    balance: 612_480.9,
    rateToUsd: BASE_RATES.GBP,
    change24h: 0.11,
    iban: "GB29 AETH 6016 1331 9268 19",
    available: 590_000,
  },
  {
    id: "acc_btc_cold",
    code: "BTC",
    name: "Digital Reserve · BTC",
    assetClass: "crypto",
    balance: 148.20439,
    rateToUsd: BASE_RATES.BTC,
    change24h: 2.84,
    iban: "bc1q aeth 8f3k 2m9x 7v4q",
    available: 148.20439,
  },
  {
    id: "acc_eth_stake",
    code: "ETH",
    name: "Staking Vault · ETH",
    assetClass: "crypto",
    balance: 2_184.6612,
    rateToUsd: BASE_RATES.ETH,
    change24h: -1.36,
    iban: "0xAe7F…91cD",
    available: 1_940.2,
  },
];

/* --------------------------------- cards --------------------------------- */

export const CARDS: PaymentCard[] = [
  {
    id: "card_titanium_01",
    label: "AETHER Titanium",
    holder: "ALEXANDER VOSS",
    network: "VISA",
    last4: "4417",
    expiryMonth: 11,
    expiryYear: 2029,
    cvv: "842",
    finish: "titanium",
    isVirtual: false,
    balance: 284_910.55,
    spend30d: 96_420.18,
    controls: {
      frozen: false,
      onlineEnabled: true,
      internationalEnabled: true,
      contactlessEnabled: true,
      atmEnabled: true,
      dailyOnlineLimit: 25_000,
      dailyAtmLimit: 2_500,
    },
    createdAt: "2023-04-18T09:00:00.000Z",
    expiresInSeconds: null,
  },
  {
    id: "card_holo_02",
    label: "Prism Holographic",
    holder: "ALEXANDER VOSS",
    network: "MASTERCARD",
    last4: "9026",
    expiryMonth: 3,
    expiryYear: 2028,
    cvv: "517",
    finish: "holographic",
    isVirtual: false,
    balance: 74_318.02,
    spend30d: 41_208.66,
    controls: {
      frozen: false,
      onlineEnabled: true,
      internationalEnabled: true,
      contactlessEnabled: false,
      atmEnabled: false,
      dailyOnlineLimit: 12_000,
      dailyAtmLimit: 500,
    },
    createdAt: "2024-01-07T09:00:00.000Z",
    expiresInSeconds: null,
  },
  {
    id: "card_frosted_03",
    label: "Cyberpunk Frosted",
    holder: "A. VOSS // BURNER",
    network: "VISA",
    last4: "1180",
    expiryMonth: 8,
    expiryYear: 2027,
    cvv: "309",
    finish: "frosted",
    isVirtual: true,
    balance: 9_842.4,
    spend30d: 6_114.9,
    controls: {
      frozen: false,
      onlineEnabled: true,
      internationalEnabled: false,
      contactlessEnabled: true,
      atmEnabled: false,
      dailyOnlineLimit: 4_000,
      dailyAtmLimit: 0,
    },
    createdAt: "2025-11-02T09:00:00.000Z",
    expiresInSeconds: null,
  },
];

/* ------------------------------ recipients ------------------------------- */

export const RECIPIENTS: Recipient[] = [
  {
    id: "rcp_01",
    name: "Mireille Laurent",
    entity: "Atelier Nord SARL",
    iban: "FR1420041010050500013M02606",
    swift: "BNPAFRPPXXX",
    currency: "EUR",
    country: "France",
    countryCode: "FR",
    trustScore: 98,
    lastUsed: "2026-01-29T11:20:00.000Z",
  },
  {
    id: "rcp_02",
    name: "Kenji Watanabe",
    entity: "Watanabe Robotics KK",
    iban: "GB33BUKB20201555555555",
    swift: "MHCBJPJT",
    currency: "GBP",
    country: "Japan",
    countryCode: "JP",
    trustScore: 94,
    lastUsed: "2026-02-04T08:05:00.000Z",
  },
  {
    id: "rcp_03",
    name: "Sofia Marchetti",
    entity: "Marchetti Logistica SpA",
    iban: "IT60X0542811101000000123456",
    swift: "BPPIITRRXXX",
    currency: "EUR",
    country: "Italy",
    countryCode: "IT",
    trustScore: 91,
    lastUsed: "2025-12-18T16:44:00.000Z",
  },
  {
    id: "rcp_04",
    name: "Daniel Okafor",
    entity: "Harmattan Cloud Ltd",
    iban: "GB29NWBK60161331926819",
    swift: "NWBKGB2L",
    currency: "GBP",
    country: "United Kingdom",
    countryCode: "GB",
    trustScore: 87,
    lastUsed: "2026-02-11T09:12:00.000Z",
  },
  {
    id: "rcp_05",
    name: "Priya Raghunathan",
    entity: "Kaveri Semiconductors",
    iban: "DE89370400440532013000",
    swift: "DEUTDEFF",
    currency: "EUR",
    country: "Germany",
    countryCode: "DE",
    trustScore: 96,
    lastUsed: "2026-01-08T13:31:00.000Z",
  },
  {
    id: "rcp_06",
    name: "Lucas Ferreira",
    entity: "Ipanema Ventures LP",
    iban: "CH9300762011623852957",
    swift: "UBSWCHZH80A",
    currency: "USD",
    country: "Switzerland",
    countryCode: "CH",
    trustScore: 99,
    lastUsed: "2026-02-01T07:55:00.000Z",
  },
  {
    id: "rcp_07",
    name: "Amara Ndiaye",
    entity: "Baobak Payments SA",
    iban: "ES9121000418450200051332",
    swift: "CABSESMMXXX",
    currency: "EUR",
    country: "Senegal",
    countryCode: "SN",
    trustScore: 78,
    lastUsed: null,
  },
  {
    id: "rcp_08",
    name: "Tomas Lindqvist",
    entity: "Norrsken Datacenter AB",
    iban: "NL91ABNA0417164300",
    swift: "ABNANL2A",
    currency: "EUR",
    country: "Sweden",
    countryCode: "SE",
    trustScore: 93,
    lastUsed: "2026-02-09T18:02:00.000Z",
  },
];

/* ----------------------------- merchant book ------------------------------ */

interface MerchantTemplate {
  merchant: string;
  category: LedgerCategory;
  min: number;
  max: number;
  channel: LedgerChannel;
  credit?: boolean;
}

const MERCHANTS: MerchantTemplate[] = [
  { merchant: "Stripe Billing", category: "SaaS", min: 240, max: 4200, channel: "card" },
  { merchant: "Datadog Cloud", category: "SaaS", min: 890, max: 9400, channel: "card" },
  { merchant: "Vercel Enterprise", category: "SaaS", min: 150, max: 1800, channel: "card" },
  { merchant: "Snowflake Compute", category: "SaaS", min: 3200, max: 28_000, channel: "wire" },
  { merchant: "Notion Labs", category: "SaaS", min: 96, max: 1200, channel: "card" },
  { merchant: "Linear Systems", category: "SaaS", min: 64, max: 780, channel: "card" },
  { merchant: "Emirates SkyCargo", category: "Travel", min: 1200, max: 18_400, channel: "card" },
  { merchant: "Four Seasons George V", category: "Travel", min: 640, max: 7200, channel: "card" },
  { merchant: "NetJets Fractional", category: "Travel", min: 14_000, max: 96_000, channel: "wire" },
  { merchant: "Uber for Business", category: "Travel", min: 18, max: 340, channel: "card" },
  { merchant: "Payroll — Engineering", category: "Payroll", min: 84_000, max: 268_000, channel: "ach" },
  { merchant: "Payroll — Operations", category: "Payroll", min: 42_000, max: 118_000, channel: "ach" },
  { merchant: "Deel Global Payroll", category: "Payroll", min: 12_000, max: 68_000, channel: "wire" },
  { merchant: "Dell Technologies", category: "Equipment", min: 2400, max: 46_000, channel: "wire" },
  { merchant: "Apple Business", category: "Equipment", min: 890, max: 12_400, channel: "card" },
  { merchant: "Herman Miller Studio", category: "Equipment", min: 1400, max: 22_000, channel: "card" },
  { merchant: "Nobu Downtown", category: "Dining", min: 180, max: 3400, channel: "card" },
  { merchant: "Blue Bottle Coffee", category: "Dining", min: 12, max: 180, channel: "card" },
  { merchant: "The Fat Duck", category: "Dining", min: 420, max: 2100, channel: "card" },
  { merchant: "Google Ads", category: "Marketing", min: 4200, max: 88_000, channel: "card" },
  { merchant: "Meta Business Suite", category: "Marketing", min: 2600, max: 54_000, channel: "card" },
  { merchant: "Cannes Lions Sponsorship", category: "Marketing", min: 24_000, max: 120_000, channel: "wire" },
  { merchant: "Coinbase Prime", category: "Crypto", min: 5000, max: 240_000, channel: "crypto" },
  { merchant: "Kraken OTC Desk", category: "Crypto", min: 12_000, max: 180_000, channel: "crypto" },
  { merchant: "Lido Staking Rewards", category: "Crypto", min: 240, max: 9800, channel: "crypto", credit: true },
  { merchant: "FX Desk — EUR/USD", category: "FX", min: 20_000, max: 900_000, channel: "fx" },
  { merchant: "Pacific Gas & Electric", category: "Utilities", min: 1800, max: 24_000, channel: "ach" },
  { merchant: "AWS us-east-1", category: "Utilities", min: 6400, max: 148_000, channel: "card" },
  { merchant: "WeWork Labs", category: "Retail", min: 3200, max: 42_000, channel: "ach" },
  { merchant: "Sotheby's Auction", category: "Retail", min: 8000, max: 260_000, channel: "wire" },
  { merchant: "Latham & Watkins LLP", category: "Professional", min: 12_000, max: 96_000, channel: "wire" },
  { merchant: "Deloitte Audit", category: "Professional", min: 18_000, max: 140_000, channel: "wire" },
  { merchant: "Inbound Wire — Meridian Capital", category: "Wire", min: 40_000, max: 1_200_000, channel: "wire", credit: true },
  { merchant: "Customer Settlement — Orbital", category: "Wire", min: 6000, max: 180_000, channel: "wire", credit: true },
  { merchant: "Interest — Treasury Sweep", category: "Wire", min: 400, max: 9800, channel: "internal", credit: true },
];

const STATUSES: { status: LedgerStatus; weight: number }[] = [
  { status: "settled", weight: 0.78 },
  { status: "pending", weight: 0.13 },
  { status: "disputed", weight: 0.05 },
  { status: "reversed", weight: 0.04 },
];

function pickStatus(rng: () => number): LedgerStatus {
  const roll = rng();
  let acc = 0;
  for (const entry of STATUSES) {
    acc += entry.weight;
    if (roll <= acc) return entry.status;
  }
  return "settled";
}

const ACCOUNT_IDS = ACCOUNTS.map((a) => a.id);
const CARD_IDS = CARDS.map((c) => c.id);

function currencyForChannel(
  rng: () => number,
  channel: LedgerChannel,
): LedgerEntry["currency"] {
  if (channel === "crypto") return rng() > 0.45 ? "BTC" : "ETH";
  const roll = rng();
  if (roll > 0.86) return "EUR";
  if (roll > 0.78) return "GBP";
  return "USD";
}

function scaleAmount(amount: number, currency: LedgerEntry["currency"]): number {
  if (currency === "BTC") return roundTo(amount / 67_000, 6);
  if (currency === "ETH") return roundTo(amount / 3_400, 4);
  if (currency === "EUR") return roundTo(amount * 0.92, 2);
  if (currency === "GBP") return roundTo(amount * 0.78, 2);
  return roundTo(amount, 2);
}

/** Generates a dense, deterministic ledger ending "now". */
export function generateLedger(
  count = 1_200,
  now = Date.now(),
  seed = SEED,
): LedgerEntry[] {
  const rng = createRng(seed);
  const entries: LedgerEntry[] = [];

  for (let i = 0; i < count; i += 1) {
    const template = pick(rng, MERCHANTS);
    // Exponential-ish decay keeps recent activity dense.
    const ageDays = Math.pow(rng(), 1.9) * 540;
    const ts = new Date(now - ageDays * 86_400_000 - between(rng, 0, 82_800_000));
    const currency = currencyForChannel(rng, template.channel);
    const usdAmount = between(rng, template.min, template.max);
    const amount = scaleAmount(usdAmount, currency);
    const direction = template.credit ? "credit" : rng() > 0.965 ? "credit" : "debit";
    const geo = pick(rng, GEOS);
    const channel = template.channel;
    const status = pickStatus(rng);
    const base = {
      amount: direction === "credit" ? amount : amount,
      ts: ts.toISOString(),
      category: template.category,
      geo,
      channel,
    };
    const { score } = scoreRisk(base);
    entries.push({
      id: `led_${String(i).padStart(5, "0")}`,
      ts: ts.toISOString(),
      merchant: template.merchant,
      category: template.category,
      amount,
      currency,
      direction,
      status,
      accountId: pick(rng, ACCOUNT_IDS),
      cardId: channel === "card" ? pick(rng, CARD_IDS) : null,
      channel,
      geo,
      riskScore: score,
      reference: `AE-${ts.getFullYear()}-${Math.floor(rng() * 9_000_000 + 1_000_000)}`,
    });
  }

  return entries.sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

/** 32 hand-authored marquee transactions used for the "latest activity" rail. */
export function seedTransactions(now = Date.now(), seed = SEED + 7): LedgerEntry[] {
  const rng = createRng(seed);
  const blueprint: Array<[string, LedgerCategory, number, LedgerChannel, GeoPoint, "debit" | "credit", LedgerStatus]> = [
    ["Snowflake Compute", "SaaS", 18_420.5, "wire", GEOS[0], "debit", "settled"],
    ["Inbound Wire — Meridian Capital", "Wire", 840_000, "wire", GEOS[2], "credit", "settled"],
    ["NetJets Fractional", "Travel", 74_250, "wire", GEOS[3], "debit", "pending"],
    ["Coinbase Prime", "Crypto", 186_400, "crypto", GEOS[1], "debit", "settled"],
    ["Payroll — Engineering", "Payroll", 214_880, "ach", GEOS[0], "debit", "settled"],
    ["Nobu Downtown", "Dining", 1_842.3, "card", GEOS[1], "debit", "settled"],
    ["Google Ads", "Marketing", 62_400, "card", GEOS[0], "debit", "settled"],
    ["Latham & Watkins LLP", "Professional", 88_000, "wire", GEOS[2], "debit", "disputed"],
    ["Lido Staking Rewards", "Crypto", 4_284.11, "crypto", GEOS[4], "credit", "settled"],
    ["Four Seasons George V", "Travel", 6_120, "card", GEOS[4], "debit", "settled"],
    ["Dell Technologies", "Equipment", 32_940, "wire", GEOS[10], "debit", "settled"],
    ["AWS us-east-1", "Utilities", 118_204.8, "card", GEOS[1], "debit", "settled"],
    ["Kraken OTC Desk", "Crypto", 96_000, "crypto", GEOS[8], "debit", "pending"],
    ["Sotheby's Auction", "Retail", 214_000, "wire", GEOS[2], "debit", "reversed"],
    ["Customer Settlement — Orbital", "Wire", 128_400, "wire", GEOS[7], "credit", "settled"],
    ["Deel Global Payroll", "Payroll", 44_180, "wire", GEOS[11], "debit", "settled"],
    ["Emirates SkyCargo", "Travel", 12_840, "card", GEOS[9], "debit", "settled"],
    ["Meta Business Suite", "Marketing", 38_900, "card", GEOS[0], "debit", "pending"],
    ["Stripe Billing", "SaaS", 2_418.6, "card", GEOS[0], "debit", "settled"],
    ["FX Desk — EUR/USD", "FX", 420_000, "fx", GEOS[5], "debit", "settled"],
    ["Pacific Gas & Electric", "Utilities", 18_204, "ach", GEOS[0], "debit", "settled"],
    ["WeWork Labs", "Retail", 24_600, "ach", GEOS[1], "debit", "settled"],
    ["Deloitte Audit", "Professional", 132_000, "wire", GEOS[2], "debit", "settled"],
    ["Apple Business", "Equipment", 8_940.2, "card", GEOS[8], "debit", "settled"],
    ["The Fat Duck", "Dining", 1_640, "card", GEOS[2], "debit", "settled"],
    ["Datadog Cloud", "SaaS", 7_412, "card", GEOS[0], "debit", "settled"],
    ["Interest — Treasury Sweep", "Wire", 6_842.19, "internal", GEOS[5], "credit", "settled"],
    ["Herman Miller Studio", "Equipment", 14_200, "card", GEOS[14], "debit", "settled"],
    ["Cannes Lions Sponsorship", "Marketing", 96_000, "wire", GEOS[4], "debit", "pending"],
    ["Uber for Business", "Travel", 284.6, "card", GEOS[15], "debit", "settled"],
    ["Baobak Payments — inbound", "Wire", 42_000, "wire", GEOS[17], "credit", "disputed"],
    ["Vercel Enterprise", "SaaS", 1_480, "card", GEOS[0], "debit", "settled"],
    ["Norrsken Datacenter AB", "Utilities", 58_400, "wire", GEOS[15], "debit", "settled"],
  ];

  return blueprint.map((row, index) => {
    const [merchant, category, usd, channel, geo, direction, status] = row;
    const ts = new Date(now - index * between(rng, 3_600_000, 26_000_000));
    const currency = currencyForChannel(createRng(SEED + index), channel);
    const amount = scaleAmount(usd, currency);
    const { score } = scoreRisk({
      amount,
      ts: ts.toISOString(),
      category,
      geo,
      channel,
    });
    return {
      id: `led_seed_${String(index).padStart(3, "0")}`,
      ts: ts.toISOString(),
      merchant,
      category,
      amount,
      currency,
      direction,
      status,
      accountId: ACCOUNT_IDS[index % ACCOUNT_IDS.length]!,
      cardId: channel === "card" ? CARD_IDS[index % CARD_IDS.length]! : null,
      channel,
      geo,
      riskScore: score,
      reference: `AE-2026-${9_100_000 + index * 137}`,
    };
  });
}

/* ------------------------------- net worth -------------------------------- */

const TARGET_NET_WORTH = 18_412_880.42;

function buildSeries(
  points: number,
  stepMs: number,
  volatility: number,
  seed: number,
  now: number,
  target = TREASURY_TARGET,
): SeriesPoint[] {
  const rng = createRng(seed);
  const raw: number[] = [];
  let value = 1;
  for (let i = 0; i < points; i += 1) {
    const drift = 0.0016 + (rng() - 0.48) * volatility;
    value = Math.max(0.05, value * (1 + drift));
    raw.push(value);
  }
  const last = raw[raw.length - 1] ?? 1;
  const scale = target / last;
  const labels = labelFactory(points, stepMs, now);
  return raw.map((v, i) => ({
    t: now - (points - 1 - i) * stepMs,
    label: labels(i, now - (points - 1 - i) * stepMs),
    value: roundTo(v * scale, 2),
  }));
}

function labelFactory(points: number, stepMs: number, _now: number) {
  const totalSpan = points * stepMs;
  const hour = 3_600_000;
  return (index: number, t: number) => {
    const date = new Date(t);
    if (totalSpan <= 2 * hour) {
      return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    if (totalSpan <= 48 * hour) {
      return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    if (totalSpan <= 40 * 86_400_000) {
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    }
    if (totalSpan <= 400 * 86_400_000) {
      return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    }
    void index;
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  };
}

export function buildHistory(
  now = Date.now(),
  target = TREASURY_TARGET,
  seed = SEED,
): Record<Timeframe, SeriesPoint[]> {
  return {
    "1H": buildSeries(60, 60_000, 0.0016, seed + 11, now, target),
    "24H": buildSeries(96, 900_000, 0.0026, seed + 12, now, target),
    "7D": buildSeries(168, 3_600_000, 0.004, seed + 13, now, target),
    "30D": buildSeries(120, 21_600_000, 0.006, seed + 14, now, target),
    "1Y": buildSeries(365, 86_400_000, 0.0085, seed + 15, now, target),
    ALL: buildSeries(260, 7 * 86_400_000, 0.012, seed + 16, now, target),
  };
}

/* -------------------------------- market --------------------------------- */

export function buildMarket(now = Date.now()): MarketAsset[] {
  void now;
  const specs: Array<[string, string, number, number, number]> = [
    ["BTC", "Bitcoin", 67_412.8, 2.84, 0.012],
    ["ETH", "Ethereum", 3_486.22, -1.36, 0.018],
    ["NVDA", "NVIDIA Corp", 1_284.6, 3.42, 0.009],
    ["AAPL", "Apple Inc", 246.18, 0.61, 0.005],
    ["TSLA", "Tesla Inc", 412.9, -2.14, 0.014],
    ["SPX", "S&P 500 Index", 6_842.1, 0.38, 0.003],
    ["EURUSD", "Euro / Dollar", 1.0852, -0.12, 0.0008],
  ];

  return specs.map(([symbol, name, price, change24h, vol], index) => {
    const rng = createRng(SEED + 400 + index);
    const series: number[] = [];
    let value = price / (1 + change24h / 100);
    for (let i = 0; i < 48; i += 1) {
      value = value * (1 + (rng() - 0.5) * vol);
      series.push(roundTo(value, symbol === "EURUSD" ? 5 : 2));
    }
    series[series.length - 1] = price;
    return { symbol, name, price, change24h, series };
  });
}

/* -------------------------------- alerts --------------------------------- */

export function buildAlerts(ledger: LedgerEntry[], now = Date.now()): SecurityAlert[] {
  const flagged = ledger
    .filter((entry) => entry.riskScore >= 70)
    .slice(0, 4);
  const vectors = [
    "device fingerprint mismatch · new ASN",
    "impossible travel velocity 812 km/h",
    "sanctioned-adjacent jurisdiction routing",
    "structuring pattern · 9 sub-threshold wires",
  ];
  if (flagged.length === 0) {
    return [
      {
        id: "alert_fallback",
        ts: new Date(now - 1_800_000).toISOString(),
        severity: "medium",
        title: "Unusual session origin",
        detail: "New sign-in from Frankfurt (DE) on an unrecognised device profile.",
        confidence: 71,
        geo: GEOS[3]!,
        ledgerId: null,
        resolved: false,
        vector: "device fingerprint mismatch · new ASN",
      },
    ];
  }
  return flagged.map((entry, index) => ({
    id: `alert_${String(index).padStart(3, "0")}`,
    ts: entry.ts,
    severity: entry.riskScore >= 88 ? "critical" : entry.riskScore >= 78 ? "high" : "medium",
    title:
      entry.riskScore >= 88
        ? "Blocked · high-confidence fraud"
        : "Flagged · anomalous settlement",
    detail: `${entry.merchant} · ${entry.geo.city}, ${entry.geo.countryCode}`,
    confidence: clamp(entry.riskScore + Math.round(between(createRng(SEED + index), -3, 4)), 60, 99),
    geo: entry.geo,
    ledgerId: entry.id,
    resolved: index > 1,
    vector: vectors[index % vectors.length]!,
  }));
}

export const TREASURY_TARGET = TARGET_NET_WORTH;
