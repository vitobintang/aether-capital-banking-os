import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  AlertSeverity,
  AssetClass,
  CardControls,
  CardFinish,
  CardNetwork,
  CurrencyCode,
  GeoPoint,
  LedgerCategory,
  LedgerChannel,
  LedgerDirection,
  LedgerStatus,
  UserPrefs,
  WireStatus,
} from "@/lib/types";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    salt: text("salt").notNull(),
    displayName: text("display_name").notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    prefs: jsonb("prefs").$type<UserPrefs>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [uniqueIndex("users_username_idx").on(table.username)],
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    code: text("code").$type<CurrencyCode>().notNull(),
    name: text("name").notNull(),
    assetClass: text("asset_class").$type<AssetClass>().notNull(),
    balance: doublePrecision("balance").notNull(),
    rateToUsd: doublePrecision("rate_to_usd").notNull(),
    change24h: doublePrecision("change_24h").notNull(),
    iban: text("iban").notNull(),
    available: doublePrecision("available").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index("accounts_owner_idx").on(table.ownerId)],
);

export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    label: text("label").notNull(),
    holder: text("holder").notNull(),
    network: text("network").$type<CardNetwork>().notNull(),
    last4: text("last4").notNull(),
    expiryMonth: integer("expiry_month").notNull(),
    expiryYear: integer("expiry_year").notNull(),
    cvv: text("cvv").notNull(),
    finish: text("finish").$type<CardFinish>().notNull(),
    isVirtual: boolean("is_virtual").notNull(),
    balance: doublePrecision("balance").notNull(),
    spend30d: doublePrecision("spend_30d").notNull(),
    controls: jsonb("controls").$type<CardControls>().notNull(),
    expiresInSeconds: integer("expires_in_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index("cards_owner_idx").on(table.ownerId)],
);

export const ledger = pgTable(
  "ledger",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    ts: timestamp("ts", { withTimezone: true, mode: "string" }).notNull(),
    merchant: text("merchant").notNull(),
    category: text("category").$type<LedgerCategory>().notNull(),
    amount: doublePrecision("amount").notNull(),
    currency: text("currency").$type<CurrencyCode>().notNull(),
    direction: text("direction").$type<LedgerDirection>().notNull(),
    status: text("status").$type<LedgerStatus>().notNull(),
    accountId: text("account_id").notNull(),
    cardId: text("card_id"),
    channel: text("channel").$type<LedgerChannel>().notNull(),
    geo: jsonb("geo").$type<GeoPoint>().notNull(),
    riskScore: integer("risk_score").notNull(),
    reference: text("reference").notNull(),
  },
  (table) => [
    index("ledger_owner_ts_idx").on(table.ownerId, table.ts),
    index("ledger_status_idx").on(table.status),
  ],
);

export const wires = pgTable(
  "wires",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    reference: text("reference").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    recipientName: text("recipient_name").notNull(),
    recipientEntity: text("recipient_entity").notNull(),
    iban: text("iban").notNull(),
    swift: text("swift").notNull(),
    sourceCurrency: text("source_currency").$type<CurrencyCode>().notNull(),
    targetCurrency: text("target_currency").$type<CurrencyCode>().notNull(),
    sourceAmount: doublePrecision("source_amount").notNull(),
    targetAmount: doublePrecision("target_amount").notNull(),
    rate: doublePrecision("rate").notNull(),
    fee: doublePrecision("fee").notNull(),
    spreadBps: integer("spread_bps").notNull(),
    etaSeconds: integer("eta_seconds").notNull(),
    status: text("status").$type<WireStatus>().notNull(),
    authMethod: text("auth_method").$type<"biometric" | "otp">().notNull(),
  },
  (table) => [index("wires_owner_idx").on(table.ownerId)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    ts: timestamp("ts", { withTimezone: true, mode: "string" })
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    severity: text("severity").$type<AlertSeverity>().notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    confidence: integer("confidence").notNull(),
    geo: jsonb("geo").$type<GeoPoint>().notNull(),
    ledgerId: text("ledger_id"),
    resolved: boolean("resolved").notNull().default(false),
    vector: text("vector").notNull(),
  },
  (table) => [index("alerts_owner_idx").on(table.ownerId)],
);

export const marketAssets = pgTable("market_assets", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull(),
  price: doublePrecision("price").notNull(),
  change24h: doublePrecision("change_24h").notNull(),
  series: jsonb("series").$type<number[]>().notNull(),
});

export type AccountRow = typeof accounts.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type LedgerRow = typeof ledger.$inferSelect;
export type WireRow = typeof wires.$inferSelect;
export type AlertRow = typeof alerts.$inferSelect;
export type MarketRow = typeof marketAssets.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
