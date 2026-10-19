/**
 * AETHER // CAPITAL — strict domain model.
 * Every entity crossing the wire (Postgres -> API -> Zustand -> UI) is typed here.
 */

export type CurrencyCode = "USD" | "EUR" | "GBP" | "BTC" | "ETH";

export type AssetClass = "fiat" | "crypto";

export interface CurrencyAccount {
  id: string;
  code: CurrencyCode;
  name: string;
  assetClass: AssetClass;
  /** Native balance expressed in the account currency. */
  balance: number;
  /** Units of account currency per 1 USD. */
  rateToUsd: number;
  change24h: number;
  iban: string;
  available: number;
}

export type CardNetwork = "VISA" | "MASTERCARD";

export type CardFinish = "titanium" | "holographic" | "frosted";

export interface CardControls {
  frozen: boolean;
  onlineEnabled: boolean;
  internationalEnabled: boolean;
  contactlessEnabled: boolean;
  atmEnabled: boolean;
  /** Daily online spend cap, in USD. */
  dailyOnlineLimit: number;
  /** Daily ATM withdrawal cap, in USD. */
  dailyAtmLimit: number;
}

export interface PaymentCard {
  id: string;
  label: string;
  holder: string;
  network: CardNetwork;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  finish: CardFinish;
  isVirtual: boolean;
  balance: number;
  spend30d: number;
  controls: CardControls;
  createdAt: string;
  /** Seconds until expiry for single-use burner cards; `null` for physical cards. */
  expiresInSeconds: number | null;
}

export type LedgerStatus = "settled" | "pending" | "disputed" | "reversed";

export type LedgerDirection = "debit" | "credit";

export type LedgerCategory =
  | "SaaS"
  | "Travel"
  | "Payroll"
  | "Equipment"
  | "Dining"
  | "Marketing"
  | "Wire"
  | "FX"
  | "Crypto"
  | "Utilities"
  | "Retail"
  | "Professional";

export type LedgerChannel =
  | "card"
  | "wire"
  | "ach"
  | "fx"
  | "crypto"
  | "internal";

export interface GeoPoint {
  lat: number;
  lng: number;
  city: string;
  country: string;
  countryCode: string;
}

export interface LedgerEntry {
  id: string;
  ts: string;
  merchant: string;
  category: LedgerCategory;
  amount: number;
  currency: CurrencyCode;
  direction: LedgerDirection;
  status: LedgerStatus;
  accountId: string;
  cardId: string | null;
  channel: LedgerChannel;
  geo: GeoPoint;
  riskScore: number;
  reference: string;
}

export interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  series: number[];
}

export type Timeframe = "1H" | "24H" | "7D" | "30D" | "1Y" | "ALL";

export interface SeriesPoint {
  /** epoch millis */
  t: number;
  label: string;
  value: number;
}

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface SecurityAlert {
  id: string;
  ts: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  confidence: number;
  geo: GeoPoint;
  ledgerId: string | null;
  resolved: boolean;
  vector: string;
}

export type WireStatus =
  | "draft"
  | "authorizing"
  | "in_transit"
  | "settled"
  | "rejected";

export interface Recipient {
  id: string;
  name: string;
  entity: string;
  iban: string;
  swift: string;
  currency: CurrencyCode;
  country: string;
  countryCode: string;
  trustScore: number;
  lastUsed: string | null;
}

export interface WireTransfer {
  id: string;
  reference: string;
  createdAt: string;
  recipientName: string;
  recipientEntity: string;
  iban: string;
  swift: string;
  sourceCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  spreadBps: number;
  etaSeconds: number;
  status: WireStatus;
  authMethod: "biometric" | "otp";
}

export interface FxQuote {
  midRate: number;
  clientRate: number;
  spreadBps: number;
  fee: number;
  targetAmount: number;
  etaSeconds: number;
  route: string[];
}

export type ViewMode = "desktop" | "mobile";

export type ThemeMode = "dark" | "light";

export type DeviceOrientation = "portrait" | "landscape";

export type MobileTab = "home" | "cards" | "transfer" | "activity" | "vault";

export interface ToastMessage {
  id: string;
  title: string;
  body: string;
  tone: "neutral" | "positive" | "negative" | "warning" | "signal";
  ttl: number;
}

export interface IslandPayload {
  kind: "idle" | "transfer" | "incoming" | "fraud" | "frozen";
  title: string;
  detail: string;
  amount?: number;
  currency?: CurrencyCode;
}

/** Persisted per-user UI state — restored on every sign-in. */
export interface UserPrefs {
  viewMode: ViewMode;
  theme: ThemeMode;
  simulation: boolean;
  sound: boolean;
  orientation: DeviceOrientation;
  mobileTab: MobileTab;
  timeframe: Timeframe;
  activeCardId: string | null;
}

export const DEFAULT_PREFS: UserPrefs = {
  viewMode: "desktop",
  theme: "dark",
  simulation: true,
  sound: true,
  orientation: "portrait",
  mobileTab: "home",
  timeframe: "30D",
  activeCardId: null,
};

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  isDemo: boolean;
  createdAt: string;
  prefs: UserPrefs;
}

export type AuthAction = "login" | "signup" | "logout";

export interface PortfolioSnapshot {
  accounts: CurrencyAccount[];
  cards: PaymentCard[];
  ledger: LedgerEntry[];
  alerts: SecurityAlert[];
  wires: WireTransfer[];
  market: MarketAsset[];
  recipients: Recipient[];
  history: Record<Timeframe, SeriesPoint[]>;
  generatedAt: string;
}
