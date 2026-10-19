"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Download,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Badge, Highlight, Modal, Skeleton, StatusDot, type Tone } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/controls";
import { formatDate, formatMoney, formatSignedMoney, formatTimeShort } from "@/lib/format";
import { convert } from "@/lib/fx";
import type { LedgerCategory, LedgerEntry, LedgerStatus } from "@/lib/types";
import { CATEGORY_COLORS, cn, initials, relativeTime } from "@/lib/utils";
import { DEFAULT_FILTERS, useAetherStore } from "@/store/useAetherStore";

const ROW_HEIGHT = 58;
const OVERSCAN = 8;

const STATUS_TONE: Record<LedgerStatus, Tone> = {
  settled: "positive",
  pending: "warning",
  disputed: "negative",
  reversed: "neutral",
};

const CATEGORIES: LedgerCategory[] = [
  "SaaS",
  "Travel",
  "Payroll",
  "Equipment",
  "Dining",
  "Marketing",
  "Wire",
  "FX",
  "Crypto",
  "Utilities",
  "Retail",
  "Professional",
];

const STATUSES: LedgerStatus[] = ["settled", "pending", "disputed", "reversed"];

type SortKey = "recent" | "amount" | "risk";

export function TransactionLedger() {
  const ledger = useAetherStore((s) => s.ledger);
  const accounts = useAetherStore((s) => s.accounts);
  const rates = useAetherStore((s) => s.rates);
  const status = useAetherStore((s) => s.status);
  const filters = useAetherStore((s) => s.filters);
  const setFilters = useAetherStore((s) => s.setFilters);
  const resetFilters = useAetherStore((s) => s.resetFilters);
  const playSound = useAetherStore((s) => s.playSound);

  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 560;
      setViewportHeight(height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const min = filters.minAmount;
    const max = filters.maxAmount;
    const out = ledger.filter((entry) => {
      if (filters.categories.length > 0 && !filters.categories.includes(entry.category)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(entry.status)) return false;
      if (filters.accounts.length > 0 && !filters.accounts.includes(entry.accountId)) return false;
      const usd = Math.abs(convert(entry.amount, entry.currency, "USD", rates));
      if (usd < min || usd > max) return false;
      if (query.length > 0) {
        const haystack = `${entry.merchant} ${entry.category} ${entry.reference} ${entry.geo.city} ${entry.geo.countryCode} ${entry.status}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    if (sortKey === "amount") {
      out.sort(
        (a, b) =>
          Math.abs(convert(b.amount, b.currency, "USD", rates)) -
          Math.abs(convert(a.amount, a.currency, "USD", rates)),
      );
    } else if (sortKey === "risk") {
      out.sort((a, b) => b.riskScore - a.riskScore);
    } else {
      out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    }
    return out;
  }, [ledger, filters, rates, sortKey]);

  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const renderCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const visible = filtered.slice(startIndex, startIndex + renderCount);

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    filtered.forEach((entry) => {
      const usd = Math.abs(convert(entry.amount, entry.currency, "USD", rates));
      if (entry.direction === "credit") credit += usd;
      else debit += usd;
    });
    return { debit, credit, count: filtered.length };
  }, [filtered, rates]);

  const exportCsv = () => {
    const header = [
      "timestamp",
      "merchant",
      "category",
      "amount",
      "currency",
      "direction",
      "status",
      "channel",
      "city",
      "country",
      "risk_score",
      "reference",
    ].join(",");
    const rows = filtered.slice(0, 5_000).map((entry) =>
      [
        entry.ts,
        `"${entry.merchant.replace(/"/g, "'")}"`,
        entry.category,
        entry.amount,
        entry.currency,
        entry.direction,
        entry.status,
        entry.channel,
        `"${entry.geo.city}"`,
        entry.geo.countryCode,
        entry.riskScore,
        entry.reference,
      ].join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aether-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    playSound("confirm", 12);
  };

  const toggleCategory = (category: LedgerCategory) => {
    const next = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    setFilters({ categories: next });
  };

  const toggleStatus = (entry: LedgerStatus) => {
    const next = filters.statuses.includes(entry)
      ? filters.statuses.filter((s) => s !== entry)
      : [...filters.statuses, entry];
    setFilters({ statuses: next });
  };

  const activeFilterCount =
    filters.categories.length +
    filters.statuses.length +
    filters.accounts.length +
    (filters.minAmount > DEFAULT_FILTERS.minAmount ? 1 : 0) +
    (filters.maxAmount < DEFAULT_FILTERS.maxAmount ? 1 : 0);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, [filters.query, sortKey]);

  return (
    <Panel
      depth={4}
      eyebrow="High-density ledger · virtualised"
      title="Transaction Ledger"
      subtitle={
        status === "ready"
          ? `${totals.count.toLocaleString("en-US")} of ${ledger.length.toLocaleString("en-US")} rows · −${formatMoney(totals.debit, "USD", { compact: true, symbol: true })} out · +${formatMoney(totals.credit, "USD", { compact: true, symbol: true })} in`
          : "Streaming ledger…"
      }
      padded={false}
      actions={
        <>
          <Segmented
            ariaLabel="Sort ledger"
            layoutId="ledger-sort"
            size="xs"
            value={sortKey}
            onChange={setSortKey}
            options={[
              { value: "recent", label: "Recent" },
              { value: "amount", label: "Amount" },
              { value: "risk", label: "Risk" },
            ]}
          />
          <IconButton
            label="Toggle filters"
            active={filtersOpen}
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter className="size-3.5" />
          </IconButton>
          <IconButton label="Export CSV" size="sm" onClick={exportCsv}>
            <Download className="size-3.5" />
          </IconButton>
        </>
      }
    >
      <div className="px-5 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" aria-hidden />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters({ query: event.target.value })}
            placeholder="Full-text search across merchant, reference, city, status…"
            aria-label="Search transactions"
            className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-10 pr-10 text-[13px] text-ink outline-none transition-colors placeholder:text-dim focus:border-accent"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => setFilters({ query: "" })}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-dim hover:bg-[var(--surface-2)] hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
                <div>
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
                    Category
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((category) => {
                      const active = filters.categories.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleCategory(category)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition-all active:scale-95",
                            active
                              ? "border-transparent text-[color:var(--accent-ink)]"
                              : "border-[var(--line)] text-muted hover:border-[var(--line-strong)] hover:text-ink",
                          )}
                          style={active ? { background: CATEGORY_COLORS[category] } : undefined}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: active ? "rgba(255,255,255,0.85)" : CATEGORY_COLORS[category] }}
                            aria-hidden
                          />
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
                      Status
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((entry) => {
                        const active = filters.statuses.includes(entry);
                        return (
                          <button
                            key={entry}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleStatus(entry)}
                            className={cn(
                              "rounded-lg border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-all active:scale-95",
                              active
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-[var(--line)] text-muted hover:text-ink",
                            )}
                          >
                            {entry}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
                      Price range · USD
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={filters.minAmount}
                        onChange={(event) => setFilters({ minAmount: Math.max(0, Number(event.target.value)) })}
                        aria-label="Minimum amount"
                        className="numeric h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 text-[11px] text-ink outline-none focus:border-accent"
                      />
                      <span className="text-dim">—</span>
                      <input
                        type="number"
                        min={0}
                        value={filters.maxAmount}
                        onChange={(event) => setFilters({ maxAmount: Math.max(0, Number(event.target.value)) })}
                        aria-label="Maximum amount"
                        className="numeric h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 text-[11px] text-ink outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {accounts.map((account) => {
                      const active = filters.accounts.includes(account.id);
                      return (
                        <button
                          key={account.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setFilters({
                              accounts: active
                                ? filters.accounts.filter((id) => id !== account.id)
                                : [...filters.accounts, account.id],
                            })
                          }
                          className={cn(
                            "rounded-lg border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-all active:scale-95",
                            active
                              ? "border-[color:var(--signal)] bg-[color:var(--signal)]/12 text-[color:var(--signal)]"
                              : "border-[var(--line)] text-muted hover:text-ink",
                          )}
                        >
                          {account.code}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    size="xs"
                    variant="ghost"
                    icon={<RotateCcw className="size-3.5" />}
                    onClick={resetFilters}
                    disabled={activeFilterCount === 0 && filters.query.length === 0}
                  >
                    Reset {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(0,1fr))] gap-3 border-y border-[var(--line)] bg-[var(--surface)] px-5 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-dim lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <span>Merchant / reference</span>
        <span className="hidden lg:block">Geo origin</span>
        <span className="hidden lg:block">Status</span>
        <span className="hidden lg:block text-right">Risk</span>
        <span className="text-right">Amount</span>
      </div>

      <div
        ref={viewportRef}
        onScroll={onScroll}
        role="table"
        aria-label="Transaction ledger"
        aria-rowcount={filtered.length}
        className="relative h-[min(58vh,560px)] overflow-y-auto overscroll-contain px-2"
      >
        {status !== "ready" ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <ShieldAlert className="mx-auto size-6 text-dim" aria-hidden />
              <p className="mt-3 text-[13px] font-semibold text-ink">No matching entries</p>
              <p className="mt-1 text-[11px] text-muted">
                Loosen the filters or clear the search to see all {ledger.length.toLocaleString("en-US")} rows.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ height: filtered.length * ROW_HEIGHT }} className="relative">
            {visible.map((entry, index) => {
              const absoluteIndex = startIndex + index;
              const usd = Math.abs(convert(entry.amount, entry.currency, "USD", rates));
              const credit = entry.direction === "credit";
              const risky = entry.riskScore >= 70;
              return (
                <motion.button
                  key={entry.id}
                  type="button"
                  role="row"
                  aria-rowindex={absoluteIndex + 1}
                  onClick={() => {
                    setSelected(entry);
                    playSound("tap");
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.16 }}
                  style={{
                    position: "absolute",
                    top: absoluteIndex * ROW_HEIGHT,
                    height: ROW_HEIGHT,
                    left: 0,
                    right: 0,
                  }}
                  className="group grid w-full grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(0,1fr))] items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-semibold text-black/80"
                      style={{ background: CATEGORY_COLORS[entry.category] }}
                      aria-hidden
                    >
                      {initials(entry.merchant)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-ink">
                        <Highlight text={entry.merchant} query={filters.query} />
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-dim">
                        <span>{entry.category}</span>
                        <span aria-hidden>·</span>
                        <span>{entry.channel}</span>
                        <span className="hidden sm:inline" aria-hidden>·</span>
                        <span className="hidden truncate sm:inline">
                          <Highlight text={entry.reference} query={filters.query} />
                        </span>
                      </span>
                    </span>
                  </span>

                  <span className="hidden min-w-0 items-center gap-1.5 text-[11px] text-muted lg:flex">
                    <MapPin className="size-3 shrink-0 text-dim" aria-hidden />
                    <span className="truncate">
                      {entry.geo.city}, {entry.geo.countryCode}
                    </span>
                  </span>

                  <span className="hidden lg:block">
                    <Badge tone={STATUS_TONE[entry.status]}>{entry.status}</Badge>
                  </span>

                  <span className="hidden items-center justify-end gap-1.5 lg:flex">
                    <StatusDot tone={risky ? "negative" : entry.riskScore >= 35 ? "warning" : "positive"} pulse={risky} />
                    <span className="numeric text-[11px] text-muted">{entry.riskScore}</span>
                  </span>

                  <span className="flex min-w-0 flex-col items-end">
                    <span
                      className={cn(
                        "numeric truncate text-[13px] font-semibold",
                        credit ? "text-[color:var(--positive)]" : "text-ink",
                      )}
                    >
                      {formatSignedMoney(entry.amount, entry.currency, entry.direction)}
                    </span>
                    <span className="numeric mt-0.5 flex items-center gap-1 text-[9.5px] text-dim">
                      {credit ? <ArrowDownLeft className="size-2.5" /> : <ArrowUpRight className="size-2.5" />}
                      {formatUsdLabel(usd)} · {relativeTime(entry.ts)}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
        <span className="inline-flex items-center gap-1.5">
          <ChevronDown className="size-3" aria-hidden />
          window {startIndex + 1}–{Math.min(filtered.length, startIndex + visible.length)} rendered
        </span>
        <span>row {ROW_HEIGHT}px · overscan {OVERSCAN}</span>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.merchant ?? ""}
        subtitle={selected ? `${formatDate(selected.ts)} · ${formatTimeShort(selected.ts)} UTC` : undefined}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<ShieldAlert className="size-4" />}
              onClick={() => {
                if (selected) setFilters({ query: selected.reference });
                setSelected(null);
              }}
            >
              Trace reference
            </Button>
          </>
        }
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-[12px]">
            <Detail label="Amount" value={formatSignedMoney(selected.amount, selected.currency, selected.direction)} mono />
            <Detail label="USD equivalent" value={formatUsdLabel(Math.abs(convert(selected.amount, selected.currency, "USD", rates)))} mono />
            <Detail label="Status" value={selected.status} />
            <Detail label="Channel" value={selected.channel} />
            <Detail label="Category" value={selected.category} />
            <Detail label="Reference" value={selected.reference} mono />
            <Detail label="Origin" value={`${selected.geo.city}, ${selected.geo.country}`} />
            <Detail label="Coordinates" value={`${selected.geo.lat.toFixed(4)}, ${selected.geo.lng.toFixed(4)}`} mono />
            <Detail label="Account" value={accounts.find((a) => a.id === selected.accountId)?.name ?? selected.accountId} />
            <Detail label="Risk score" value={`${selected.riskScore} / 100`} tone={selected.riskScore >= 70 ? "negative" : undefined} />
          </dl>
        )}
      </Modal>
    </Panel>
  );
}

function formatUsdLabel(value: number): string {
  return `${value >= 1_000_000 ? "$" : "$"}${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function Detail({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "negative";
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-dim">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-ink",
          mono && "numeric",
          tone === "negative" && "text-[color:var(--negative)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
