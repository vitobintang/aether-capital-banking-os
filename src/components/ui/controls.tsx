"use client";

import { motion } from "framer-motion";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* --------------------------------- Toggle --------------------------------- */

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  tone?: "accent" | "danger" | "positive";
}

/**
 * Switch with a transform-only knob animation (no layout thrash) so rapid
 * toggling stays at 60fps even while the simulation engine is ticking.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled,
  tone = "accent",
}: ToggleProps) {
  const id = useId();
  const activeColor =
    tone === "danger"
      ? "var(--negative)"
      : tone === "positive"
        ? "var(--positive)"
        : "var(--accent)";

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-4 rounded-xl border px-3.5 py-3 transition-colors duration-150",
        checked ? "border-[var(--line-strong)]" : "border-[var(--line)]",
        "bg-[var(--surface)]",
        !disabled && "hover:bg-[var(--surface-2)]",
        disabled && "opacity-50",
      )}
    >
      <label htmlFor={id} className="flex min-w-0 cursor-pointer items-center gap-3">
        {icon && (
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg border transition-colors duration-150"
            style={{
              background: checked ? activeColor : "transparent",
              borderColor: checked ? "transparent" : "var(--line)",
              color: checked ? "var(--accent-ink)" : "var(--ink-muted)",
            }}
          >
            {icon}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-ink">{label}</span>
          {description && (
            <span className="mt-0.5 block truncate text-[11px] text-muted">{description}</span>
          )}
        </span>
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
          disabled ? "cursor-not-allowed" : "cursor-pointer active:scale-95",
        )}
        style={{
          background: checked ? activeColor : "var(--surface-3)",
          borderColor: checked ? "transparent" : "var(--line)",
        }}
      >
        <motion.span
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 720, damping: 38, mass: 0.4 }}
          className="gpu absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
        />
      </button>
    </div>
  );
}

/* --------------------------------- Slider --------------------------------- */

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
  hint?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 100,
  onChange,
  format,
  disabled,
  hint,
}: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min || 1)) * 100;
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5",
        disabled && "opacity-55",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        <span className="numeric text-[13px] font-semibold text-accent">
          {format ? format(value) : value.toLocaleString("en-US")}
        </span>
      </div>
      <div className="relative mt-3 h-4">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <motion.div
            className="gpu h-full w-full origin-left rounded-full bg-gradient-to-r from-accent to-[color:var(--signal)]"
            initial={false}
            animate={{ scaleX: Math.max(0, Math.min(1, pct / 100)) }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.5 }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          aria-valuetext={format ? format(value) : String(value)}
          onChange={(event) => onChange(Number(event.target.value))}
          className="absolute inset-0 h-4 w-full cursor-pointer opacity-0"
        />
      </div>
      {hint && <p className="mt-2 text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

/* ------------------------------- Segmented -------------------------------- */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  ariaLabel: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  size = "sm",
  className,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 backdrop-blur-xl",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 rounded-lg font-medium tracking-[-0.01em] transition-colors duration-150 active:scale-95",
              size === "xs" && "h-6 px-2 text-[10px]",
              size === "sm" && "h-7 px-2.5 text-[11px]",
              size === "md" && "h-9 px-4 text-[13px]",
              active ? "text-[color:var(--accent-ink)]" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 560, damping: 40, mass: 0.5 }}
                className="absolute inset-0 rounded-lg bg-accent"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- Field ---------------------------------- */

export interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  mono?: boolean;
  maxLength?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  type?: "text" | "password" | "email";
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "search";
  disabled?: boolean;
  autoComplete?: string;
  onEnter?: () => void;
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  mono,
  maxLength,
  prefix,
  suffix,
  type = "text",
  inputMode = "text",
  disabled,
  autoComplete,
  onEnter,
}: FieldProps) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-dim"
      >
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal text-muted">{hint}</span>}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 transition-colors duration-150",
          error
            ? "border-[color:var(--negative)]"
            : "border-[var(--line)] focus-within:border-accent",
          disabled && "opacity-55",
        )}
      >
        {prefix && <span className="shrink-0 text-muted">{prefix}</span>}
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && onEnter) onEnter();
          }}
          className={cn(
            "h-11 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-dim",
            mono && "numeric",
          )}
        />
        {suffix && <span className="shrink-0 text-muted">{suffix}</span>}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-[11px] text-[color:var(--negative)]">
          {error}
        </p>
      )}
    </div>
  );
}
