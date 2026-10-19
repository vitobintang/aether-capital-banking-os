"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Panel } from "@/components/ui/panel";
import { Segmented, type SegmentedOption } from "@/components/ui/controls";
import { Badge, StatusDot } from "@/components/ui/feedback";
import { formatPercent, formatUsd } from "@/lib/format";
import type { SeriesPoint, Timeframe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { selectNetWorthUsd, useAetherStore } from "@/store/useAetherStore";

const TIMEFRAMES: ReadonlyArray<SegmentedOption<Timeframe>> = [
  { value: "1H", label: "1H" },
  { value: "24H", label: "24H" },
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "ALL" },
];

interface ScrubDatum {
  label: string;
  value: number;
  t: number;
  delta: number;
}

interface TooltipShape {
  active?: boolean;
  payload?: Array<{ payload?: ScrubDatum }>;
}

export function NetWorthChart() {
  const timeframe = useAetherStore((s) => s.timeframe);
  const setTimeframe = useAetherStore((s) => s.setTimeframe);
  const history = useAetherStore((s) => s.history);
  const simulation = useAetherStore((s) => s.simulation);
  const status = useAetherStore((s) => s.status);
  const netWorth = useAetherStore(selectNetWorthUsd);

  const series = history[timeframe] ?? [];

  const data = useMemo<ScrubDatum[]>(() => {
    const first = series[0]?.value ?? 0;
    return series.map((point: SeriesPoint) => ({
      label: point.label,
      value: point.value,
      t: point.t,
      delta: first > 0 ? ((point.value - first) / first) * 100 : 0,
    }));
  }, [series]);

  const stats = useMemo(() => {
    if (data.length === 0) {
      return { start: 0, end: 0, delta: 0, high: 0, low: 0, average: 0 };
    }
    const values = data.map((d) => d.value);
    const start = values[0] ?? 0;
    const end = values[values.length - 1] ?? 0;
    return {
      start,
      end,
      delta: start > 0 ? ((end - start) / start) * 100 : 0,
      high: Math.max(...values),
      low: Math.min(...values),
      average: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }, [data]);

  const positive = stats.delta >= 0;

  return (
    <Panel
      depth={0}
      eyebrow="Aggregate net worth · all currencies"
      title="Dynamic Net Worth Visualiser"
      subtitle={
        status === "ready"
          ? `${data.length} data points · ${timeframe} window · streamed from treasury core`
          : "Establishing secure channel to treasury core…"
      }
      actions={
        <Segmented
          ariaLabel="Chart timeframe"
          layoutId="tf-pill"
          options={TIMEFRAMES}
          value={timeframe}
          onChange={setTimeframe}
          size="xs"
        />
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            {simulation ? (
              <Badge tone="positive" icon={<StatusDot tone="positive" />}>
                live
              </Badge>
            ) : (
              <Badge tone="neutral">paused</Badge>
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
              consolidated usd
            </span>
          </div>
          <motion.p
            key={Math.round(netWorth)}
            initial={{ opacity: 0.55, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="numeric mt-2 text-[clamp(2rem,4.4vw,3rem)] font-semibold leading-none tracking-[-0.04em] text-ink"
          >
            {formatUsd(status === "ready" ? netWorth : stats.end)}
          </motion.p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 font-mono font-semibold",
                positive ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
              )}
            >
              {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {formatPercent(stats.delta)}
              <span className="text-dim">{timeframe}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity className="size-3.5 text-dim" />
              High <span className="numeric text-ink">{formatUsd(stats.high)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              Low <span className="numeric text-ink">{formatUsd(stats.low)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              Avg <span className="numeric text-ink">{formatUsd(stats.average)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-5 h-[248px] w-full sm:h-[300px]">
        {status !== "ready" ? (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-[var(--line)]">
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="size-3 rounded-full border-2 border-accent border-t-transparent anim-spin-slow" />
              Hydrating {timeframe} series…
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
                  <stop offset="55%" stopColor="var(--accent)" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="var(--signal)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="nw-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--signal)" />
                  <stop offset="100%" stopColor="var(--accent)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" strokeDasharray="2 6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--ink-dim)", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={42}
                stroke="var(--line)"
              />
              <YAxis
                width={72}
                tick={{ fontSize: 10, fill: "var(--ink-dim)", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                stroke="var(--line)"
                domain={["dataMin - 120000", "dataMax + 120000"]}
                tickFormatter={(value: number) => `$${(value / 1_000_000).toFixed(2)}M`}
              />
              <ReferenceLine
                y={stats.average}
                stroke="var(--line-strong)"
                strokeDasharray="4 6"
                label={{
                  value: "AVG",
                  position: "insideTopRight",
                  fill: "var(--ink-dim)",
                  fontSize: 9,
                }}
              />
              <Tooltip
                cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 3" }}
                content={(props) => {
                  const shape = props as unknown as TooltipShape;
                  const datum = shape.payload?.[0]?.payload;
                  if (!shape.active || !datum) return null;
                  return (
                    <div className="glass-strong rounded-xl px-3.5 py-2.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
                        {new Date(datum.t).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="numeric mt-1 text-[15px] font-semibold text-ink">
                        {formatUsd(datum.value)}
                      </p>
                      <p
                        className={cn(
                          "numeric mt-0.5 text-[11px] font-medium",
                          datum.delta >= 0
                            ? "text-[color:var(--positive)]"
                            : "text-[color:var(--negative)]",
                        )}
                      >
                        Δ {formatPercent(datum.delta)} vs. window open
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#nw-stroke)"
                strokeWidth={2}
                fill="url(#nw-fill)"
                dot={false}
                isAnimationActive
                animationDuration={700}
                activeDot={{
                  r: 4.5,
                  fill: "var(--accent)",
                  stroke: "var(--canvas)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}
