"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Flame, Gauge, Wallet2 } from "lucide-react";
import { useMemo } from "react";
import { Panel } from "@/components/ui/panel";
import { Badge, ProgressRing } from "@/components/ui/feedback";
import { formatUsd } from "@/lib/format";
import { convert } from "@/lib/fx";
import type { LedgerCategory } from "@/lib/types";
import { CATEGORY_COLORS, cn } from "@/lib/utils";
import { selectBurnByCategory, selectNetWorthUsd, selectRunwayMonths, useAetherStore } from "@/store/useAetherStore";

interface DonutDatum {
  category: LedgerCategory;
  total: number;
  share: number;
  count: number;
}

interface DonutTooltipShape {
  active?: boolean;
  payload?: Array<{ payload?: DonutDatum }>;
}

export function SpendingAnalytics() {
  const ledger = useAetherStore((s) => s.ledger);
  const rates = useAetherStore((s) => s.rates);
  const status = useAetherStore((s) => s.status);
  const netWorth = useAetherStore(selectNetWorthUsd);
  const runway = useAetherStore(selectRunwayMonths);
  const slices = useMemo(() => selectBurnByCategory({ ledger, rates }, 30), [ledger, rates]);

  const flows = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000;
    let inflow = 0;
    let outflow = 0;
    ledger.forEach((entry) => {
      if (new Date(entry.ts).getTime() < cutoff) return;
      const usd = Math.abs(convert(entry.amount, entry.currency, "USD", rates));
      if (entry.direction === "credit") inflow += usd;
      else outflow += usd;
    });
    return { inflow, outflow, net: inflow - outflow };
  }, [ledger, rates]);

  const forecast = useMemo(() => {
    const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    const base = flows.outflow || 1_400_000;
    return months.map((label, index) => {
      const seasonality = 1 + Math.sin(index * 0.9) * 0.08 + index * 0.021;
      const burn = base * seasonality;
      const income = (flows.inflow || base * 1.18) * (1 + Math.cos(index * 0.7) * 0.07 + index * 0.015);
      return { label, burn, income, balance: netWorth + (income - burn) * (index + 1) };
    });
  }, [flows, netWorth]);

  const health = useMemo(() => {
    const ratio = flows.inflow / Math.max(1, flows.outflow);
    const liquidityScore = Math.min(1, runway / 24);
    const concentration = slices.length > 0 ? 1 - Math.min(1, (slices[0]?.share ?? 0) / 60) : 1;
    return Math.round(
      Math.min(100, Math.max(4, ratio * 34 + liquidityScore * 40 + concentration * 26)),
    );
  }, [flows, runway, slices]);

  const healthTone = health >= 72 ? "positive" : health >= 45 ? "warning" : "negative";
  const maxForecast = Math.max(...forecast.map((f) => Math.max(f.burn, f.income)), 1);

  return (
    <Panel
      depth={3}
      eyebrow="Burn analytics · trailing 30 days"
      title="Spend Categorisation & Runway"
      subtitle={`${slices.reduce((sum, s) => sum + s.count, 0)} debits categorised by the merchant graph`}
      actions={
        <Badge tone={healthTone === "positive" ? "positive" : healthTone === "warning" ? "warning" : "negative"}>
          health {health}
        </Badge>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="relative mx-auto h-[200px] w-[200px] lg:mx-0">
          {status !== "ready" ? (
            <div className="size-full animate-pulse rounded-full bg-[var(--surface-2)]" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={(props) => {
                    const shape = props as unknown as DonutTooltipShape;
                    const datum = shape.payload?.[0]?.payload;
                    if (!shape.active || !datum) return null;
                    return (
                      <div className="glass-strong rounded-xl px-3 py-2">
                        <p className="text-[11px] font-semibold text-ink">{datum.category}</p>
                        <p className="numeric text-[13px] font-semibold text-accent">
                          {formatUsd(datum.total)}
                        </p>
                        <p className="numeric text-[10px] text-muted">
                          {datum.share.toFixed(1)}% · {datum.count} txns
                        </p>
                      </div>
                    );
                  }}
                />
                <Pie
                  data={slices.slice(0, 8)}
                  dataKey="total"
                  nameKey="category"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2.4}
                  stroke="var(--canvas)"
                  strokeWidth={2}
                  isAnimationActive
                  animationDuration={750}
                >
                  {slices.slice(0, 8).map((slice) => (
                    <Cell key={slice.category} fill={CATEGORY_COLORS[slice.category]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">30d burn</p>
              <p className="numeric mt-1 text-[17px] font-semibold text-ink">
                {formatUsd(flows.outflow, { sign: false })}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <ul className="space-y-1.5">
            {slices.slice(0, 6).map((slice, index) => (
              <motion.li
                key={slice.category}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group flex items-center gap-3"
              >
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: CATEGORY_COLORS[slice.category] }}
                  aria-hidden
                />
                <span className="w-24 shrink-0 truncate text-[12px] text-ink">{slice.category}</span>
                <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: CATEGORY_COLORS[slice.category] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, slice.share)}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 22, delay: index * 0.04 }}
                  />
                </span>
                <span className="numeric w-24 shrink-0 text-right text-[11px] text-muted">
                  {formatUsd(slice.total, { sign: false })}
                </span>
                <span className="numeric w-11 shrink-0 text-right text-[10px] text-dim">
                  {slice.share.toFixed(1)}%
                </span>
              </motion.li>
            ))}
          </ul>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                <ArrowDownLeft className="size-3" /> inflow 30d
              </p>
              <p className="numeric mt-1.5 text-[14px] font-semibold text-[color:var(--positive)]">
                {formatUsd(flows.inflow, { sign: true })}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                <ArrowUpRight className="size-3" /> outflow 30d
              </p>
              <p className="numeric mt-1.5 text-[14px] font-semibold text-[color:var(--negative)]">
                {formatUsd(-flows.outflow)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                <Flame className="size-3" /> net delta
              </p>
              <p
                className={cn(
                  "numeric mt-1.5 text-[14px] font-semibold",
                  flows.net >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
                )}
              >
                {formatUsd(flows.net, { sign: true })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex items-center gap-4">
          <ProgressRing
            value={health}
            size={86}
            stroke={6}
            color={
              healthTone === "positive"
                ? "var(--positive)"
                : healthTone === "warning"
                  ? "var(--warning)"
                  : "var(--negative)"
            }
            label={`Cash-flow health score ${health} of 100`}
          >
            <div className="text-center">
              <Gauge className="mx-auto size-3.5 text-muted" aria-hidden />
              <p className="numeric mt-0.5 text-[15px] font-semibold text-ink">{health}</p>
            </div>
          </ProgressRing>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
              predictive runway
            </p>
            <p className="numeric mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">
              {runway > 900 ? "∞" : runway.toFixed(1)}
              <span className="ml-1 text-[11px] font-normal text-muted">months</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
              <Wallet2 className="size-3 text-dim" aria-hidden />
              {formatUsd(netWorth)} liquidity at current burn
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
              6-month cash-flow projection
            </p>
            <div className="flex items-center gap-3 text-[10px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[color:var(--positive)]" /> inflow
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[color:var(--negative)]" /> burn
              </span>
            </div>
          </div>
          <div className="mt-3 flex h-[74px] items-end gap-3">
            {forecast.map((month, index) => (
              <div key={month.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <motion.span
                    className="w-1/3 rounded-t-[3px] bg-[color:var(--positive)]/70"
                    initial={{ height: 0 }}
                    animate={{ height: `${(month.income / maxForecast) * 100}%` }}
                    transition={{ type: "spring", stiffness: 140, damping: 20, delay: index * 0.05 }}
                    title={`Inflow ${formatUsd(month.income)}`}
                  />
                  <motion.span
                    className="w-1/3 rounded-t-[3px] bg-[color:var(--negative)]/70"
                    initial={{ height: 0 }}
                    animate={{ height: `${(month.burn / maxForecast) * 100}%` }}
                    transition={{ type: "spring", stiffness: 140, damping: 20, delay: index * 0.05 + 0.05 }}
                    title={`Burn ${formatUsd(month.burn)}`}
                  />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
                  {month.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
