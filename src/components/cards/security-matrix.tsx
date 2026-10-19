"use client";

import { motion } from "framer-motion";
import {
  AtSign,
  Globe2,
  Landmark,
  ShieldCheck,
  Snowflake,
  Sun,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Slider, Toggle } from "@/components/ui/controls";
import { Badge, Skeleton } from "@/components/ui/feedback";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

export function SecurityMatrix() {
  const cards = useAetherStore((s) => s.cards);
  const activeCardId = useAetherStore((s) => s.activeCardId);
  const status = useAetherStore((s) => s.status);
  const updateCardControls = useAetherStore((s) => s.updateCardControls);
  const expandIsland = useAetherStore((s) => s.expandIsland);
  const pushToast = useAetherStore((s) => s.pushToast);

  const card = cards.find((c) => c.id === activeCardId) ?? cards[0];
  const frozen = card?.controls.frozen ?? false;

  const [onlineLimit, setOnlineLimit] = useState(card?.controls.dailyOnlineLimit ?? 0);
  const [atmLimit, setAtmLimit] = useState(card?.controls.dailyAtmLimit ?? 0);

  useEffect(() => {
    setOnlineLimit(card?.controls.dailyOnlineLimit ?? 0);
    setAtmLimit(card?.controls.dailyAtmLimit ?? 0);
  }, [card?.controls.dailyOnlineLimit, card?.controls.dailyAtmLimit, card?.id]);

  if (status !== "ready" || !card) {
    return (
      <Panel depth={3} eyebrow="Card controls" title="Security Control Matrix" subtitle="Loading instrument…">
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </Panel>
    );
  }

  const commit = (patch: Parameters<typeof updateCardControls>[1]) => {
    void updateCardControls(card.id, patch);
  };

  const toggleFreeze = () => {
    const next = !frozen;
    void updateCardControls(card.id, {
      frozen: next,
      ...(next ? { onlineEnabled: false, contactlessEnabled: false, atmEnabled: false } : {}),
    });
    expandIsland(
      next
        ? { kind: "frozen", title: "Card frozen", detail: `${card.label} •••• ${card.last4}` }
        : { kind: "idle", title: "Card unfrozen", detail: `${card.label} •••• ${card.last4}` },
      4600,
    );
    pushToast({
      title: next ? "Card frozen instantly" : "Card unfrozen",
      body: next
        ? "All authorisations are being declined. The icy overlay is live on the canvas."
        : "Authorisations accepted again across every enabled rail.",
      tone: next ? "warning" : "positive",
    });
  };

  return (
    <Panel
      depth={3}
      eyebrow={`Instrument · •••• ${card.last4}`}
      title="Security Control Matrix"
      subtitle="Every control writes through to the issuer core with an immutable audit entry"
      actions={
        <Badge tone={frozen ? "negative" : "positive"}>
          {frozen ? "declining all auths" : "accepting auths"}
        </Badge>
      }
    >
      <motion.button
        type="button"
        onClick={toggleFreeze}
        whileTap={{ scale: 0.975 }}
        whileHover={{ y: -1 }}
        aria-pressed={frozen}
        className={cn(
          "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-colors",
          frozen
            ? "border-[color:var(--signal)]/45 bg-[color:var(--signal)]/10"
            : "border-[var(--line-strong)] bg-[var(--surface)] hover:border-[color:var(--negative)]/45 hover:bg-[color:var(--negative)]/[0.07]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl border transition-colors",
            frozen
              ? "border-[color:var(--signal)]/50 bg-[color:var(--signal)]/15 text-[color:var(--signal)]"
              : "border-[var(--line)] bg-[var(--surface-2)] text-ink-muted group-hover:text-[color:var(--negative)]",
          )}
        >
          {frozen ? <Sun className="size-5" /> : <Snowflake className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold tracking-[-0.01em] text-ink">
            {frozen ? "Unfreeze card" : "Freeze card"}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted">
            {frozen
              ? "Restore authorisations across all enabled rails"
              : "Instant kill-switch · frosted overlay + shattered-ice micro-animation"}
          </span>
        </span>
        <Badge tone={frozen ? "signal" : "neutral"}>{frozen ? "frozen" : "armed"}</Badge>
      </motion.button>

      <div className="mt-4 space-y-2.5">
        <div
          onPointerUp={() => !frozen && commit({ dailyOnlineLimit: onlineLimit })}
          onKeyUp={() => !frozen && commit({ dailyOnlineLimit: onlineLimit })}
        >
          <Slider
            label="Daily online spend limit"
            value={onlineLimit}
            min={0}
            max={50_000}
            step={250}
            disabled={frozen}
            onChange={setOnlineLimit}
            format={(value) => formatMoney(value, "USD", { compact: value >= 10_000 })}
            hint="Hard ceiling for card-not-present authorisations, evaluated per UTC day."
          />
        </div>

        <div
          onPointerUp={() => !frozen && commit({ dailyAtmLimit: atmLimit })}
          onKeyUp={() => !frozen && commit({ dailyAtmLimit: atmLimit })}
        >
          <Slider
            label="ATM withdrawal cap"
            value={atmLimit}
            min={0}
            max={10_000}
            step={100}
            disabled={frozen || !card.controls.atmEnabled}
            onChange={setAtmLimit}
            format={(value) => formatMoney(value, "USD", { compact: value >= 10_000 })}
            hint="Applies per calendar day across all networks; surcharges excluded."
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <Toggle
          label="Online payments"
          description="Card-not-present & 3DS2"
          icon={<AtSign className="size-4" />}
          checked={card.controls.onlineEnabled}
          disabled={frozen}
          onChange={(next) => commit({ onlineEnabled: next })}
        />
        <Toggle
          label="International"
          description="Cross-border authorisations"
          icon={<Globe2 className="size-4" />}
          checked={card.controls.internationalEnabled}
          disabled={frozen}
          tone="positive"
          onChange={(next) => commit({ internationalEnabled: next })}
        />
        <Toggle
          label="Contactless"
          description="Tap-to-pay up to €100"
          icon={<Wifi className="size-4" />}
          checked={card.controls.contactlessEnabled}
          disabled={frozen}
          onChange={(next) => commit({ contactlessEnabled: next })}
        />
        <Toggle
          label="ATM withdrawals"
          icon={<Landmark className="size-4" />}
          description="Cash access at partner ATMs"
          checked={card.controls.atmEnabled}
          disabled={frozen}
          tone="danger"
          onChange={(next) => commit({ atmEnabled: next })}
        />
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3">
        <ShieldCheck className="size-4 shrink-0 text-[color:var(--positive)]" aria-hidden />
        <p className="text-[11px] leading-relaxed text-muted">
          Controls are enforced at the issuer before settlement. Frozen instruments decline
          every rail simultaneously —{" "}
          <span className="text-ink">average propagation 340 ms</span>.
        </p>
      </div>
    </Panel>
  );
}
