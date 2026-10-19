"use client";

import { motion, useMotionValue, useSpring, useTransform, type PanInfo } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Coins,
  CreditCard,
  Flame,
  Lock,
  PiggyBank,
  Plus,
  ScanLine,
  Search,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Highlight, ProgressRing, StatusDot } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Slider, Toggle } from "@/components/ui/controls";
import { CardCanvas } from "@/components/cards/card-canvas";
import { TransferWizard } from "@/components/transfers/transfer-wizard";
import { CURRENCY_META, formatMoney, formatPercent, formatSignedMoney, formatUsd } from "@/lib/format";
import { convert, toUsd } from "@/lib/fx";
import type { LedgerEntry } from "@/lib/types";
import { CATEGORY_COLORS, cn, createId, initials, relativeTime, roundTo, scoreRisk } from "@/lib/utils";
import { selectBurnByCategory, selectNetWorthUsd, selectRunwayMonths, useAetherStore } from "@/store/useAetherStore";
import { useAuthStore } from "@/store/useAuthStore";

/* ---------------------------- swipe to confirm ---------------------------- */

export function SwipeToPay({ amountUsd, onComplete }: { amountUsd: number; onComplete: () => void }) {
  const [done, setDone] = useState(false);
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 380, damping: 34 });
  const trackWidth = 306;
  const knobSize = 52;
  const max = trackWidth - knobSize - 8;
  const progress = useTransform(springX, (v) => Math.min(1, Math.max(0, v / max)));
  const labelOpacity = useTransform(progress, (v) => 1 - v * 1.4);
  const fillWidth = useTransform(progress, (p) => p * trackWidth);
  const playSound = useAetherStore((s) => s.playSound);

  const handleEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.x > max * 0.78 || info.velocity.x > 620) {
      setDone(true);
      playSound("cash", [16, 30, 16]);
      onComplete();
      window.setTimeout(() => {
        setDone(false);
        x.set(0);
      }, 2_400);
      return;
    }
    playSound("reject", 18);
    x.set(0);
  };

  return (
    <div
      className="relative h-[60px] w-full overflow-hidden rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)]"
      style={{ maxWidth: trackWidth }}
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent/45 to-[color:var(--signal)]/35"
        style={{ width: fillWidth }}
        aria-hidden
      />
      <motion.span
        className="absolute inset-0 grid place-items-center text-[12px] font-semibold tracking-[-0.01em] text-ink"
        style={{ opacity: labelOpacity }}
      >
        {done ? "Sent · settled instantly" : `Slide to pay ${formatUsd(amountUsd)}`}
      </motion.span>
      <motion.button
        type="button"
        aria-label={`Slide to confirm payment of ${formatUsd(amountUsd)}`}
        drag="x"
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0.08}
        style={{ x: springX }}
        onDragEnd={handleEnd}
        className={cn(
          "absolute left-1 top-1 grid size-[52px] place-items-center rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.5)]",
          done ? "bg-[color:var(--positive)] text-black" : "bg-accent text-[color:var(--accent-ink)]",
        )}
      >
        {done ? <BadgeCheck className="size-5" /> : <ArrowUpRight className="size-5" />}
      </motion.button>
    </div>
  );
}

/* --------------------------------- home ---------------------------------- */

export function HomeScreen() {
  const netWorth = useAetherStore(selectNetWorthUsd);
  const user = useAuthStore((s) => s.user);
  const accounts = useAetherStore((s) => s.accounts);
  const cards = useAetherStore((s) => s.cards);
  const rates = useAetherStore((s) => s.rates);
  const ledger = useAetherStore((s) => s.ledger);
  const setMobileTab = useAetherStore((s) => s.setMobileTab);
  const injectLiveEntry = useAetherStore((s) => s.injectLiveEntry);
  const expandIsland = useAetherStore((s) => s.expandIsland);
  const pushToast = useAetherStore((s) => s.pushToast);
  const status = useAetherStore((s) => s.status);

  const change = accounts.reduce((sum, a) => sum + a.change24h * toUsd(a, rates), 0) / Math.max(1, netWorth);
  const recent = ledger.slice(0, 5);

  const quickPay = () => {
    const amount = roundTo(120 + Math.random() * 2_400, 2);
    const ts = new Date().toISOString();
    const geo = { lat: 37.7749, lng: -122.4194, city: "San Francisco", country: "United States", countryCode: "US" };
    const entry: LedgerEntry = {
      id: createId("led_swipe"),
      ts,
      merchant: "Tap-to-pay · Ferry Building",
      category: "Dining",
      amount,
      currency: "USD",
      direction: "debit",
      status: "settled",
      accountId: accounts[0]?.id ?? "",
      cardId: (cards.find((card) => !card.isVirtual) ?? cards[0])?.id ?? null,
      channel: "card",
      geo,
      riskScore: scoreRisk({ amount, ts, category: "Dining", geo, channel: "card" }).score,
      reference: `AE-2026-${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    };
    injectLiveEntry(entry);
    expandIsland({ kind: "transfer", title: "Tap-to-pay sent", detail: entry.merchant, amount, currency: "USD" }, 4200);
    pushToast({ title: "Payment sent", body: `${formatUsd(amount)} · settled in 240 ms`, tone: "positive" });
  };

  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-14">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
            @{user?.username ?? "guest"}
          </p>
          <p className="mt-1 truncate text-[17px] font-semibold tracking-[-0.02em] text-ink">
            {user?.displayName ?? "Treasury"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileTab("vault")}
          aria-label="Open vault"
          className="grid size-9 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-muted"
        >
          <ScanLine className="size-4" />
        </button>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-3xl border border-[var(--line)] bg-[linear-gradient(150deg,var(--accent-soft),transparent_62%)] p-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">total balance</p>
        <p className="numeric mt-1.5 text-[30px] font-semibold leading-none tracking-[-0.045em] text-ink">
          {status === "ready" ? formatUsd(netWorth) : "—"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge tone={change >= 0 ? "positive" : "negative"}>{formatPercent(change)} 24h</Badge>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
            <StatusDot tone="positive" /> live
          </span>
        </div>
        <div className="mt-4">
          <SwipeToPay amountUsd={1_250} onComplete={quickPay} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Send", icon: ArrowUpRight, tab: "transfer" as const },
          { label: "Cards", icon: CreditCard, tab: "cards" as const },
          { label: "Activity", icon: Wallet, tab: "activity" as const },
          { label: "Vault", icon: Lock, tab: "vault" as const },
        ].map((action) => (
          <motion.button
            key={action.label}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setMobileTab(action.tab)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-3"
          >
            <action.icon className="size-4 text-accent" aria-hidden />
            <span className="text-[10px] font-medium text-ink">{action.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">holdings</p>
        <button type="button" className="inline-flex items-center gap-1 text-[10px] text-accent" onClick={() => setMobileTab("activity")}>
          All <ChevronRight className="size-3" />
        </button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="min-w-[132px] shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3"
          >
            <div className="flex items-center gap-1.5">
              <span className="grid size-6 place-items-center rounded-md bg-[var(--surface-3)] font-mono text-[10px] text-ink">
                {CURRENCY_META[account.code].symbol}
              </span>
              <span className="text-[10.5px] font-medium text-ink">{account.code}</span>
            </div>
            <p className="numeric mt-2 text-[12.5px] font-semibold text-ink">
              {formatMoney(account.balance, account.code, { compact: true })}
            </p>
            <p
              className={cn(
                "numeric mt-0.5 text-[9.5px]",
                account.change24h >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
              )}
            >
              {formatPercent(account.change24h)}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.2em] text-dim">latest activity</p>
      <ul className="mt-2 space-y-1.5">
        {recent.map((entry) => (
          <LedgerRow key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}

export function LedgerRow({ entry, query = "" }: { entry: LedgerEntry; query?: string }) {
  const rates = useAetherStore((s) => s.rates);
  const credit = entry.direction === "credit";
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full font-mono text-[9.5px] font-semibold text-black/80"
        style={{ background: CATEGORY_COLORS[entry.category] }}
        aria-hidden
      >
        {initials(entry.merchant)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium text-ink">
          <Highlight text={entry.merchant} query={query} />
        </span>
        <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
          {entry.category} · {entry.geo.city} · {relativeTime(entry.ts)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className={cn(
            "numeric block text-[12px] font-semibold",
            credit ? "text-[color:var(--positive)]" : "text-ink",
          )}
        >
          {formatSignedMoney(entry.amount, entry.currency, entry.direction)}
        </span>
        <span className="numeric mt-0.5 block text-[9px] text-dim">
          {formatUsd(Math.abs(convert(entry.amount, entry.currency, "USD", rates)))}
        </span>
      </span>
    </li>
  );
}

/* --------------------------------- cards --------------------------------- */

export function CardsScreen() {
  const cards = useAetherStore((s) => s.cards);
  const activeCardId = useAetherStore((s) => s.activeCardId);
  const setActiveCardId = useAetherStore((s) => s.setActiveCardId);
  const updateCardControls = useAetherStore((s) => s.updateCardControls);
  const expandIsland = useAetherStore((s) => s.expandIsland);
  const card = cards.find((c) => c.id === activeCardId) ?? cards[0];
  const [limit, setLimit] = useState(card?.controls.dailyOnlineLimit ?? 0);

  if (!card) return <EmptyScreen icon={CreditCard} label="No instruments issued" />;

  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-14">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {cards.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveCardId(item.id);
              setLimit(item.controls.dailyOnlineLimit);
            }}
            aria-pressed={item.id === card.id}
            className={cn(
              "numeric shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-medium transition-colors",
              item.id === card.id
                ? "border-transparent bg-accent text-[color:var(--accent-ink)]"
                : "border-[var(--line)] text-muted",
            )}
          >
            •••• {item.last4}
          </button>
        ))}
      </div>

      <CardCanvas card={card} compact className="mt-2" />

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button
          size="xs"
          variant={card.controls.frozen ? "signal" : "danger"}
          icon={card.controls.frozen ? <Sparkles className="size-3.5" /> : <Snowflake className="size-3.5" />}
          onClick={() => {
            const next = !card.controls.frozen;
            void updateCardControls(card.id, { frozen: next, onlineEnabled: next });
            expandIsland(
              next
                ? { kind: "frozen", title: "Card frozen", detail: `${card.label} •••• ${card.last4}` }
                : { kind: "idle", title: "Card live", detail: `${card.label} •••• ${card.last4}` },
            );
          }}
        >
          {card.controls.frozen ? "Unfreeze" : "Freeze"}
        </Button>
        <Button size="xs" variant="outline" icon={<Plus className="size-3.5" />}>
          Top up
        </Button>
        <Button size="xs" variant="outline" icon={<Lock className="size-3.5" />}>
          Details
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        <div onPointerUp={() => void updateCardControls(card.id, { dailyOnlineLimit: limit })}>
          <Slider
            label="Daily online limit"
            value={limit}
            min={0}
            max={50_000}
            step={500}
            disabled={card.controls.frozen}
            onChange={setLimit}
            format={(value) => formatMoney(value, "USD", { compact: value >= 10_000 })}
          />
        </div>
        <Toggle
          label="Online payments"
          icon={<CreditCard className="size-4" />}
          checked={card.controls.onlineEnabled}
          disabled={card.controls.frozen}
          onChange={(next) => void updateCardControls(card.id, { onlineEnabled: next })}
        />
        <Toggle
          label="International"
          icon={
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
            </svg>
          }
          checked={card.controls.internationalEnabled}
          disabled={card.controls.frozen}
          tone="positive"
          onChange={(next) => void updateCardControls(card.id, { internationalEnabled: next })}
        />
      </div>
    </div>
  );
}

/* ------------------------------- transfer -------------------------------- */

export function TransferScreen() {
  const setMobileTab = useAetherStore((s) => s.setMobileTab);
  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-12">
      <p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">Move money</p>
      <p className="mt-0.5 text-[11px] text-muted">
        Four-step wizard · IBAN validation · live FX · step-up auth
      </p>
      <div className="mt-3">
        <TransferWizard
          open
          variant="inline"
          onClose={() => setMobileTab("home")}
        />
      </div>
    </div>
  );
}

/* -------------------------------- activity -------------------------------- */

export function ActivityScreen() {
  const ledger = useAetherStore((s) => s.ledger);
  const rates = useAetherStore((s) => s.rates);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out" | "flagged">("all");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return ledger
      .filter((entry) => {
        if (filter === "in" && entry.direction !== "credit") return false;
        if (filter === "out" && entry.direction !== "debit") return false;
        if (filter === "flagged" && entry.riskScore < 70) return false;
        if (term.length > 1) {
          const hay = `${entry.merchant} ${entry.category} ${entry.geo.city} ${entry.reference}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      })
      .slice(0, 60);
  }, [ledger, query, filter]);

  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-14">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-dim" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search activity"
          aria-label="Search activity"
          className="h-9 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-8 pr-3 text-[12px] text-ink outline-none placeholder:text-dim focus:border-accent"
        />
      </div>
      <div className="mt-2 flex gap-1.5">
        {(["all", "in", "out", "flagged"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-lg border px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] transition-colors active:scale-95",
              filter === key
                ? "border-transparent bg-accent text-[color:var(--accent-ink)]"
                : "border-[var(--line)] text-muted",
            )}
          >
            {key}
          </button>
        ))}
      </div>
      <p className="numeric mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
        {rows.length} rows · of {ledger.length.toLocaleString("en-US")} · usd equivalent{" "}
        {formatUsd(rows.reduce((sum, e) => sum + Math.abs(convert(e.amount, e.currency, "USD", rates)), 0), {}) }
      </p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((entry) => (
          <LedgerRow key={entry.id} entry={entry} query={query} />
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------- vault ---------------------------------- */

export function VaultScreen() {
  const accounts = useAetherStore((s) => s.accounts);
  const market = useAetherStore((s) => s.market);
  const alerts = useAetherStore((s) => s.alerts);
  const rates = useAetherStore((s) => s.rates);
  const netWorth = useAetherStore(selectNetWorthUsd);
  const runway = useAetherStore(selectRunwayMonths);
  const ledger = useAetherStore((s) => s.ledger);
  const slices = useMemo(() => selectBurnByCategory({ ledger, rates }, 30), [ledger, rates]);
  const openAlerts = alerts.filter((a) => !a.resolved).length;
  const security = Math.max(12, 100 - openAlerts * 14);
  const crypto = accounts.filter((a) => a.assetClass === "crypto");

  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-14">
      <div className="flex items-center gap-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <ProgressRing value={security} size={70} stroke={6} color={security > 70 ? "var(--positive)" : "var(--warning)"} label={`Security score ${security}`}>
          <div className="text-center">
            <ShieldAlert className="mx-auto size-3 text-muted" aria-hidden />
            <p className="numeric text-[13px] font-semibold text-ink">{security}</p>
          </div>
        </ProgressRing>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">Security posture</p>
          <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
            {openAlerts === 0
              ? "No open flags. Hardware keys attested 4 minutes ago."
              : `${openAlerts} open flag${openAlerts === 1 ? "" : "s"} require triage.`}
          </p>
        </div>
      </div>

      <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.2em] text-dim">digital reserve</p>
      <div className="mt-2 space-y-2">
        {crypto.map((account) => {
          const price = market.find((m) => m.symbol === account.code)?.price ?? 0;
          const usd = toUsd(account, rates);
          return (
            <div key={account.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Coins className="size-3.5 text-[color:var(--signal)]" aria-hidden />
                  <span className="text-[12px] font-medium text-ink">{account.code}</span>
                </span>
                <span className="numeric text-[12px] font-semibold text-ink">{formatUsd(usd)}</span>
              </div>
              <div className="numeric mt-1 flex items-center justify-between text-[9.5px] text-muted">
                <span>
                  {account.balance.toLocaleString("en-US", { maximumFractionDigits: 6 })} {account.code}
                </span>
                <span>
                  @ {price.toLocaleString("en-US", { maximumFractionDigits: 2 })} ·{" "}
                  <span className={account.change24h >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]"}>
                    {formatPercent(account.change24h)}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
            <PiggyBank className="size-3" /> treasury apy
          </p>
          <p className="numeric mt-1.5 text-[17px] font-semibold text-[color:var(--positive)]">4.62%</p>
          <p className="mt-0.5 text-[9.5px] text-muted">30-day rolling · MMF sweep</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
            <Flame className="size-3" /> runway
          </p>
          <p className="numeric mt-1.5 text-[17px] font-semibold text-ink">
            {runway > 900 ? "∞" : runway.toFixed(1)}
            <span className="ml-1 text-[9.5px] font-normal text-muted">mo</span>
          </p>
          <p className="mt-0.5 text-[9.5px] text-muted">
            {slices.length > 0 ? `${slices[0].category} leads burn` : "no burn"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">portfolio mix</p>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full">
          {slices.slice(0, 5).map((slice) => (
            <span
              key={slice.category}
              style={{ width: `${slice.share}%`, background: CATEGORY_COLORS[slice.category] }}
              className="h-full"
              title={`${slice.category} ${slice.share.toFixed(1)}%`}
            />
          ))}
        </div>
        <p className="numeric mt-2 text-[10px] text-muted">
          {formatUsd(netWorth)} consolidated · {slices.length} categories
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-[var(--line)] px-3 py-3">
        <ArrowDownLeft className="size-3.5 shrink-0 text-[color:var(--positive)]" aria-hidden />
        <p className="text-[10.5px] leading-relaxed text-muted">
          Vault deposits are custodied with qualified trustees and reconciled hourly against
          on-chain proofs.
        </p>
      </div>
    </div>
  );
}

function EmptyScreen({ icon: Icon, label }: { icon: typeof CreditCard; label: string }) {
  return (
    <div className="grid h-full place-items-center px-8 pb-28 pt-14 text-center">
      <div>
        <Icon className="mx-auto size-6 text-dim" aria-hidden />
        <p className="mt-2 text-[12px] text-muted">{label}</p>
      </div>
    </div>
  );
}
