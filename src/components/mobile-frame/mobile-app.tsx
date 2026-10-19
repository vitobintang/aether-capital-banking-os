"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import {
  Activity as ActivityIcon,
  Home,
  Landmark,
  Lock,
  RefreshCw,
  Send,
  Signal,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  ActivityScreen,
  CardsScreen,
  HomeScreen,
  TransferScreen,
  VaultScreen,
} from "@/components/mobile-frame/mobile-screens";
import type { MobileTab } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

const TABS: Array<{ key: MobileTab; label: string; icon: typeof Home }> = [
  { key: "home", label: "Home", icon: Home },
  { key: "cards", label: "Cards", icon: Landmark },
  { key: "transfer", label: "Send", icon: Send },
  { key: "activity", label: "Activity", icon: ActivityIcon },
  { key: "vault", label: "Vault", icon: Lock },
];

function StatusBar() {
  const simulation = useAetherStore((s) => s.simulation);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  );

  useEffect(() => {
    const timer = window.setInterval(
      () => setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })),
      10_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex h-12 items-center justify-between px-7 pt-2 text-white">
      <span className="numeric text-[13px] font-semibold tracking-[-0.01em]">{clock}</span>
      <span className="flex items-center gap-1.5">
        <Signal className="size-3.5" aria-hidden />
        <span className="inline-flex items-end gap-[2px]" aria-hidden>
          {[4, 6, 8, 10].map((h, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-[1px] bg-white"
              animate={{ height: simulation ? [h, h + 1, h] : h }}
              transition={{ duration: 1.6, repeat: simulation ? Infinity : 0, delay: i * 0.12 }}
            />
          ))}
        </span>
        <Wifi className="size-3.5" aria-hidden />
        <span className="relative ml-0.5 inline-flex h-3 w-6 items-center rounded-[3px] border border-white/70 px-[1.5px]">
          <motion.span
            className="h-full rounded-[1px] bg-white"
            animate={{ width: simulation ? ["72%", "84%", "72%"] : "80%" }}
            transition={{ duration: 6, repeat: simulation ? Infinity : 0 }}
          />
          <span className="absolute -right-[3px] h-1.5 w-[2px] rounded-r bg-white/70" aria-hidden />
        </span>
      </span>
    </div>
  );
}

function BottomNav() {
  const tab = useAetherStore((s) => s.mobileTab);
  const setMobileTab = useAetherStore((s) => s.setMobileTab);

  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/72 pb-6 pt-2 backdrop-blur-2xl"
      aria-label="Primary"
    >
      <ul className="flex items-end justify-between px-3">
        {TABS.map((item) => {
          const active = tab === item.key;
          const isCenter = item.key === "transfer";
          return (
            <li key={item.key} className="flex-1">
              <button
                type="button"
                onClick={() => setMobileTab(item.key)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className="relative flex w-full flex-col items-center gap-1 py-1"
              >
                {isCenter ? (
                  <motion.span
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "grid size-11 -translate-y-3 place-items-center rounded-full shadow-[0_10px_28px_-8px_var(--accent)]",
                      active
                        ? "bg-accent text-[color:var(--accent-ink)]"
                        : "bg-[var(--surface-3)] text-ink",
                    )}
                  >
                    <item.icon className="size-5" aria-hidden />
                  </motion.span>
                ) : (
                  <span className="relative grid h-7 w-full place-items-center">
                    {active && (
                      <motion.span
                        layoutId="ios-tab-indicator"
                        transition={{ type: "spring", stiffness: 520, damping: 34 }}
                        className="absolute inset-x-4 -top-0.5 h-8 rounded-xl bg-accent/18"
                      />
                    )}
                    <item.icon
                      className={cn(
                        "relative size-5 transition-colors",
                        active ? "text-accent" : "text-white/45",
                      )}
                      aria-hidden
                    />
                  </span>
                )}
                <span
                  className={cn(
                    "text-[9.5px] font-medium tracking-[-0.01em]",
                    active ? "text-ink" : "text-white/45",
                    isCenter && "-mt-2",
                  )}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileApp() {
  const tab = useAetherStore((s) => s.mobileTab);
  const refreshing = useAetherStore((s) => s.refreshing);
  const refresh = useAetherStore((s) => s.refresh);
  const playSound = useAetherStore((s) => s.playSound);
  const controls = useDragControls();
  const [pull, setPull] = useState(0);
  const [flash, setFlash] = useState(false);

  const onDragEnd = () => {
    if (pull > 62 && !refreshing) {
      setFlash(true);
      playSound("whoosh", [10, 18, 10]);
      void refresh().then(() => {
        window.setTimeout(() => {
          setFlash(false);
          setPull(0);
        }, 700);
      });
      return;
    }
    setPull(0);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--canvas)]">
      <StatusBar />

      <div className="absolute inset-x-0 top-0 z-40 h-24" onPointerDown={(event) => controls.start(event)} aria-hidden />

      <motion.div
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.55 }}
        onDrag={(_, info) => setPull(Math.max(0, info.offset.y))}
        onDragEnd={onDragEnd}
        animate={{ y: refreshing && flash ? 46 : pull > 0 ? Math.min(78, pull * 0.62) : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="h-full"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="h-full"
          >
            {tab === "home" && <HomeScreen />}
            {tab === "cards" && <CardsScreen />}
            {tab === "transfer" && <TransferScreen />}
            {tab === "activity" && <ActivityScreen />}
            {tab === "vault" && <VaultScreen />}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {(pull > 8 || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className="absolute inset-x-0 top-12 z-40 flex items-center justify-center gap-2"
          >
            <span className="glass-strong inline-flex items-center gap-2 rounded-full px-3 py-1.5">
              <RefreshCw
                className={cn("size-3.5", refreshing || pull > 62 ? "anim-spin-slow text-accent" : "text-muted")}
                aria-hidden
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                {refreshing ? "syncing ledger" : pull > 62 ? "release to refresh" : "pull to refresh"}
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
