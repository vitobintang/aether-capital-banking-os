"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "outline" | "danger" | "signal" | "subtle";
type ButtonSize = "xs" | "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-[color:var(--accent-ink)] shadow-[0_10px_30px_-12px_var(--accent)] hover:brightness-110",
  ghost:
    "bg-transparent text-ink hover:bg-[var(--surface-2)] border border-transparent",
  outline:
    "border border-[var(--line-strong)] bg-[var(--surface)] text-ink hover:bg-[var(--surface-2)] backdrop-blur-xl",
  danger:
    "bg-[color:var(--negative)] text-white shadow-[0_10px_30px_-14px_var(--negative)] hover:brightness-110",
  signal:
    "bg-[color:var(--signal)] text-black hover:brightness-110 shadow-[0_10px_30px_-14px_var(--signal)]",
  subtle:
    "bg-[var(--surface-2)] text-ink-muted hover:text-ink hover:bg-[var(--surface-3)]",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-[11px] gap-1.5 rounded-lg",
  sm: "h-9 px-3.5 text-xs gap-2 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-13 px-7 text-[15px] gap-2.5 rounded-2xl",
};

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children" | "color"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  block?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    trailing,
    block = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.955 }}
      whileHover={disabled || loading ? undefined : { y: -1 }}
      transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.6 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex select-none items-center justify-center font-medium tracking-[-0.01em]",
        "transition-[background,color,box-shadow,filter] duration-200",
        "disabled:pointer-events-none disabled:opacity-45",
        SIZES[size],
        VARIANTS[variant],
        block && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 anim-spin-slow" aria-hidden />
      ) : (
        icon
      )}
      <span className="truncate">{children}</span>
      {trailing}
    </motion.button>
  );
});

export interface IconButtonProps
  extends Omit<HTMLMotionProps<"button">, "children" | "color"> {
  label: string;
  active?: boolean;
  tone?: "neutral" | "danger";
  size?: "sm" | "md";
  children?: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, active, tone = "neutral", size = "md", className, children, ...props },
    ref,
  ) {
    return (
      <motion.button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={active}
        whileTap={{ scale: 0.9 }}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 520, damping: 30 }}
        className={cn(
          "inline-grid place-items-center rounded-xl border transition-colors duration-200",
          size === "sm" ? "size-8" : "size-10",
          active
            ? "border-transparent bg-accent text-[color:var(--accent-ink)]"
            : "border-[var(--line)] bg-[var(--surface)] text-ink-muted hover:text-ink hover:bg-[var(--surface-2)]",
          tone === "danger" && "hover:border-[color:var(--negative)] hover:text-[color:var(--negative)]",
          className,
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
