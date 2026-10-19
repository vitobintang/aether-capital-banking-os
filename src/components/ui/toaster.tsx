"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import { useAetherStore } from "@/store/useAetherStore";
import type { ToastMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE_ICON = {
  neutral: Info,
  positive: CheckCircle2,
  negative: ShieldAlert,
  warning: AlertTriangle,
  signal: Info,
} as const;

const TONE_CLASS: Record<ToastMessage["tone"], string> = {
  neutral: "border-[var(--line-strong)] text-ink",
  positive: "border-[color:var(--positive)]/45 text-[color:var(--positive)]",
  negative: "border-[color:var(--negative)]/45 text-[color:var(--negative)]",
  warning: "border-[color:var(--warning)]/45 text-[color:var(--warning)]",
  signal: "border-[color:var(--signal)]/45 text-[color:var(--signal)]",
};

export function Toaster() {
  const toasts = useAetherStore((s) => s.toasts);
  const dismiss = useAetherStore((s) => s.dismissToast);

  return (
    <div
      className="pointer-events-none fixed bottom-28 right-5 z-[130] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2.5 lg:bottom-24"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className={cn(
                "glass-strong pointer-events-auto flex items-start gap-3 rounded-2xl border-l-2 px-4 py-3 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]",
                TONE_CLASS[toast.tone],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{toast.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{toast.body}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="grid size-6 shrink-0 place-items-center rounded-md text-dim transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
