"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Delete,
  Fingerprint,
  KeyRound,
  Loader2,
  ScanFace,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Badge } from "@/components/ui/feedback";
import type { TransferDraft } from "@/components/transfers/transfer-wizard";
import { formatCountdown, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

export interface AuthStepProps {
  draft: TransferDraft;
  patch: (partial: Partial<TransferDraft>) => void;
  onAuthorised: () => void;
  submitting: boolean;
  error: string | null;
}

type ScanState = "idle" | "scanning" | "matched";

const METHODS = [
  { value: "biometric", label: "Biometric" },
  { value: "otp", label: "OTP" },
] as const;

const SCAN_MS = 900;

export function AuthStep({ draft, patch, onAuthorised, submitting, error }: AuthStepProps) {
  /**
   * The completion handler is held in a ref so store ticks (which re-render the
   * wizard every ~1.7s) can never cancel an in-flight verification timer.
   */
  const completeRef = useRef(onAuthorised);
  useEffect(() => {
    completeRef.current = onAuthorised;
  }, [onAuthorised]);

  const complete = useCallback(() => completeRef.current(), []);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <div>
        <Segmented
          ariaLabel="Authorisation method"
          layoutId="auth-method"
          options={METHODS.map((method) => ({ value: method.value, label: method.label }))}
          value={draft.authMethod}
          onChange={(value) => patch({ authMethod: value })}
          size="sm"
        />

        <div className="mt-4">
          <AnimatePresence mode="wait" initial={false}>
            {draft.authMethod === "biometric" ? (
              <motion.div
                key="biometric"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
              >
                <BiometricScan submitting={submitting} onComplete={complete} />
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
              >
                <OtpPad submitting={submitting} onComplete={complete} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {(submitting || error) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={cn(
                "mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[11.5px]",
                error
                  ? "border-[color:var(--negative)]/45 bg-[color:var(--negative)]/[0.08] text-[color:var(--negative)]"
                  : "border-accent/40 bg-accent-soft text-accent",
              )}
              role={error ? "alert" : "status"}
            >
              {error ? (
                <AlertTriangle className="mt-[1px] size-3.5 shrink-0" aria-hidden />
              ) : (
                <Loader2 className="mt-[1px] size-3.5 shrink-0 anim-spin-slow" aria-hidden />
              )}
              <span className="min-w-0 flex-1 leading-relaxed">
                {error ??
                  "Signature released · posting the instruction to the settlement rail and writing the ledger entry…"}
              </span>
              {error && (
                <Button size="xs" variant="outline" onClick={complete}>
                  Retry
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <aside className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
          instruction awaiting authorisation
        </p>
        <p className="numeric mt-2 text-[24px] font-semibold tracking-[-0.03em] text-ink">
          {formatMoney(draft.sourceAmount, draft.sourceCurrency)}
        </p>
        <p className="mt-1 text-[12px] text-muted">
          → {draft.targetCurrency} · {draft.name || draft.recipient?.name || "beneficiary"}
        </p>
        <dl className="mt-4 space-y-2 text-[11.5px]">
          <SummaryRow label="Beneficiary" value={draft.name || draft.recipient?.name || "—"} />
          <SummaryRow label="Entity" value={draft.entity || draft.recipient?.entity || "—"} />
          <SummaryRow
            label="IBAN"
            value={`${(draft.iban || draft.recipient?.iban || "").replace(/\s/g, "").slice(0, 4)} •••• ${(draft.iban || draft.recipient?.iban || "").replace(/\s/g, "").slice(-4)}`}
            mono
          />
          <SummaryRow label="BIC" value={draft.swift || draft.recipient?.swift || "—"} mono />
          <SummaryRow
            label="Method"
            value={draft.authMethod === "biometric" ? "FaceID / TouchID" : "6-digit OTP"}
          />
        </dl>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[color:var(--positive)]/30 bg-[color:var(--positive)]/[0.07] px-3 py-2.5">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[color:var(--positive)]" aria-hidden />
          <p className="text-[10.5px] leading-relaxed text-muted">
            Step-up authentication is required for instructions above{" "}
            <span className="text-ink">10,000</span> or crossing jurisdictional boundaries. Keys
            never leave the secure enclave.
          </p>
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-dim">{label}</dt>
      <dd className={cn("truncate text-ink", mono && "numeric")}>{value}</dd>
    </div>
  );
}

function BiometricScan({
  onComplete,
  submitting,
}: {
  onComplete: () => void;
  submitting: boolean;
}) {
  const playSound = useAetherStore((s) => s.playSound);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<ScanState>("idle");
  const frame = useRef<number | null>(null);
  const fired = useRef(false);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const start = () => {
    if (state !== "idle" || submitting || fired.current) return;
    fired.current = true;
    setState("scanning");
    setProgress(0);
    playSound("scan", [10, 20, 10]);
    const started = performance.now();
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - started) / SCAN_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        setState("matched");
        playSound("confirm", [12, 24, 12]);
        onComplete();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  return (
    <div className="grid place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-8">
      <motion.button
        type="button"
        onClick={start}
        disabled={submitting || state !== "idle"}
        whileTap={{ scale: 0.94 }}
        aria-label="Start biometric authentication"
        className="relative grid size-32 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)]"
      >
        {state === "scanning" && (
          <span
            aria-hidden
            className="anim-scan absolute inset-x-3 h-8 rounded-full bg-gradient-to-b from-transparent via-[color:var(--signal)]/45 to-transparent"
          />
        )}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full border-2",
            state === "matched" ? "border-[color:var(--positive)]" : "border-accent/50",
          )}
          style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }}
        />
        {state === "matched" ? (
          <ScanFace className="size-12 text-[color:var(--positive)]" aria-hidden />
        ) : (
          <Fingerprint
            className={cn("size-12", state === "scanning" ? "text-[color:var(--signal)]" : "text-muted")}
            aria-hidden
          />
        )}
      </motion.button>

      <p className="numeric mt-4 text-[11px] uppercase tracking-[0.18em] text-dim">
        {state === "idle" && "tap to scan · secure enclave"}
        {state === "scanning" && `matching · ${progress.toFixed(0)}%`}
        {state === "matched" && "biometric matched · releasing signature"}
      </p>

      <div className="mt-3 h-1 w-52 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[color:var(--signal)] to-accent"
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.06 }}
        />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-muted">
        <KeyRound className="size-3 text-dim" aria-hidden />
        Secure enclave · {submitting ? "posting instruction" : "awaiting signature"}
        {submitting && (
          <Badge tone="accent" className="ml-1">
            submitting
          </Badge>
        )}
      </p>
    </div>
  );
}

function OtpPad({ onComplete, submitting }: { onComplete: () => void; submitting: boolean }) {
  const playSound = useAetherStore((s) => s.playSound);
  const [code, setCode] = useState("");
  const [rejected, setRejected] = useState(false);
  const [shake, setShake] = useState(false);
  const timer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const fired = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const verify = (value: string) => {
    if (fired.current || submitting) return;
    fired.current = true;
    timer.current = window.setTimeout(() => {
      if (value === "000000") {
        fired.current = false;
        setRejected(true);
        setShake(true);
        playSound("reject", [40, 30, 40]);
        resetTimer.current = window.setTimeout(() => {
          setShake(false);
          setCode("");
          setRejected(false);
        }, 460);
        return;
      }
      setRejected(false);
      playSound("confirm", [12, 22, 12]);
      onComplete();
    }, 240);
  };

  const press = (digit: string) => {
    if (code.length >= 6 || submitting || fired.current) return;
    const next = code + digit;
    setCode(next);
    playSound("tap", 8);
    if (next.length === 6) verify(next);
  };

  const backspace = () => {
    if (fired.current) return;
    setCode((current) => current.slice(0, -1));
    setRejected(false);
    playSound("tap", 6);
  };

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-6">
      <p className="text-center text-[12.5px] text-muted">
        Enter the 6-digit code sent to your registered device
      </p>
      <p className="numeric mt-1 text-center text-[11px] text-dim">
        +1 ••• ••• 4417 · expires in {formatCountdown(128)}
      </p>

      <motion.div
        animate={shake ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-5 flex justify-center gap-2"
      >
        {Array.from({ length: 6 }).map((_, index) => {
          const filled = index < code.length;
          return (
            <span
              key={index}
              className={cn(
                "numeric grid size-11 place-items-center rounded-xl border text-[18px] font-semibold transition-colors duration-150",
                rejected
                  ? "border-[color:var(--negative)] text-[color:var(--negative)]"
                  : filled
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-[var(--line-strong)] bg-[var(--surface-2)] text-dim",
              )}
            >
              {filled ? code[index] : <span aria-hidden>·</span>}
            </span>
          );
        })}
      </motion.div>

      <label className="sr-only" htmlFor="otp-input">
        One-time passcode
      </label>
      <input
        id="otp-input"
        className="sr-only"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(event) => {
          if (fired.current || submitting) return;
          const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
          setCode(digits);
          setRejected(false);
          if (digits.length === 6) verify(digits);
        }}
        aria-invalid={rejected}
      />

      <div className="mx-auto mt-5 grid max-w-[260px] grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => press(digit)}
            aria-label={`Digit ${digit}`}
            className="numeric h-12 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[16px] font-semibold text-ink transition-colors duration-150 hover:border-accent hover:text-accent active:scale-95"
          >
            {digit}
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={() => press("0")}
          aria-label="Digit 0"
          className="numeric h-12 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[16px] font-semibold text-ink transition-colors duration-150 hover:border-accent hover:text-accent active:scale-95"
        >
          0
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-12"
          aria-label="Delete last digit"
          icon={<Delete className="size-4" />}
          onClick={backspace}
        >
          <span className="sr-only">Delete</span>
        </Button>
      </div>

      <AnimatePresence>
        {rejected && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="mt-4 text-center text-[11px] text-[color:var(--negative)]"
          >
            One-time code rejected by the HSM. Try again.
          </motion.p>
        )}
      </AnimatePresence>
      <p className="mt-3 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-dim">
        hint · any code except 000000 authorises
      </p>
    </div>
  );
}
