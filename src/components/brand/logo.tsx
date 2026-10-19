import { cn } from "@/lib/utils";

/**
 * AETHER monogram — an "Æ" letterform set in a solid ink tile with an accent
 * rule. Pure typography, no iconography dependency, scales from 16px favicon
 * to 96px marketing lockup.
 */
export function LogoMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[11px] bg-ink text-canvas",
        "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.9)]",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="relative font-semibold leading-none tracking-[-0.06em]"
        style={{ fontSize: Math.round(size * 0.56) }}
      >
        Æ
      </span>
      <span
        className="absolute inset-x-0 bottom-0 bg-accent"
        style={{ height: Math.max(2, Math.round(size * 0.075)) }}
      />
    </span>
  );
}

export function Logo({
  size = 36,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold leading-tight tracking-[-0.035em] text-ink">
            AETHER
          </span>
          <span className="block truncate font-mono text-[8.5px] uppercase leading-tight tracking-[0.3em] text-dim">
            capital os
          </span>
        </span>
      )}
    </span>
  );
}
