"use client";

import { motion } from "framer-motion";
import { ArrowDownUp, Lock, Timer, Waves } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import type { TransferDraft } from "@/components/transfers/transfer-wizard";
import { buildQuote } from "@/lib/fx";
import { CURRENCY_META, formatBps, formatCountdown, formatMoney, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

const RATE_LOCK_SECONDS = 30;

export interface FxStepProps {
  draft: TransferDraft;
  patch: (partial: Partial<TransferDraft>) => void;
  balance: number;
}

export function FxStep({ draft, patch, balance }: FxStepProps) {
  const rates = useAetherStore((s) => s.rates);
  const accounts = useAetherStore((s) => s.accounts);
  const playSound = useAetherStore((s) => s.playSound);
  const [lock, setLock] = useState(RATE_LOCK_SECONDS);
  const [lockedRate, setLockedRate] = useState<number | null>(null);

  const quote = useMemo(
    () => buildQuote(draft.sourceAmount, draft.sourceCurrency, draft.targetCurrency, rates),
    [draft.sourceAmount, draft.sourceCurrency, draft.targetCurrency, rates],
  );

  const displayRate = lockedRate ?? quote.clientRate;
  const displayTarget = draft.sourceAmount > 0 ? Math.max(0, draft.sourceAmount - quote.fee) * displayRate : 0;

  useEffect(() => {
    if (lock <= 0) {
      setLockedRate(null);
      setLock(RATE_LOCK_SECONDS);
      return;
    }
    const timer = window.setTimeout(() => setLock((value) => value - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [lock]);

  const insufficient = draft.sourceAmount > balance;
  const sourceOptions = accounts.length > 0 ? accounts : [];

  const setAmount = (value: number) => {
    patch({ sourceAmount: Math.max(0, Math.round(value * 100) / 100) });
  };

  const swap = () => {
    patch({ sourceCurrency: draft.targetCurrency, targetCurrency: draft.sourceCurrency });
    setLockedRate(null);
    playSound("whoosh", 10);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
      <div className="space-y-3">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">you send</p>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={draft.sourceAmount ? String(draft.sourceAmount) : ""}
              onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, "")) || 0)}
              aria-label="Source amount"
              className="numeric min-w-0 flex-1 bg-transparent text-[30px] font-semibold tracking-[-0.04em] text-ink outline-none placeholder:text-dim"
              placeholder="0.00"
            />
            <div className="flex shrink-0 gap-1.5">
              {sourceOptions.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  aria-pressed={draft.sourceCurrency === account.code}
                  onClick={() => {
                    // clamp the amount to the new book so the wizard can never dead-end
                    patch({
                      sourceCurrency: account.code,
                      sourceAmount: Math.min(draft.sourceAmount, account.balance),
                    });
                    setLockedRate(null);
                    playSound("tap");
                  }}
                  className={cn(
                    "numeric h-8 rounded-lg border px-2 text-[11px] font-semibold transition-all active:scale-95",
                    draft.sourceCurrency === account.code
                      ? "border-transparent bg-accent text-[color:var(--accent-ink)]"
                      : "border-[var(--line)] text-muted hover:text-ink",
                  )}
                >
                  {account.code}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className={cn("numeric text-[11px]", insufficient ? "text-[color:var(--negative)]" : "text-muted")}>
              {insufficient
                ? `Insufficient — available ${formatMoney(balance, draft.sourceCurrency)}`
                : `Available ${formatMoney(balance, draft.sourceCurrency)}`}
            </p>
            <div className="flex gap-1.5">
              {[0.1, 0.25, 0.5, 1].map((fraction) => (
                <button
                  key={fraction}
                  type="button"
                  onClick={() => setAmount(balance * fraction)}
                  className="numeric h-6 rounded-md border border-[var(--line)] px-1.5 text-[10px] text-muted transition-colors hover:border-accent hover:text-accent active:scale-95"
                >
                  {fraction === 1 ? "MAX" : `${fraction * 100}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button size="xs" variant="outline" icon={<ArrowDownUp className="size-3.5" />} onClick={swap}>
            Invert pair
          </Button>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
            beneficiary receives
          </p>
          <motion.p
            key={Math.round(displayTarget)}
            initial={{ opacity: 0.55, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="numeric mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[color:var(--positive)]"
          >
            {formatMoney(displayTarget, draft.targetCurrency)}
          </motion.p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="accent" icon={<Lock className="size-3" />}>
              rate locked {lock}s
            </Badge>
            <span className="numeric text-[11px] text-muted">
              1 {draft.sourceCurrency} = {displayRate.toPrecision(6)} {draft.targetCurrency}
            </span>
            <button
              type="button"
              onClick={() => {
                setLockedRate(quote.clientRate);
                setLock(RATE_LOCK_SECONDS);
                playSound("confirm");
              }}
              className="numeric text-[11px] text-accent underline-offset-4 hover:underline"
            >
              re-lock mid-market
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
            <Timer className="size-3" /> estimated arrival
          </p>
          <p className="numeric mt-1.5 text-[20px] font-semibold text-ink">
            {formatCountdown(quote.etaSeconds)}
          </p>
          <ol className="mt-2.5 space-y-1.5">
            {quote.route.map((hop, index) => (
              <motion.li
                key={hop}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="flex items-center gap-2 text-[11px] text-muted"
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border font-mono text-[8px]",
                    index === 0
                      ? "border-[color:var(--positive)] text-[color:var(--positive)]"
                      : "border-[var(--line-strong)] text-dim",
                  )}
                  aria-hidden
                >
                  {index + 1}
                </span>
                {hop}
              </motion.li>
            ))}
          </ol>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(150deg,var(--accent-soft),transparent_65%)] p-4">
          <Waves className="absolute -right-4 -top-4 size-24 text-accent/15" aria-hidden />
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
            quote breakdown
          </p>
          <dl className="mt-3 space-y-2.5 text-[12px]">
            <Row label="Mid-market rate" value={`${quote.midRate.toPrecision(6)}`} />
            <Row label="AETHER client rate" value={`${quote.clientRate.toPrecision(6)}`} accent />
            <Row label="Spread" value={`${quote.spreadBps} bps · ${formatBps(quote.spreadBps)}`} />
            <Row label="Transfer fee" value={formatUsd(quote.fee)} />
            <Row
              label="Debit from account"
              value={`${formatMoney(draft.sourceAmount, draft.sourceCurrency)} ${draft.sourceCurrency}`}
            />
            <Row
              label="Credit to beneficiary"
              value={`${formatMoney(displayTarget, draft.targetCurrency)} ${draft.targetCurrency}`}
              strong
            />
          </dl>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
            settlement rails
          </p>
          <div className="mt-2.5 space-y-2">
            {(
              [
                { rail: "SWIFT gpi", note: "tracked · 100+ corridors", active: true },
                { rail: "SEPA Instant", note: "10s settlement · EUR", active: draft.targetCurrency === "EUR" },
                { rail: "Faster Payments", note: "GBP · 24/7", active: draft.targetCurrency === "GBP" },
                { rail: "On-chain MPC", note: "BTC / ETH · 2 conf", active: ["BTC", "ETH"].includes(draft.targetCurrency) },
              ] as const
            ).map((item) => (
              <div
                key={item.rail}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border px-2.5 py-2 text-[11px] transition-colors",
                  item.active
                    ? "border-accent/45 bg-accent-soft text-ink"
                    : "border-[var(--line)] text-muted",
                )}
              >
                <span className="font-medium">{item.rail}</span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-dim">
                  {item.note}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-xl border border-dashed border-[var(--line)] px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
            fx
          </span>
          Internal book transfers between your own {CURRENCY_META[draft.sourceCurrency].name} and{" "}
          {CURRENCY_META[draft.targetCurrency].name} accounts settle at mid-market with zero fee.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  strong,
}: {
  label: string;
  value: string;
  accent?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd
        className={cn(
          "numeric truncate text-right",
          accent && "text-accent",
          strong ? "text-[14px] font-semibold text-ink" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

