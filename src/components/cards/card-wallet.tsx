"use client";

import { motion, type PanInfo } from "framer-motion";
import { ChevronsLeftRight, CreditCard, Flame, Gauge } from "lucide-react";
import { useMemo } from "react";
import { Panel } from "@/components/ui/panel";
import { Badge, ProgressRing, Skeleton } from "@/components/ui/feedback";
import { CardCanvas } from "@/components/cards/card-canvas";
import { formatCountdown, formatMoney, formatUsd } from "@/lib/format";
import type { PaymentCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

export function CardWallet() {
  const cards = useAetherStore((s) => s.cards);
  const activeCardId = useAetherStore((s) => s.activeCardId);
  const setActiveCardId = useAetherStore((s) => s.setActiveCardId);
  const status = useAetherStore((s) => s.status);
  const playSound = useAetherStore((s) => s.playSound);

  const activeIndex = Math.max(
    0,
    cards.findIndex((card) => card.id === activeCardId),
  );
  const active = cards[activeIndex];

  const cycle = useMemo(
    () => (direction: 1 | -1) => {
      if (cards.length === 0) return;
      const next = (activeIndex + direction + cards.length) % cards.length;
      setActiveCardId(cards[next]!.id);
    },
    [activeIndex, cards, setActiveCardId],
  );

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 46) return;
    playSound("whoosh", 10);
    cycle(info.offset.x < 0 ? 1 : -1);
  };

  const utilisation = active
    ? Math.min(
        100,
        (active.spend30d / Math.max(1, active.controls.dailyOnlineLimit * 30)) * 100,
      )
    : 0;

  return (
    <Panel
      depth={2}
      eyebrow="Interactive wallet · 3d physics"
      title="Card Canvas"
      subtitle={
        cards.length > 0
          ? `${cards.length} instruments · drag or click to flip · gyroscope aware`
          : "No instruments issued"
      }
      actions={
        <Badge tone={active?.controls.frozen ? "negative" : "positive"}>
          {active?.controls.frozen ? "frozen" : "active"}
        </Badge>
      }
    >
      {status !== "ready" || !active ? (
        <div className="space-y-4">
          <Skeleton className="aspect-[1.586] w-full rounded-[22px]" />
          <div className="flex gap-2">
            <Skeleton className="h-16 flex-1 rounded-xl" />
            <Skeleton className="h-16 flex-1 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          <div className="relative mx-auto w-full max-w-[420px]">
            {/* stacked deck behind the active card */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {cards.map((card, index) => {
                const offset = (index - activeIndex + cards.length) % cards.length;
                if (offset === 0) return null;
                return (
                  <motion.div
                    key={card.id}
                    className="absolute inset-0 rounded-[22px] border border-[var(--line)] bg-[var(--surface-2)]"
                    animate={{
                      y: 14 + offset * 10,
                      scale: 1 - offset * 0.045,
                      opacity: Math.max(0, 0.42 - offset * 0.16),
                      rotate: offset % 2 === 0 ? -1.4 : 1.4,
                    }}
                    transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  />
                );
              })}
            </div>

            {/* card surface stays gesture-free so flip / CVV controls are always clickable */}
            <div className="relative">
              <CardCanvas card={active} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                <CreditCard className="size-3" /> balance
              </p>
              <p className="numeric mt-1.5 text-[15px] font-semibold text-ink">
                {formatUsd(active.balance)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                <Flame className="size-3" /> 30d spend
              </p>
              <p className="numeric mt-1.5 text-[15px] font-semibold text-ink">
                {formatMoney(active.spend30d, "USD", { compact: true })}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                <Gauge className="size-3" /> limit used
              </p>
              <div className="mt-1 flex items-center gap-2">
                <ProgressRing value={utilisation} size={26} stroke={3} label={`Limit utilisation ${Math.round(utilisation)} percent`}>
                  <span className="sr-only">{Math.round(utilisation)}</span>
                </ProgressRing>
                <span className="numeric text-[13px] font-semibold text-ink">
                  {utilisation.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={onDragEnd}
              whileDrag={{ scale: 1.01 }}
              role="slider"
              tabIndex={0}
              aria-label="Drag or use arrow keys to switch instrument"
              aria-valuemin={1}
              aria-valuemax={cards.length}
              aria-valuenow={activeIndex + 1}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") cycle(1);
                if (event.key === "ArrowLeft") cycle(-1);
              }}
              className="flex h-10 cursor-grab touch-none items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 font-mono text-[9px] uppercase tracking-[0.16em] text-dim transition-colors hover:border-[var(--line-strong)] hover:text-muted active:cursor-grabbing"
            >
              <span className="inline-flex items-center gap-1.5">
                <ChevronsLeftRight className="size-3" /> drag to switch instrument
              </span>
              <span className="numeric">
                {activeIndex + 1} / {cards.length}
              </span>
            </motion.div>
            <div className="grid gap-2 sm:grid-cols-3">
              {cards.map((card) => (
                <CardChip
                  key={card.id}
                  card={card}
                  active={card.id === active.id}
                  onSelect={() => setActiveCardId(card.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}

function CardChip({
  card,
  active,
  onSelect,
}: {
  card: PaymentCard;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      aria-pressed={active}
      className={cn(
        "relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-accent bg-accent-soft"
          : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-ink">{card.label}</span>
        {card.controls.frozen && <Badge tone="negative">frozen</Badge>}
      </div>
      <p className="numeric mt-1 text-[10px] text-muted">
        •••• {card.last4}
        {card.expiresInSeconds !== null && card.expiresInSeconds > 0
          ? ` · ${formatCountdown(card.expiresInSeconds)} left`
          : ""}
      </p>
      <p className="numeric mt-0.5 text-[10px] text-dim">
        {formatMoney(card.balance, "USD", { compact: true })} · {card.finish}
      </p>
    </motion.button>
  );
}
