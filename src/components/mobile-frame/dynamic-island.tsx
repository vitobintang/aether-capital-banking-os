"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ShieldAlert, Snowflake, Upload } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useAetherStore } from "@/store/useAetherStore";

/**
 * Dynamic Island — pill morphs into an expanded live-activity surface whenever
 * the simulation engine raises a transfer, inbound wire, fraud flag or freeze.
 */
export function DynamicIsland() {
  const island = useAetherStore((s) => s.island);
  const collapse = useAetherStore((s) => s.collapseIsland);
  const btc = useAetherStore((s) => s.market.find((asset) => asset.symbol === "BTC"));
  const expanded = island.expanded;
  const payload = island.payload;

  return (
    <div className="pointer-events-none absolute left-1/2 top-[10px] z-40 -translate-x-1/2">
      <motion.button
        type="button"
        onClick={collapse}
        aria-label={expanded ? `Collapse Dynamic Island: ${payload.title}` : "Expand Dynamic Island"}
        layout
        animate={{
          width: expanded ? 336 : 118,
          height: expanded ? 104 : 34,
          borderRadius: expanded ? 32 : 20,
        }}
        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
        className="pointer-events-auto relative flex items-center overflow-hidden bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.65)]"
      >
        {/* camera + sensor hardware */}
        <span
          aria-hidden
          className="absolute right-3 top-1/2 z-20 size-[9px] -translate-y-1/2 rounded-full bg-[#0b1020] ring-1 ring-[#1b2440]"
        >
          <span className="absolute inset-[2px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#3b82f6_0%,#0b1020_58%)]" />
        </span>

        <AnimatePresence mode="popLayout" initial={false}>
          {!expanded && (
            <motion.span
              key="compact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full items-center justify-between gap-2 px-3"
            >
              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/70">
                aether
              </span>
              <span className="numeric flex items-center gap-1 text-[9px] font-semibold text-[#b8ff3c]">
                <span className="inline-flex items-end gap-[1.5px]" aria-hidden>
                  {[3, 5, 4, 6].map((h, i) => (
                    <motion.span
                      key={i}
                      className="w-[1.5px] rounded-full bg-[#b8ff3c]"
                      animate={{ height: [h, h + 2, h] }}
                      transition={{ duration: 1.1 + i * 0.16, repeat: Infinity }}
                    />
                  ))}
                </span>
                {btc ? Math.round(btc.price).toLocaleString("en-US") : "—"}
              </span>
            </motion.span>
          )}

          {expanded && (
            <motion.span
              key="expanded"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className="flex w-full flex-col justify-center gap-2 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full"
                  style={{
                    background:
                      payload.kind === "fraud"
                        ? "rgba(255,77,109,0.18)"
                        : payload.kind === "frozen"
                          ? "rgba(49,225,249,0.18)"
                          : payload.kind === "incoming"
                            ? "rgba(46,230,168,0.18)"
                            : "rgba(110,86,248,0.24)",
                  }}
                >
                  {payload.kind === "fraud" ? (
                    <ShieldAlert className="size-3.5 text-[#ff4d6d]" />
                  ) : payload.kind === "frozen" ? (
                    <Snowflake className="size-3.5 text-[#31e1f9]" />
                  ) : payload.kind === "incoming" ? (
                    <ArrowDownLeft className="size-3.5 text-[#2ee6a8]" />
                  ) : (
                    <Upload className="size-3.5 text-[#b8ff3c]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-semibold">{payload.title}</span>
                  <span className="block truncate text-[10px] text-white/55">{payload.detail}</span>
                </span>
                {payload.amount !== undefined && payload.currency && (
                  <span className="numeric shrink-0 text-[13px] font-semibold">
                    {formatMoney(payload.amount, payload.currency, {
                      sign: payload.kind === "incoming",
                      compact: payload.amount > 99_999,
                    })}
                  </span>
                )}
              </span>
              <span className="relative h-1 overflow-hidden rounded-full bg-white/15">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#6e56f8] via-[#31e1f9] to-[#b8ff3c]"
                  initial={{ width: "4%" }}
                  animate={{ width: "96%" }}
                  transition={{ duration: 3.6, ease: "easeInOut" }}
                />
              </span>
              <span className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/45">
                <span>live activity</span>
                <span>tap to dismiss</span>
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
