"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Ghost, Plus, Timer, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Field, Segmented, Slider } from "@/components/ui/controls";
import { Badge } from "@/components/ui/feedback";
import { formatCountdown, formatMoney } from "@/lib/format";
import type { CardFinish, CardNetwork } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

const NETWORKS: Array<{ value: CardNetwork; label: string }> = [
  { value: "VISA", label: "Visa" },
  { value: "MASTERCARD", label: "MC" },
];

const FINISHES: Array<{ value: CardFinish; label: string }> = [
  { value: "frosted", label: "Frosted" },
  { value: "holographic", label: "Prism" },
  { value: "titanium", label: "Titanium" },
];

export function BurnerGenerator() {
  const cards = useAetherStore((s) => s.cards);
  const mintBurner = useAetherStore((s) => s.mintBurner);
  const updateCardControls = useAetherStore((s) => s.updateCardControls);
  const setActiveCardId = useAetherStore((s) => s.setActiveCardId);
  const pushToast = useAetherStore((s) => s.pushToast);
  const playSound = useAetherStore((s) => s.playSound);

  const [label, setLabel] = useState("");
  const [network, setNetwork] = useState<CardNetwork>("VISA");
  const [finish, setFinish] = useState<CardFinish>("frosted");
  const [ttl, setTtl] = useState(30);
  const [funding, setFunding] = useState("5000");
  const [limit, setLimit] = useState(2_500);
  const [minting, setMinting] = useState(false);

  const burners = cards.filter((card) => card.isVirtual);

  const mint = async () => {
    setMinting(true);
    const card = await mintBurner({
      label: label.trim() || undefined,
      network,
      finish,
      ttlMinutes: ttl,
      funding: Number(funding) || 0,
      dailyOnlineLimit: limit,
    });
    if (card) setActiveCardId(card.id);
    setMinting(false);
    setLabel("");
  };

  return (
    <Panel
      depth={4}
      eyebrow="Single-use instruments"
      title="Virtual Card Generator"
      subtitle={`${burners.length} burner${burners.length === 1 ? "" : "s"} live · auto-terminate on TTL expiry`}
      actions={<Badge tone="signal">issuer api</Badge>}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Field
            label="Label"
            value={label}
            onChange={setLabel}
            placeholder="e.g. Vendor trial · Nebula"
            maxLength={34}
            hint="optional"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                Network
              </p>
              <Segmented
                ariaLabel="Card network"
                layoutId="burner-network"
                options={NETWORKS}
                value={network}
                onChange={setNetwork}
                size="sm"
                className="w-full"
              />
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                Finish
              </p>
              <Segmented
                ariaLabel="Card finish"
                layoutId="burner-finish"
                options={FINISHES}
                value={finish}
                onChange={setFinish}
                size="sm"
                className="w-full"
              />
            </div>
          </div>
          <Field
            label="Funding amount"
            value={funding}
            onChange={(value) => setFunding(value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            mono
            prefix={<span className="numeric text-xs">$</span>}
            hint="pre-authorised"
          />
          <Slider
            label="Time to live"
            value={ttl}
            min={5}
            max={240}
            step={5}
            onChange={setTtl}
            format={(value) => `${value} min`}
            hint="Card is frozen by the issuer the instant the counter hits zero."
          />
          <Slider
            label="Spend ceiling"
            value={limit}
            min={100}
            max={25_000}
            step={100}
            onChange={setLimit}
            format={(value) => formatMoney(value, "USD", { compact: value >= 10_000 })}
          />
          <Button
            block
            icon={<Plus className="size-4" />}
            loading={minting}
            onClick={() => void mint()}
          >
            Mint single-use card
          </Button>
        </div>

        <div className="min-w-0">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
            active burners
          </p>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {burners.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid place-items-center rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center"
                >
                  <Ghost className="size-5 text-dim" aria-hidden />
                  <p className="mt-2 text-[12px] font-medium text-ink">No burners minted</p>
                  <p className="mt-1 max-w-[240px] text-[11px] text-muted">
                    Generate a disposable instrument for vendor trials, subscriptions or
                    untrusted merchants.
                  </p>
                </motion.div>
              )}
              {burners.map((card) => {
                const expired = card.expiresInSeconds !== null && card.expiresInSeconds <= 0;
                const pct =
                  card.expiresInSeconds !== null
                    ? Math.max(0, Math.min(100, (card.expiresInSeconds / (ttl * 60)) * 100))
                    : 100;
                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                    className={cn(
                      "rounded-xl border p-3",
                      expired || card.controls.frozen
                        ? "border-[color:var(--negative)]/35 bg-[color:var(--negative)]/[0.06]"
                        : "border-[var(--line)] bg-[var(--surface)]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveCardId(card.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-[12.5px] font-medium text-ink">{card.label}</p>
                        <p className="numeric mt-0.5 text-[10.5px] text-muted">
                          •••• {card.last4} · {card.network} ·{" "}
                          {formatMoney(card.balance, "USD", { compact: true })}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {expired || card.controls.frozen ? (
                          <Badge tone="negative">terminated</Badge>
                        ) : (
                          <Badge tone="signal" icon={<Timer className="size-3" />}>
                            {card.expiresInSeconds !== null
                              ? formatCountdown(card.expiresInSeconds)
                              : "∞"}
                          </Badge>
                        )}
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label={`Revoke ${card.label}`}
                          icon={<Trash2 className="size-3.5" />}
                          onClick={() => {
                            void updateCardControls(card.id, {
                              frozen: true,
                              onlineEnabled: false,
                            });
                            playSound("freeze", 22);
                            pushToast({
                              title: "Burner revoked",
                              body: `${card.label} •••• ${card.last4} can no longer be authorised.`,
                              tone: "warning",
                            });
                          }}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                    {!expired && card.expiresInSeconds !== null && (
                      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[color:var(--signal)] to-accent"
                          animate={{ width: `${pct}%` }}
                          transition={{ type: "spring", stiffness: 120, damping: 24 }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Panel>
  );
}
