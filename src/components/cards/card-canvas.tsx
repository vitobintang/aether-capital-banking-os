"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { RotateCcw, Check, Copy, Eye, EyeOff, Snowflake } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/feedback";
import { formatCountdown, formatExpiry, formatMoney } from "@/lib/format";
import type { PaymentCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";
import styles from "./holo.module.css";

const CVV_TTL_MS = 5_000;

function NetworkMark({ network, dark }: { network: PaymentCard["network"]; dark?: boolean }) {
  if (network === "MASTERCARD") {
    return (
      <span className="relative inline-flex h-6 w-10 items-center" aria-label="Mastercard">
        <span className="absolute left-0 size-6 rounded-full bg-[#eb001b]/90" />
        <span className="absolute left-4 size-6 rounded-full bg-[#f79e1b]/85 mix-blend-screen" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "font-mono text-[15px] font-bold italic tracking-[-0.04em]",
        dark ? "text-[#0b1220]" : "text-white",
      )}
      aria-label="Visa"
    >
      VISA
    </span>
  );
}

function Chip() {
  return (
    <svg width="42" height="32" viewBox="0 0 42 32" fill="none" aria-hidden className="drop-shadow">
      <rect x="0.5" y="0.5" width="41" height="31" rx="5.5" fill="url(#chipG)" stroke="rgba(0,0,0,0.35)" />
      <path d="M14 1v9M28 1v9M14 22v9M28 22v9M1 16h13M28 16h13" stroke="rgba(0,0,0,0.42)" strokeWidth="1.1" />
      <rect x="14" y="10" width="14" height="12" rx="2.5" stroke="rgba(0,0,0,0.35)" strokeWidth="1.1" />
      <defs>
        <linearGradient id="chipG" x1="0" y1="0" x2="42" y2="32">
          <stop stopColor="#f7e7b4" />
          <stop offset="0.5" stopColor="#d8b45f" />
          <stop offset="1" stopColor="#f2dfa3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export interface CardCanvasProps {
  card: PaymentCard;
  className?: string;
  interactive?: boolean;
  compact?: boolean;
}

export function CardCanvas({ card, className, interactive = true, compact = false }: CardCanvasProps) {
  const [flipped, setFlipped] = useState(false);
  const [cvvVisible, setCvvVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const cvvTimer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);

  const pushToast = useAetherStore((s) => s.pushToast);
  const playSound = useAetherStore((s) => s.playSound);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);

  const springX = useSpring(tiltX, { stiffness: 220, damping: 24, mass: 0.4 });
  const springY = useSpring(tiltY, { stiffness: 220, damping: 24, mass: 0.4 });

  const rotateX = useTransform(springX, (v) => v);
  const rotateY = useTransform(springY, (v) => v);
  const sheenX = useTransform(pointerX, (v) => `${v}%`);
  const sheenY = useTransform(pointerY, (v) => `${v}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${sheenX} ${sheenY}, rgba(255,255,255,0.5), rgba(255,255,255,0.05) 38%, transparent 62%)`;

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || flipped) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      pointerX.set(px * 100);
      pointerY.set(py * 100);
      tiltY.set((px - 0.5) * 18);
      tiltX.set(-(py - 0.5) * 14);
    },
    [interactive, flipped, pointerX, pointerY, tiltX, tiltY],
  );

  const resetTilt = useCallback(() => {
    tiltX.set(0);
    tiltY.set(0);
    pointerX.set(50);
    pointerY.set(50);
    setHovered(false);
  }, [pointerX, pointerY, tiltX, tiltY]);

  useEffect(() => {
    if (!interactive || typeof window === "undefined") return;
    if (!("DeviceOrientationEvent" in window)) return;
    const handler = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null || flipped) return;
      tiltX.set(Math.max(-12, Math.min(12, (event.beta - 45) * 0.26)));
      tiltY.set(Math.max(-14, Math.min(14, event.gamma * 0.34)));
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [interactive, flipped, tiltX, tiltY]);

  useEffect(() => {
    return () => {
      if (cvvTimer.current) window.clearTimeout(cvvTimer.current);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  // Reset the reveal/copy state whenever the instrument changes.
  useEffect(() => {
    setCvvVisible(false);
    setCopied(false);
    setFlipped(false);
  }, [card.id]);

  const flip = () => {
    setFlipped((value) => !value);
    setCvvVisible(false);
    resetTilt();
    playSound("whoosh", 8);
  };

  const revealCvv = () => {
    setCvvVisible(true);
    playSound("tap", 6);
    if (cvvTimer.current) window.clearTimeout(cvvTimer.current);
    cvvTimer.current = window.setTimeout(() => setCvvVisible(false), CVV_TTL_MS);
  };

  const copyCvv = async () => {
    try {
      await navigator.clipboard.writeText(card.cvv);
      setCopied(true);
      playSound("confirm", [8, 16, 8]);
      pushToast({
        title: "CVV copied",
        body: "Security code written to the clipboard. It re-masks automatically in 5s.",
        tone: "signal",
        ttl: 2600,
      });
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      pushToast({
        title: "Clipboard blocked",
        body: "The browser denied clipboard access in this context.",
        tone: "negative",
      });
    }
  };

  const dark = card.finish === "frosted";
  const inkClass = dark ? "text-[#0b1220]" : "text-white";
  const dimClass = dark ? "text-[#0b1220]/60" : "text-white/55";
  const finishClass = cn(
    card.finish === "titanium" && styles.titanium,
    card.finish === "holographic" && styles.holographic,
    card.finish === "frosted" && styles.frosted,
  );

  return (
    <div className={cn(styles.stage, "select-none", className)}>
      <motion.div
        className={cn(styles.inner, "relative w-full")}
        style={{ rotateX, rotateY, transformPerspective: 1400 }}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={resetTilt}
      >
        <motion.div
          className={styles.inner}
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 28, mass: 0.7 }}
        >
          {/* ------------------------------ FRONT ----------------------------- */}
          <div
            role="button"
            tabIndex={0}
            onClick={flip}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                flip();
              }
            }}
            aria-label={`${card.label} ending ${card.last4}. Activate to flip and reveal the security code.`}
            className={cn(
              styles.face,
              "relative aspect-[1.586] w-full cursor-pointer overflow-hidden rounded-[22px] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.95)]",
              finishClass,
            )}
          >
            {card.finish === "holographic" && (
              <>
                <span className={styles.holoLayer} aria-hidden />
                <span className={styles.holoSheen} aria-hidden />
              </>
            )}
            {card.finish === "frosted" && <span className={styles.frostedGrid} aria-hidden />}
            <motion.span
              className={cn(styles.glare, hovered && styles.glareActive)}
              style={{ background: glare }}
              aria-hidden
            />

            <div className={cn("relative flex h-full flex-col justify-between p-5", inkClass)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={cn("font-mono text-[9px] uppercase tracking-[0.34em]", dimClass)}>
                    aether // capital
                  </p>
                  <p className="mt-1 text-[13px] font-semibold tracking-[-0.01em]">{card.label}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <NetworkMark network={card.network} dark={dark} />
                  {card.isVirtual && <Badge tone="signal">virtual</Badge>}
                </div>
              </div>

              <div className="pointer-events-none flex items-end justify-between gap-4">
                <Chip />
                <span className={cn("font-mono text-[8.5px] uppercase tracking-[0.18em]", dimClass)}>
                  tap to flip
                </span>
              </div>

              <div>
                <p
                  className={cn(
                    "numeric font-semibold tracking-[0.14em]",
                    compact ? "text-[13px]" : "text-[16px]",
                  )}
                >
                  •••• •••• •••• {card.last4}
                </p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("font-mono text-[8px] uppercase tracking-[0.2em]", dimClass)}>
                      card holder
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium tracking-[0.06em]">
                      {card.holder}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("font-mono text-[8px] uppercase tracking-[0.2em]", dimClass)}>
                      {card.expiresInSeconds !== null ? "ttl" : "expires"}
                    </p>
                    <p className="numeric mt-0.5 text-[11px] font-medium">
                      {card.expiresInSeconds !== null
                        ? formatCountdown(card.expiresInSeconds)
                        : formatExpiry(card.expiryMonth, card.expiryYear)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {card.controls.frozen && (
              <>
                <span className={styles.frostVeil} aria-hidden />
                {[
                  { top: "12%", left: "14%", size: 46, delay: 0 },
                  { top: "58%", left: "26%", size: 30, delay: 90 },
                  { top: "24%", left: "68%", size: 54, delay: 160 },
                  { top: "70%", left: "78%", size: 26, delay: 230 },
                  { top: "44%", left: "48%", size: 34, delay: 300 },
                ].map((shard) => (
                  <span
                    key={`${shard.top}-${shard.left}`}
                    className={styles.crystal}
                    style={{
                      top: shard.top,
                      left: shard.left,
                      width: shard.size,
                      height: shard.size,
                      animationDelay: `${shard.delay}ms`,
                    }}
                    aria-hidden
                  />
                ))}
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/25 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#06263a] backdrop-blur-sm">
                    <Snowflake className="size-3.5" /> frozen
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ------------------------------- BACK ----------------------------- */}
          <div
            className={cn(
              styles.face,
              styles.back,
              "absolute inset-0 overflow-hidden rounded-[22px] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.95)]",
              finishClass,
            )}
          >
            <div className={cn("relative flex h-full flex-col", inkClass)}>
              <div className={cn(styles.stripe, "mt-5 h-11 w-full")} aria-hidden />

              <div className="flex flex-1 flex-col justify-center gap-3 px-5">
                <div className="flex items-center gap-3">
                  <div className={cn(styles.signature, "h-9 flex-1 rounded-md")} aria-hidden />
                  <div className="relative flex h-9 items-center rounded-md bg-white/90 px-3">
                    <span className="numeric font-mono text-[13px] font-bold tracking-[0.18em] text-black">
                      {cvvVisible ? card.cvv : "•••"}
                    </span>
                    {cvvVisible && (
                      <motion.span
                        className="absolute -bottom-[3px] left-0 h-[2px] bg-[#0b1220]"
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: CVV_TTL_MS / 1000, ease: "linear" }}
                        aria-hidden
                      />
                    )}
                  </div>
                </div>

                {/* interactive cluster — isolated from any drag/tilt gesture */}
                <div
                  className="relative z-20 flex items-center justify-between gap-2"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <p className={cn("max-w-[54%] text-[9px] leading-relaxed", dimClass)}>
                    Issued by AETHER Trust under licence from {card.network}. Single-use
                    instruments terminate automatically on TTL expiry.
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={revealCvv}
                      aria-label={cvvVisible ? "Mask security code" : "Reveal security code for 5 seconds"}
                      className={cn(
                        "grid size-9 place-items-center rounded-lg border transition-transform duration-150 active:scale-90",
                        dark
                          ? "border-[#0b1220]/25 bg-white/70 text-[#0b1220] hover:bg-white"
                          : "border-white/30 bg-white/15 text-white hover:bg-white/25",
                      )}
                    >
                      {cvvVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyCvv()}
                      aria-label="Copy security code to clipboard"
                      className={cn(
                        "grid size-9 place-items-center rounded-lg border transition-transform duration-150 active:scale-90",
                        dark
                          ? "border-[#0b1220]/25 bg-white/70 text-[#0b1220] hover:bg-white"
                          : "border-white/30 bg-white/15 text-white hover:bg-white/25",
                      )}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={flip}
                      aria-label="Flip card back to the front"
                      className={cn(
                        "grid size-9 place-items-center rounded-lg border transition-transform duration-150 active:scale-90",
                        dark
                          ? "border-[#0b1220]/25 bg-white/70 text-[#0b1220] hover:bg-white"
                          : "border-white/30 bg-white/15 text-white hover:bg-white/25",
                      )}
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className={cn("flex items-center justify-between px-5 pb-4 text-[9px]", dimClass)}>
                <span className="font-mono uppercase tracking-[0.18em]">auth · chip+pin · 3ds2</span>
                <span className="numeric">
                  balance {formatMoney(card.balance, "USD", { compact: true })}
                </span>
              </div>
            </div>

            {card.controls.frozen && <span className={styles.frostVeil} aria-hidden />}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
