"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Moon,
  RotateCw,
  Smartphone,
  Sun,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Badge, KbdHint, StatusDot } from "@/components/layout/bar-bits";
import type { ViewMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string; icon: React.ReactNode }> = [
  { value: "desktop", label: "Enterprise", icon: <LayoutDashboard className="size-3.5" /> },
  { value: "mobile", label: "Mobile", icon: <Smartphone className="size-3.5" /> },
];

export function ControlBar() {
  const viewMode = useAetherStore((s) => s.viewMode);
  const setViewMode = useAetherStore((s) => s.setViewMode);
  const theme = useAetherStore((s) => s.theme);
  const toggleTheme = useAetherStore((s) => s.toggleTheme);
  const simulation = useAetherStore((s) => s.simulation);
  const setSimulation = useAetherStore((s) => s.setSimulation);
  const sound = useAetherStore((s) => s.sound);
  const toggleSound = useAetherStore((s) => s.toggleSound);
  const orientation = useAetherStore((s) => s.orientation);
  const setOrientation = useAetherStore((s) => s.setOrientation);
  const status = useAetherStore((s) => s.status);
  const events = useAetherStore((s) => s.events.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.25 }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex justify-center px-3 pb-4"
    >
      <div className="glass-strong pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl px-3 py-2.5 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.85)] sm:gap-3">
        <Segmented
          ariaLabel="View mode"
          layoutId="ctl-view"
          options={VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          size="sm"
        />

        <span className="hidden h-6 w-px bg-[var(--line)] sm:block" aria-hidden />

        <div className="flex items-center gap-1.5">
          <IconButton
            label={theme === "dark" ? "Switch to high-contrast light mode" : "Switch to OLED dark mode"}
            size="sm"
            onClick={toggleTheme}
          >
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
            >
              {theme === "dark" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            </motion.span>
          </IconButton>

          <button
            type="button"
            role="switch"
            aria-checked={simulation}
            aria-label="Toggle live simulation engine"
            onClick={() => setSimulation(!simulation)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-xl border px-3 text-[11px] font-medium transition-all active:scale-95",
              simulation
                ? "border-[color:var(--live)]/45 bg-[color:var(--live)]/12 text-[color:var(--live)]"
                : "border-[var(--line)] bg-[var(--surface)] text-muted hover:text-ink",
            )}
          >
            <StatusDot tone={simulation ? "positive" : "neutral"} pulse={simulation} />
            <Waves className="size-3.5" aria-hidden />
            Live sim
            <span className="numeric text-[10px] text-dim">{events}</span>
          </button>

          <IconButton
            label={sound ? "Mute interface audio" : "Enable interface audio"}
            size="sm"
            active={sound}
            onClick={toggleSound}
          >
            {sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </IconButton>

          {viewMode === "mobile" && (
            <IconButton
              label={`Rotate device to ${orientation === "portrait" ? "landscape" : "portrait"}`}
              size="sm"
              onClick={() => setOrientation(orientation === "portrait" ? "landscape" : "portrait")}
            >
              <RotateCw className="size-3.5" />
            </IconButton>
          )}
        </div>

        <span className="hidden h-6 w-px bg-[var(--line)] lg:block" aria-hidden />

        <div className="hidden items-center gap-1.5 lg:flex">
          <Badge tone={status === "ready" ? "positive" : "warning"}>
            {status === "ready" ? "treasury online" : status === "loading" ? "syncing" : status}
          </Badge>
          <KbdHint keys={["V"]} label="view" />
          <KbdHint keys={["T"]} label="theme" />
          <KbdHint keys={["L"]} label="live" />
        </div>
      </div>
    </motion.div>
  );
}
