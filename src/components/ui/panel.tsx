"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** 0-based depth used for elevation + entrance stagger. */
  depth?: number;
  padded?: boolean;
}

export function Panel({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
  className,
  bodyClassName,
  depth = 0,
  padded = true,
}: PanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 28, delay: depth * 0.045 }}
      className={cn(
        "glass relative overflow-hidden rounded-[20px] shadow-[var(--shadow-elevated)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent"
      />
      {(title || actions || eyebrow) && (
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-dim">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-ink">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "p-5", bodyClassName)}>{children}</div>
    </motion.section>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-[var(--line)]", className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-muted">
      {children}
    </kbd>
  );
}

export interface MetricProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "positive" | "negative" | "accent";
  className?: string;
}

export function Metric({ label, value, hint, tone = "default", className }: MetricProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">{label}</p>
      <p
        className={cn(
          "numeric mt-1.5 truncate text-[17px] font-semibold text-ink",
          tone === "positive" && "text-[color:var(--positive)]",
          tone === "negative" && "text-[color:var(--negative)]",
          tone === "accent" && "text-accent",
        )}
      >
        {value}
      </p>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}
