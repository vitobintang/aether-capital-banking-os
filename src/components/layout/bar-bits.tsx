"use client";

import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "positive" | "negative" | "warning" | "signal" | "accent";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-[var(--line-strong)] bg-[var(--surface-2)] text-muted",
  positive: "border-[color:var(--positive)]/40 bg-[color:var(--positive)]/12 text-[color:var(--positive)]",
  negative: "border-[color:var(--negative)]/40 bg-[color:var(--negative)]/12 text-[color:var(--negative)]",
  warning: "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/12 text-[color:var(--warning)]",
  signal: "border-[color:var(--signal)]/40 bg-[color:var(--signal)]/12 text-[color:var(--signal)]",
  accent: "border-accent/45 bg-accent-soft text-accent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  tone = "positive",
  pulse = true,
}: {
  tone?: "positive" | "neutral" | "negative" | "warning";
  pulse?: boolean;
}) {
  const color =
    tone === "negative"
      ? "var(--negative)"
      : tone === "warning"
        ? "var(--warning)"
        : tone === "neutral"
          ? "var(--ink-dim)"
          : "var(--live)";
  return (
    <span className="relative inline-flex size-1.5 shrink-0">
      {pulse && (
        <span
          aria-hidden
          className="anim-ping absolute inline-flex size-full rounded-full"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex size-1.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

export function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
      {keys.map((key) => (
        <kbd
          key={key}
          className="rounded border border-[var(--line-strong)] bg-[var(--surface-2)] px-1 py-[1px] text-[9px] text-muted"
        >
          {key}
        </kbd>
      ))}
      {label}
    </span>
  );
}
