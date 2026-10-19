import { create } from "zustand";
import { fetchPortfolio, mintBurnerCard, patchCard, createWire, resolveAlert, type CreateWireInput, type MintBurnerInput } from "@/lib/api";
import { audio, type SoundCue } from "@/lib/audio";
import { convert, createRateTable, jitterRate, toUsd, type RateTable } from "@/lib/fx";
import { CURRENCY_ORDER } from "@/lib/fx";
import type {
  CardControls,
  CurrencyAccount,
  CurrencyCode,
  DeviceOrientation,
  IslandPayload,
  LedgerCategory,
  LedgerEntry,
  MarketAsset,
  MobileTab,
  PaymentCard,
  Recipient,
  SecurityAlert,
  SeriesPoint,
  ThemeMode,
  Timeframe,
  ToastMessage,
  ViewMode,
  WireTransfer,
} from "@/lib/types";
import { clamp, createId, roundTo } from "@/lib/utils";

export type HydrationStatus = "idle" | "loading" | "ready" | "error";

export type LiveEventType =
  | "price"
  | "spend"
  | "incoming"
  | "fraud"
  | "wire"
  | "freeze";

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  ts: number;
  message: string;
  amountUsd?: number;
}

export interface LedgerFilters {
  query: string;
  categories: LedgerCategory[];
  statuses: string[];
  accounts: string[];
  minAmount: number;
  maxAmount: number;
}

export const DEFAULT_FILTERS: LedgerFilters = {
  query: "",
  categories: [],
  statuses: [],
  accounts: [],
  minAmount: 0,
  maxAmount: 1_000_000,
};

interface AetherState {
  status: HydrationStatus;
  error: string | null;

  viewMode: ViewMode;
  theme: ThemeMode;
  simulation: boolean;
  sound: boolean;
  orientation: DeviceOrientation;
  mobileTab: MobileTab;
  timeframe: Timeframe;
  activeCardId: string;
  showCvvFor: string | null;

  accounts: CurrencyAccount[];
  cards: PaymentCard[];
  ledger: LedgerEntry[];
  alerts: SecurityAlert[];
  wires: WireTransfer[];
  market: MarketAsset[];
  recipients: Recipient[];
  history: Record<Timeframe, SeriesPoint[]>;
  rates: RateTable;
  filters: LedgerFilters;

  island: { expanded: boolean; payload: IslandPayload };
  toasts: ToastMessage[];
  events: LiveEvent[];
  refreshing: boolean;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  toggleTheme: () => void;
  setSimulation: (on: boolean) => void;
  toggleSound: () => void;
  setOrientation: (orientation: DeviceOrientation) => void;
  setMobileTab: (tab: MobileTab) => void;
  setTimeframe: (tf: Timeframe) => void;
  setActiveCardId: (id: string) => void;
  revealCvv: (id: string | null) => void;
  setFilters: (patch: Partial<LedgerFilters>) => void;
  resetFilters: () => void;

  tickMarket: () => void;
  injectLiveEntry: (entry: LedgerEntry) => void;
  raiseAlert: (alert: SecurityAlert) => void;
  resolveAlertById: (id: string) => void;
  updateCardControls: (cardId: string, patch: Partial<CardControls>) => Promise<void>;
  mintBurner: (input: MintBurnerInput) => Promise<PaymentCard | null>;
  submitWire: (input: CreateWireInput) => Promise<WireTransfer | null>;
  expandIsland: (payload: IslandPayload, ttl?: number) => void;
  collapseIsland: () => void;
  pushToast: (toast: Omit<ToastMessage, "id" | "ttl"> & { ttl?: number }) => void;
  dismissToast: (id: string) => void;
  recordEvent: (event: Omit<LiveEvent, "id" | "ts">) => void;
  playSound: (cue: SoundCue, haptic?: number | number[]) => void;
}

const EMPTY_HISTORY: Record<Timeframe, SeriesPoint[]> = {
  "1H": [],
  "24H": [],
  "7D": [],
  "30D": [],
  "1Y": [],
  ALL: [],
};

export const useAetherStore = create<AetherState>()((set, get) => ({
  status: "idle",
  error: null,

  viewMode: "desktop",
  theme: "dark",
  simulation: true,
  sound: true,
  orientation: "portrait",
  mobileTab: "home",
  timeframe: "30D",
  activeCardId: "card_titanium_01",
  showCvvFor: null,

  accounts: [],
  cards: [],
  ledger: [],
  alerts: [],
  wires: [],
  market: [],
  recipients: [],
  history: EMPTY_HISTORY,
  rates: createRateTable(),
  filters: DEFAULT_FILTERS,

  island: { expanded: false, payload: { kind: "idle", title: "AETHER", detail: "All systems nominal" } },
  toasts: [],
  events: [],
  refreshing: false,

  hydrate: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const snapshot = await fetchPortfolio();
      const rates = createRateTable();
      const btc = snapshot.market.find((m) => m.symbol === "BTC");
      const eth = snapshot.market.find((m) => m.symbol === "ETH");
      if (btc && btc.price > 0) rates.BTC = 1 / btc.price;
      if (eth && eth.price > 0) rates.ETH = 1 / eth.price;
      set({
        status: "ready",
        accounts: snapshot.accounts,
        cards: snapshot.cards,
        ledger: snapshot.ledger,
        alerts: snapshot.alerts,
        wires: snapshot.wires,
        market: snapshot.market,
        recipients: snapshot.recipients,
        history: snapshot.history,
        rates,
        activeCardId: snapshot.cards[0]?.id ?? "card_titanium_01",
      });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Unable to reach treasury API",
      });
    }
  },

  refresh: async () => {
    if (get().refreshing) return;
    set({ refreshing: true });
    try {
      const snapshot = await fetchPortfolio();
      const state = get();
      set({
        accounts: snapshot.accounts.map((account) => {
          const live = state.accounts.find((a) => a.id === account.id);
          return live ? { ...account, balance: live.balance, change24h: live.change24h } : account;
        }),
        cards: snapshot.cards.map((card) => {
          const live = state.cards.find((c) => c.id === card.id);
          return live ? { ...card, controls: live.controls } : card;
        }),
        wires: snapshot.wires,
        alerts: snapshot.alerts,
        refreshing: false,
      });
    } catch {
      set({ refreshing: false });
    }
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
    get().playSound("whoosh", 8);
  },
  toggleTheme: () => {
    set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" }));
    get().playSound("tap", 6);
  },
  setSimulation: (on) => {
    set({ simulation: on });
    get().playSound(on ? "confirm" : "tap", on ? [10, 30, 10] : 6);
  },
  toggleSound: () => {
    const next = !get().sound;
    audio.setEnabled(next);
    set({ sound: next });
    if (next) audio.play("confirm");
  },
  setOrientation: (orientation) => set({ orientation }),
  setMobileTab: (tab) => {
    set({ mobileTab: tab });
    get().playSound("tap", 10);
  },
  setTimeframe: (tf) => {
    set({ timeframe: tf });
    get().playSound("tap");
  },
  setActiveCardId: (id) => {
    set({ activeCardId: id, showCvvFor: null });
    get().playSound("whoosh", 8);
  },
  revealCvv: (id) => set({ showCvvFor: id }),
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  tickMarket: () => {
    const state = get();
    const rates = jitterRate(state.rates, 0.0016);

    const market = state.market.map((asset) => {
      const vol = asset.symbol === "EURUSD" ? 0.0004 : asset.symbol === "SPX" ? 0.0009 : 0.0035;
      const price = Math.max(0.000001, asset.price * (1 + (Math.random() - 0.5) * vol * 2));
      const series = [...asset.series.slice(-47), roundTo(price, asset.symbol === "EURUSD" ? 5 : 2)];
      const first = series[0] ?? price;
      const change24h = ((price - first) / first) * 100;
      return { ...asset, price, series, change24h: roundTo(change24h, 2) };
    });

    const btc = market.find((m) => m.symbol === "BTC");
    const eth = market.find((m) => m.symbol === "ETH");
    if (btc && btc.price > 0) rates.BTC = 1 / btc.price;
    if (eth && eth.price > 0) rates.ETH = 1 / eth.price;

    const accounts = state.accounts.map((account) => ({
      ...account,
      rateToUsd: rates[account.code],
      change24h: roundTo(
        account.change24h + (Math.random() - 0.5) * (account.assetClass === "crypto" ? 0.09 : 0.02),
        2,
      ),
    }));

    const history = { ...state.history };
    (Object.keys(history) as Timeframe[]).forEach((tf) => {
      const series = history[tf];
      if (series.length === 0) return;
      const last = series[series.length - 1]!;
      const netWorth = accounts.reduce((sum, a) => sum + toUsd(a, rates), 0);
      const step = tf === "1H" ? 60_000 : tf === "24H" ? 900_000 : 3_600_000;
      if (tf === "1H" || tf === "24H") {
        const nextPoint: SeriesPoint = {
          t: Date.now(),
          label: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          value: roundTo(netWorth, 2),
        };
        history[tf] = [...series.slice(-(tf === "1H" ? 59 : 95)), nextPoint];
        void step;
      } else {
        history[tf] = [
          ...series.slice(0, -1),
          { ...last, value: roundTo(last.value * 0.9994 + netWorth * 0.0006, 2) },
        ];
      }
    });

    set({ rates, market, accounts, history });
  },

  injectLiveEntry: (entry) => {
    const state = get();
    const delta = entry.direction === "credit" ? entry.amount : -entry.amount;
    const usdDelta = convert(delta, entry.currency, "USD", state.rates);
    const accounts = state.accounts.map((account) =>
      account.id === entry.accountId
        ? { ...account, balance: Math.max(0, account.balance + delta) }
        : account,
    );
    const cards = state.cards.map((card) =>
      card.id === entry.cardId && entry.direction === "debit"
        ? { ...card, spend30d: card.spend30d + Math.abs(usdDelta) }
        : card,
    );
    set({
      ledger: [entry, ...state.ledger].slice(0, 1_600),
      accounts,
      cards,
    });
  },

  raiseAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 24) })),

  resolveAlertById: (id) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, resolved: true } : alert,
      ),
    }));
    void resolveAlert(id, true).catch(() => undefined);
    get().playSound("confirm", [10, 20, 10]);
  },

  updateCardControls: async (cardId, patch) => {
    const state = get();
    const previous = state.cards;
    set({
      cards: state.cards.map((card) =>
        card.id === cardId ? { ...card, controls: { ...card.controls, ...patch } } : card,
      ),
    });
    if (patch.frozen !== undefined) {
      get().playSound(patch.frozen ? "freeze" : "confirm", patch.frozen ? [18, 40, 18] : 12);
    } else {
      get().playSound("tap", 6);
    }
    try {
      const { card } = await patchCard(cardId, patch);
      set((s) => ({ cards: s.cards.map((c) => (c.id === card.id ? card : c)) }));
    } catch {
      set({ cards: previous });
      get().pushToast({
        title: "Control update failed",
        body: "The instruction could not be persisted to the ledger.",
        tone: "negative",
      });
    }
  },

  mintBurner: async (input) => {
    try {
      const { card } = await mintBurnerCard(input);
      set((state) => ({ cards: [...state.cards, card], activeCardId: card.id }));
      get().pushToast({
        title: "Virtual card minted",
        body: `${card.label} · •••• ${card.last4} is live and single-use.`,
        tone: "positive",
      });
      get().playSound("confirm", [10, 24, 10]);
      return card;
    } catch (error) {
      get().pushToast({
        title: "Mint rejected",
        body: error instanceof Error ? error.message : "Unknown issuer error",
        tone: "negative",
      });
      get().playSound("reject", 30);
      return null;
    }
  },

  submitWire: async (input) => {
    try {
      const { wire, entry } = await createWire(input);
      set((state) => ({
        wires: [wire, ...state.wires],
        ledger: entry ? [entry, ...state.ledger].slice(0, 1_600) : state.ledger,
        accounts: state.accounts.map((account) =>
          account.id === "acc_usd_ops"
            ? { ...account, balance: Math.max(0, account.balance - input.sourceAmount) }
            : account,
        ),
      }));
      get().playSound("cash", [12, 24, 12]);
      return wire;
    } catch (error) {
      get().pushToast({
        title: "Wire rejected",
        body: error instanceof Error ? error.message : "Compliance block",
        tone: "negative",
      });
      get().playSound("reject", [40, 30, 40]);
      return null;
    }
  },

  expandIsland: (payload, ttl = 4200) => {
    set({ island: { expanded: true, payload } });
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        if (get().island.payload.title === payload.title) {
          set({ island: { expanded: false, payload: { kind: "idle", title: "AETHER", detail: "All systems nominal" } } });
        }
      }, ttl);
    }
  },

  collapseIsland: () =>
    set({ island: { expanded: false, payload: { kind: "idle", title: "AETHER", detail: "All systems nominal" } } }),

  pushToast: (toast) => {
    const id = createId("toast");
    const ttl = toast.ttl ?? 4200;
    set((state) => ({
      toasts: [...state.toasts, { id, title: toast.title, body: toast.body, tone: toast.tone, ttl }].slice(-4),
    }));
    if (typeof window !== "undefined") {
      window.setTimeout(() => get().dismissToast(id), ttl);
    }
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  recordEvent: (event) =>
    set((state) => ({
      events: [{ ...event, id: createId("evt"), ts: Date.now() }, ...state.events].slice(0, 40),
    })),

  playSound: (cue, haptic) => {
    if (!get().sound) {
      if (haptic !== undefined) audio.haptic(haptic);
      return;
    }
    audio.play(cue);
    if (haptic !== undefined) audio.haptic(haptic);
  },
}));

/* --------------------------------- selectors -------------------------------- */

export type BalanceSlice = Pick<AetherState, "accounts" | "rates">;
export type LedgerSlice = Pick<AetherState, "ledger" | "rates">;

export function selectNetWorthUsd(state: BalanceSlice): number {
  return state.accounts.reduce((sum, account) => sum + toUsd(account, state.rates), 0);
}

export function selectUsdEquivalent(
  amount: number,
  code: CurrencyCode,
  rates: RateTable,
): number {
  return convert(amount, code, "USD", rates);
}

export interface CategorySlice {
  category: LedgerCategory;
  total: number;
  count: number;
  share: number;
}

export function selectBurnByCategory(state: LedgerSlice, days = 30): CategorySlice[] {
  const cutoff = Date.now() - days * 86_400_000;
  const totals = new Map<LedgerCategory, { total: number; count: number }>();
  state.ledger.forEach((entry) => {
    if (entry.direction !== "debit") return;
    if (new Date(entry.ts).getTime() < cutoff) return;
    const usd = Math.abs(convert(entry.amount, entry.currency, "USD", state.rates));
    const current = totals.get(entry.category) ?? { total: 0, count: 0 };
    totals.set(entry.category, { total: current.total + usd, count: current.count + 1 });
  });
  const sum = [...totals.values()].reduce((acc, v) => acc + v.total, 0) || 1;
  return [...totals.entries()]
    .map(([category, value]) => ({
      category,
      total: value.total,
      count: value.count,
      share: (value.total / sum) * 100,
    }))
    .sort((a, b) => b.total - a.total);
}

export function selectRunwayMonths(
  state: Pick<AetherState, "accounts" | "rates" | "ledger">,
): number {
  const slices = selectBurnByCategory(state, 30);
  const monthlyBurn = slices.reduce((sum, slice) => sum + slice.total, 0);
  const liquidity = selectNetWorthUsd(state);
  if (monthlyBurn <= 0) return 999;
  return clamp(liquidity / monthlyBurn, 0, 999);
}

export const CURRENCIES: CurrencyCode[] = CURRENCY_ORDER;
