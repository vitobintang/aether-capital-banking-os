"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/feedback";
import { AuthStep } from "@/components/transfers/auth-step";
import { FxStep } from "@/components/transfers/fx-step";
import { ReceiptStep } from "@/components/transfers/receipt-step";
import { RecipientStep } from "@/components/transfers/recipient-step";
import type { CurrencyCode, Recipient, WireTransfer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

export type TransferStage = "recipient" | "fx" | "auth" | "receipt";

const STAGES: Array<{ key: TransferStage; label: string; hint: string }> = [
  { key: "recipient", label: "Beneficiary", hint: "Smart recipient select · IBAN / SWIFT validation" },
  { key: "fx", label: "FX quote", hint: "Live mid-market rate · spread, fee and arrival timer" },
  { key: "auth", label: "Authorise", hint: "Biometric scan or 6-digit OTP step-up" },
  { key: "receipt", label: "Settled", hint: "Exportable animated transaction receipt" },
];

export interface TransferDraft {
  recipient: Recipient | null;
  name: string;
  entity: string;
  iban: string;
  swift: string;
  sourceCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  sourceAmount: number;
  authMethod: "biometric" | "otp";
}

export function createDraft(): TransferDraft {
  return {
    recipient: null,
    name: "",
    entity: "",
    iban: "",
    swift: "",
    sourceCurrency: "USD",
    targetCurrency: "EUR",
    sourceAmount: 25_000,
    authMethod: "biometric",
  };
}

export interface TransferWizardProps {
  open: boolean;
  onClose: () => void;
  variant?: "modal" | "inline";
}

export function TransferWizard({ open, onClose, variant = "modal" }: TransferWizardProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [draft, setDraft] = useState<TransferDraft>(createDraft);
  const [wire, setWire] = useState<WireTransfer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const accounts = useAetherStore((s) => s.accounts);
  const submitWire = useAetherStore((s) => s.submitWire);
  const pushToast = useAetherStore((s) => s.pushToast);
  const playSound = useAetherStore((s) => s.playSound);

  const stage = STAGES[stageIndex]!;

  const patch = useCallback((partial: Partial<TransferDraft>) => {
    setDraft((current) => ({ ...current, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setDraft(createDraft());
    setStageIndex(0);
    setWire(null);
    setAuthError(null);
    setSubmitting(false);
  }, []);

  const close = useCallback(() => {
    onClose();
    window.setTimeout(reset, 260);
  }, [onClose, reset]);

  const balanceFor = useMemo(() => {
    const account = accounts.find((a) => a.code === draft.sourceCurrency);
    return account?.balance ?? 0;
  }, [accounts, draft.sourceCurrency]);

  const authorise = async () => {
    setSubmitting(true);
    setAuthError(null);
    const result = await submitWire({
      recipientName: draft.name || draft.recipient?.name || "Beneficiary",
      recipientEntity: draft.entity || draft.recipient?.entity || "—",
      iban: draft.iban || draft.recipient?.iban || "",
      swift: draft.swift || draft.recipient?.swift || "",
      sourceCurrency: draft.sourceCurrency,
      targetCurrency: draft.targetCurrency,
      sourceAmount: draft.sourceAmount,
      authMethod: draft.authMethod,
    });
    setSubmitting(false);
    if (result) {
      setWire(result);
      setStageIndex(3);
      playSound("cash", [14, 28, 14]);
      return;
    }
    setAuthError(
      "The rail rejected this instruction — usually an IBAN/BIC mismatch or an amount above the available balance. Fix the details and retry.",
    );
    pushToast({
      title: "Authorisation declined",
      body: "Compliance rejected the instruction. Adjust the amount or beneficiary details.",
      tone: "negative",
    });
  };

  const canAdvance = useMemo(() => {
    if (stage.key === "recipient") {
      return draft.iban.replace(/\s/g, "").length >= 15 && draft.swift.length >= 8 && draft.name.trim().length > 1;
    }
    if (stage.key === "fx") {
      return draft.sourceAmount > 0 && draft.sourceAmount <= balanceFor;
    }
    return true;
  }, [stage.key, draft, balanceFor]);

  const body = (
    <div className="min-h-[440px]">
      <nav aria-label="Transfer progress" className="mb-5">
        <ol className="flex items-center gap-1.5">
          {STAGES.map((item, index) => {
            const done = index < stageIndex;
            const active = index === stageIndex;
            return (
              <li key={item.key} className="flex min-w-0 flex-1 items-center gap-1.5">
                <button
                  type="button"
                  disabled={index > stageIndex || stage.key === "receipt"}
                  onClick={() => index < stageIndex && setStageIndex(index)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-lg border px-2 transition-colors",
                    active
                      ? "border-accent bg-accent-soft text-accent"
                      : done
                        ? "border-[color:var(--positive)]/40 bg-[color:var(--positive)]/10 text-[color:var(--positive)]"
                        : "border-[var(--line)] text-dim",
                    index < stageIndex && "cursor-pointer hover:brightness-125",
                  )}
                >
                  <span className="grid size-4 shrink-0 place-items-center rounded-full border border-current">
                    {done ? <Check className="size-2.5" /> : <span className="numeric text-[8px]">{index + 1}</span>}
                  </span>
                  <span className="truncate text-[10.5px] font-medium tracking-[-0.01em]">
                    {item.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="wizard-active"
                      className="absolute inset-0 -z-10 rounded-lg ring-1 ring-accent/50"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
          step {stageIndex + 1}/4 · {stage.hint}
        </p>
      </nav>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage.key}
          initial={{ opacity: 0, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -22 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
        >
          {stage.key === "recipient" && <RecipientStep draft={draft} patch={patch} />}
          {stage.key === "fx" && (
            <FxStep draft={draft} patch={patch} balance={balanceFor} />
          )}
          {stage.key === "auth" && (
            <AuthStep
              draft={draft}
              patch={patch}
              onAuthorised={() => void authorise()}
              submitting={submitting}
              error={authError}
            />
          )}
          {stage.key === "receipt" && (
            <ReceiptStep wire={wire} draft={draft} onClose={close} onRestart={reset} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  const footer =
    stage.key === "receipt" ? null : (
      <div className="flex w-full items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="size-4" />}
          disabled={stageIndex === 0}
          onClick={() => {
            setStageIndex((i) => Math.max(0, i - 1));
            playSound("tap");
          }}
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          {stage.key === "auth" ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
              complete verification to submit
            </span>
          ) : (
            <Button
              size="sm"
              disabled={!canAdvance}
              icon={stage.key === "fx" ? <Send className="size-4" /> : undefined}
              trailing={<ArrowRight className="size-4" />}
              onClick={() => {
                if (!canAdvance) return;
                setStageIndex((i) => Math.min(3, i + 1));
                playSound("whoosh", 8);
              }}
            >
              {stage.key === "fx" ? "Continue to authorisation" : "Continue"}
            </Button>
          )}
        </div>
      </div>
    );

  if (variant === "inline") {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        {body}
        {footer && <div className="mt-4 border-t border-[var(--line)] pt-3">{footer}</div>}
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Cross-border wire transfer"
      subtitle="SWIFT gpi · SEPA Instant · on-chain settlement rails"
      className="max-w-3xl"
      footer={footer}
    >
      {body}
    </Modal>
  );
}
