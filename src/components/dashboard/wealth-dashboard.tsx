"use client";

import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Landmark,
  Lock,
  RefreshCw,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Badge, Sparkline, StatusDot } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/feedback";
import { CURRENCY_META, formatMoney, formatPercent, formatUsd } from "@/lib/format";
import { convert, toUsd } from "@/lib/fx";
import type { CurrencyAccount } from "@/lib/types";
import { cn } from "@/lib/utils";
import { selectNetWorthUsd, useAetherStore } from "@/store/useAetherStore";

/** Marquee of live market instruments — hardware accelerated, seamless loop. */
export function MarketTicker() {
  const market = useAetherStore((s) => s.market);
  const rates = useAetherStore((s) => s.rates);

  const items = useMemo(() => {
    const base = market.map((asset) => ({
      key: asset.symbol,
      symbol: asset.symbol,
      price: asset.price,
      change: asset.change24h,
      series: asset.series,
    }));
    const fx = (["EUR", "GBP"] as const).map((code) => ({
      key: `${code}USD`,
      symbol: `${code}/USD`,
      price: 1 / (rates[code] || 1),
      change:
        useAetherStore.getState().accounts.find((a) => a.code === code)?.change24h ?? 0,
      series: [],
    }));
    return [...base, ...fx];
  }, [market, rates]);

  if (items.length === 0) {
    return (
      <div className="flex h-11 items-center gap-4 overflow-hidden border-y border-[var(--line)] px-4">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3.5 w-36" />
      </div>
    );
  }

  const row = [...items, ...items];

  return (
    <div
      className="relative flex h-11 items-center overflow-hidden border-y border-[var(--line)] bg-[var(--surface)]"
      aria-label="Live market ticker"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--canvas)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--canvas)] to-transparent" />
      <div className="anim-ticker flex w-max items-center gap-8 pl-8">
        {row.map((item, index) => {
          const up = item.change >= 0;
          return (
            <div key={`${item.key}-${index}`} className="flex items-center gap-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
                {item.symbol}
              </span>
              <span className="numeric text-[11px] font-semibold text-ink">
                {item.price.toLocaleString("en-US", {
                  maximumFractionDigits: item.price < 10 ? 5 : 2,
                  minimumFractionDigits: item.price < 10 ? 5 : 2,
                })}
              </span>
              <span
                className={cn(
                  "numeric text-[10px] font-medium",
                  up ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
                )}
              >
                {formatPercent(item.change)}
              </span>
              {item.series.length > 4 && (
                <Sparkline
                  data={item.series.slice(-24)}
                  width={54}
                  height={16}
                  strokeWidth={1.2}
                  stroke={up ? "var(--positive)" : "var(--negative)"}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccountRow({ account, index }: { account: CurrencyAccount; index: number }) {
  const rates = useAetherStore((s) => s.rates);
  const meta = CURRENCY_META[account.code];
  const usd = toUsd(account, rates);
  const up = account.change24h >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.045, type: "spring", stiffness: 260, damping: 28 }}
      className="group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] font-mono text-[11px] font-semibold text-ink"
        aria-hidden
      >
        {meta.symbol}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-ink">{account.name}</p>
          {account.assetClass === "crypto" && <Badge tone="signal"> custody</Badge>}
        </div>
        <p className="numeric mt-0.5 truncate text-[11px] text-muted">
          {formatMoney(account.balance, account.code)} {account.code}
          <span className="mx-1.5 text-dim">≈</span>
          {formatUsd(usd)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "numeric text-[12px] font-semibold",
            up ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
          )}
        >
          {formatPercent(account.change24h)}
        </p>
        <p className="numeric mt-0.5 text-[10px] text-dim">
          1 {account.code} = {account.code === "USD" ? "1.0000" : convert(1, account.code, "USD", rates).toFixed(4)} $
        </p>
      </div>
    </motion.div>
  );
}

export function WealthDashboard({
  onTransfer,
  onSwap,
}: {
  onTransfer: () => void;
  onSwap: () => void;
}) {
  const accounts = useAetherStore((s) => s.accounts);
  const rates = useAetherStore((s) => s.rates);
  const status = useAetherStore((s) => s.status);
  const refreshing = useAetherStore((s) => s.refreshing);
  const refresh = useAetherStore((s) => s.refresh);
  const netWorth = useAetherStore(selectNetWorthUsd);

  const totalChange = useMemo(() => {
    if (accounts.length === 0) return 0;
    const weighted = accounts.reduce(
      (sum, account) => sum + account.change24h * toUsd(account, rates),
      0,
    );
    return netWorth > 0 ? weighted / netWorth : 0;
  }, [accounts, rates, netWorth]);

  const loading = status !== "ready";

  return (
    <Panel
      depth={1}
      eyebrow="Treasury · multi-currency"
      title="Aggregate Balance Engine"
      subtitle="Zero-fee internal conversion across 5 currency books"
      actions={
        <Button
          variant="ghost"
          size="xs"
          loading={refreshing}
          icon={<RefreshCw className={cn("size-3.5", refreshing && "anim-spin-slow")} />}
          onClick={() => void refresh()}
        >
          Sync
        </Button>
      }
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(135deg,var(--accent-soft),transparent_58%)] p-5">
        <div
          aria-hidden
          className="anim-breathe pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-accent/25 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Wallet className="size-3.5 text-accent" aria-hidden />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
              total holdings · usd
            </p>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-11 w-64" />
          ) : (
            <motion.p
              key={Math.round(netWorth / 100)}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className="numeric mt-2 text-[clamp(1.75rem,3.4vw,2.4rem)] font-semibold leading-none tracking-[-0.04em] text-ink"
            >
              {formatUsd(netWorth)}
            </motion.p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge tone={totalChange >= 0 ? "positive" : "negative"}>
              {formatPercent(totalChange)} 24h
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <StatusDot tone="positive" />
              <span className="font-mono">SOC2 · PCI-DSS L1 · FCA regulated</span>
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" icon={<ArrowUpRight className="size-4" />} onClick={onTransfer}>
              Send wire
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<ArrowLeftRight className="size-4" />}
              onClick={onSwap}
            >
              FX swap
            </Button>
            <Button size="sm" variant="subtle" icon={<Landmark className="size-4" />}>
              Accounts
            </Button>
            <Button size="sm" variant="ghost" icon={<Lock className="size-4" />}>
              Vault
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          : accounts.map((account, index) => (
              <AccountRow key={account.id} account={account} index={index} />
            ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[var(--line)] px-3.5 py-2.5">
        <Sparkles className="size-3.5 shrink-0 text-[color:var(--signal)]" aria-hidden />
        <p className="text-[11px] leading-relaxed text-muted">
          Internal book transfers between your {accounts.length || 5} currency accounts settle
          instantly at the mid-market rate with{" "}
          <span className="font-semibold text-ink">0 bps</span> spread and no wire fee.
        </p>
      </div>
    </Panel>
  );
}
