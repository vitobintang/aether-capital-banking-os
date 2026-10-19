import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  alerts,
  cards,
  ledger,
  marketAssets,
  users,
  wires,
} from "@/db/schema";
import { createSalt, hashPassword } from "@/lib/auth";
import { toUsd } from "@/lib/fx";
import {
  ACCOUNTS,
  buildAlerts,
  buildMarket,
  CARDS,
  generateLedger,
  RECIPIENTS,
  seedTransactions,
} from "@/lib/mock-data";
import { BASE_RATES } from "@/lib/fx";
import { DEFAULT_PREFS } from "@/lib/types";
import type { CurrencyAccount, LedgerEntry, PaymentCard, UserPrefs } from "@/lib/types";
import { createId } from "@/lib/utils";

export const DEMO_USER_ID = "usr_demo";
export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "aether123";

const STARTER_ACCOUNTS: CurrencyAccount[] = [
  {
    id: "acc_usd_ops",
    code: "USD",
    name: "Operating · USD",
    assetClass: "fiat",
    balance: 84_250.18,
    rateToUsd: BASE_RATES.USD,
    change24h: 0.31,
    iban: "US33 AETH 0019 4472 1104",
    available: 82_100,
  },
  {
    id: "acc_eur_emea",
    code: "EUR",
    name: "EMEA Treasury · EUR",
    assetClass: "fiat",
    balance: 12_480.55,
    rateToUsd: BASE_RATES.EUR,
    change24h: -0.12,
    iban: "DE89 3704 0044 0532 7781 00",
    available: 12_000,
  },
  {
    id: "acc_btc_cold",
    code: "BTC",
    name: "Digital Reserve · BTC",
    assetClass: "crypto",
    balance: 0.48213,
    rateToUsd: BASE_RATES.BTC,
    change24h: 1.94,
    iban: "bc1q aeth 4k2m 9x7v 3q8f",
    available: 0.48213,
  },
];

function starterCards(holder: string): PaymentCard[] {
  return [
    {
      id: "card_titanium_01",
      label: "Aether One",
      holder,
      network: "VISA",
      last4: "7712",
      expiryMonth: 6,
      expiryYear: 2030,
      cvv: "418",
      finish: "titanium",
      isVirtual: false,
      balance: 8_420.6,
      spend30d: 2_184.32,
      controls: {
        frozen: false,
        onlineEnabled: true,
        internationalEnabled: true,
        contactlessEnabled: true,
        atmEnabled: false,
        dailyOnlineLimit: 5_000,
        dailyAtmLimit: 500,
      },
      createdAt: new Date().toISOString(),
      expiresInSeconds: null,
    },
    {
      id: "card_frosted_03",
      label: "Virtual · Frosted",
      holder: `${holder} // BURNER`,
      network: "VISA",
      last4: "3390",
      expiryMonth: 9,
      expiryYear: 2028,
      cvv: "651",
      finish: "frosted",
      isVirtual: true,
      balance: 1_250,
      spend30d: 318.44,
      controls: {
        frozen: false,
        onlineEnabled: true,
        internationalEnabled: false,
        contactlessEnabled: false,
        atmEnabled: false,
        dailyOnlineLimit: 1_500,
        dailyAtmLimit: 0,
      },
      createdAt: new Date().toISOString(),
      expiresInSeconds: null,
    },
  ];
}

/** Namespaces row ids per user so multiple tenants can coexist safely. */
function scope(baseId: string, ownerId: string): string {
  return ownerId === DEMO_USER_ID ? baseId : `${baseId}_${ownerId.slice(-8)}`;
}

function numericSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 100_000;
}

export interface ProvisionTarget {
  id: string;
  displayName: string;
}

export async function provisionPortfolio(
  target: ProvisionTarget,
  tier: "demo" | "starter",
): Promise<UserPrefs> {
  const now = Date.now();
  const seed = numericSeed(target.id);
  const holder = target.displayName.toUpperCase().slice(0, 22);

  const accountDefs = tier === "demo" ? ACCOUNTS : STARTER_ACCOUNTS;
  const cardDefs = tier === "demo" ? CARDS.map((c) => ({ ...c })) : starterCards(holder);

  const marquee = tier === "demo" ? seedTransactions(now, seed) : seedTransactions(now, seed).slice(0, 10);
  const generated = generateLedger(tier === "demo" ? 1_200 : 64, now, seed);
  const fullLedger: LedgerEntry[] = [...marquee, ...generated].map((entry) => ({
    ...entry,
    id: scope(entry.id, target.id),
    accountId: scope(entry.accountId, target.id),
    cardId: entry.cardId ? scope(entry.cardId, target.id) : null,
  }));

  await db.insert(accounts).values(
    accountDefs.map((account) => ({
      id: scope(account.id, target.id),
      ownerId: target.id,
      code: account.code,
      name: account.name,
      assetClass: account.assetClass,
      balance: account.balance,
      rateToUsd: account.rateToUsd,
      change24h: account.change24h,
      iban: account.iban,
      available: account.available,
    })),
  );

  await db.insert(cards).values(
    cardDefs.map((card) => ({
      id: scope(card.id, target.id),
      ownerId: target.id,
      label: card.label,
      holder: card.holder,
      network: card.network,
      last4: card.last4,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cvv: card.cvv,
      finish: card.finish,
      isVirtual: card.isVirtual,
      balance: card.balance,
      spend30d: card.spend30d,
      controls: card.controls,
      expiresInSeconds: card.expiresInSeconds,
      createdAt: card.createdAt,
    })),
  );

  for (let i = 0; i < fullLedger.length; i += 400) {
    const batch = fullLedger.slice(i, i + 400);
    await db.insert(ledger).values(
      batch.map((entry) => ({
        id: entry.id,
        ownerId: target.id,
        ts: entry.ts,
        merchant: entry.merchant,
        category: entry.category,
        amount: entry.amount,
        currency: entry.currency,
        direction: entry.direction,
        status: entry.status,
        accountId: entry.accountId,
        cardId: entry.cardId,
        channel: entry.channel,
        geo: entry.geo,
        riskScore: entry.riskScore,
        reference: entry.reference,
      })),
    );
  }

  const seededAlerts = buildAlerts(fullLedger, now).slice(0, tier === "demo" ? 4 : 2);
  await db.insert(alerts).values(
    seededAlerts.map((alert, index) => ({
      id: scope(`${alert.id}_${seed}`, target.id),
      ownerId: target.id,
      ts: alert.ts,
      severity: alert.severity,
      title: alert.title,
      detail: alert.detail,
      confidence: alert.confidence,
      geo: alert.geo,
      ledgerId: alert.ledgerId,
      resolved: index > 1,
      vector: alert.vector,
    })),
  );

  if (tier === "demo") {
    const beneficiary = RECIPIENTS[0]!;
    await db.insert(wires).values({
      id: scope("wire_seed_01", target.id),
      ownerId: target.id,
      reference: "AE-2026-9100001",
      createdAt: new Date(now - 86_400_000 * 2).toISOString(),
      recipientName: beneficiary.name,
      recipientEntity: beneficiary.entity,
      iban: beneficiary.iban,
      swift: beneficiary.swift,
      sourceCurrency: "USD",
      targetCurrency: "EUR",
      sourceAmount: 250_000,
      targetAmount: 228_412.5,
      rate: 0.9137,
      fee: 52.6,
      spreadBps: 6,
      etaSeconds: 42,
      status: "settled",
      authMethod: "biometric",
    });
  }

  return { ...DEFAULT_PREFS, activeCardId: scope(cardDefs[0]!.id, target.id) };
}

export async function ensureMarketSeeded(): Promise<void> {
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(marketAssets);
  if (Number(rows[0]?.count ?? 0) > 0) return;
  await db.insert(marketAssets).values(
    buildMarket().map((asset) => ({
      symbol: asset.symbol,
      name: asset.name,
      price: asset.price,
      change24h: asset.change24h,
      series: asset.series,
    })),
  );
}

let seedingPromise: Promise<void> | null = null;

/** Idempotent bootstrap: creates the demo tenant on first request only. */
export function ensureSeeded(): Promise<void> {
  if (!seedingPromise) {
    seedingPromise = (async () => {
      await ensureMarketSeeded();
      const rows = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      if (Number(rows[0]?.count ?? 0) > 0) return;

      const salt = createSalt();
      const prefs = await provisionPortfolio(
        { id: DEMO_USER_ID, displayName: "Alexander Voss" },
        "demo",
      );
      await db.insert(users).values({
        id: DEMO_USER_ID,
        username: DEMO_USERNAME,
        salt,
        passwordHash: hashPassword(DEMO_PASSWORD, salt),
        displayName: "Alexander Voss",
        isDemo: true,
        prefs,
        createdAt: new Date().toISOString(),
      });
    })().catch((error) => {
      seedingPromise = null;
      throw error;
    });
  }
  return seedingPromise;
}

export async function createUserRecord(input: {
  id: string;
  username: string;
  password: string;
  displayName: string;
}): Promise<UserPrefs> {
  const salt = createSalt();
  const prefs = await provisionPortfolio(
    { id: input.id, displayName: input.displayName },
    "starter",
  );
  await db.insert(users).values({
    id: input.id,
    username: input.username,
    salt,
    passwordHash: hashPassword(input.password, salt),
    displayName: input.displayName,
    isDemo: false,
    prefs,
    createdAt: new Date().toISOString(),
  });
  return prefs;
}

export async function updatePrefs(userId: string, patch: Partial<UserPrefs>): Promise<UserPrefs> {
  const [row] = await db.select({ prefs: users.prefs }).from(users).where(eq(users.id, userId));
  const merged: UserPrefs = { ...((row?.prefs as UserPrefs) ?? DEFAULT_PREFS), ...patch };
  await db.update(users).set({ prefs: merged }).where(eq(users.id, userId));
  return merged;
}

export { createId };
