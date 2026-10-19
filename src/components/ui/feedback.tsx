"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "positive" | "negative" | "warning" | "signal" | "accent";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "border-[var(--line)] bg-[var(--surface-2)] text-muted",
  positive:
    "border-[color:var(--positive)]/35 bg-[color:var(--positive)]/12 text-[color:var(--positive)]",
  negative:
    "border-[color:var(--negative)]/35 bg-[color:var(--negative)]/12 text-[color:var(--negative)]",
  warning:
    "border-[color:var(--warning)]/35 bg-[color:var(--warning)]/12 text-[color:var(--warning)]",
  signal: "border-[color:var(--signal)]/35 bg-[color:var(--signal)]/12 text-[color:var(--signal)]",
  accent: "border-accent/40 bg-accent-soft text-accent",
};

export interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  mono?: boolean;
}

export function Badge({ tone = "neutral", children, className, icon, mono = true }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.1em]",
        mono && "font-mono",
        TONE_STYLES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function StatusDot({ tone = "positive", pulse = true }: { tone?: Tone; pulse?: boolean }) {
  const color =
    tone === "negative"
      ? "var(--negative)"
      : tone === "warning"
        ? "var(--warning)"
        : tone === "signal"
          ? "var(--signal)"
          : tone === "accent"
            ? "var(--accent)"
            : "var(--positive)";
  return (
    <span className="relative inline-flex size-2 shrink-0">
      {pulse && (
        <span
          className="anim-ping absolute inline-flex size-full rounded-full"
          style={{ background: color }}
          aria-hidden
        />
      )}
      <span className="relative inline-flex size-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "anim-shimmer rounded-lg bg-[var(--surface-2)]",
        className,
      )}
    />
  );
}

export function SkeletonBlock({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i % 3 === 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export interface SparklineProps {
  data: number[];
  stroke?: string;
  fill?: boolean;
  className?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
}

export function Sparkline({
  data,
  stroke = "var(--accent)",
  fill = true,
  className,
  height = 34,
  width = 96,
  strokeWidth = 1.6,
}: SparklineProps) {
  if (data.length < 2) {
    return <div className={cn("h-[34px] w-24 rounded bg-[var(--surface-2)]", className)} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const gradientId = `spark-${stroke.replace(/[^a-z0-9]/gi, "")}-${data.length}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && (
        <polygon points={`0,${height} ${points.join(" ")} ${width},${height}`} fill={`url(#${gradientId})`} />
      )}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
  label?: string;
}

export function ProgressRing({
  value,
  size = 68,
  stroke = 5,
  color = "var(--accent)",
  trackColor = "var(--surface-3)",
  children,
  label,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(clamped)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </div>
  );
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !dismissible) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, dismissible]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => dismissible && onClose()}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "glass-strong relative z-10 w-full max-w-lg overflow-hidden rounded-3xl shadow-[0_50px_120px_-30px_rgba(0,0,0,0.85)]",
              className,
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
              <div>
                <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
                {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
              </div>
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="grid size-8 place-items-center rounded-lg border border-[var(--line)] text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              )}
            </header>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <footer className="flex items-center justify-end gap-3 border-t border-[var(--line)] px-6 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Full-text search highlighting for ledger cells. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (term.length < 2) return <>{text}</>;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-[color:var(--signal)]/25 px-0.5 text-ink">
        {text.slice(index, index + term.length)}
      </mark>
      {text.slice(index + term.length)}
    </>
  );
}
