"use client";

import { motion } from "framer-motion";
import { Check, Download, FileText, Image as ImageIcon, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import type { TransferDraft } from "@/components/transfers/transfer-wizard";
import { formatBps, formatCountdown, formatDate, formatMoney, formatTimeShort, formatUsd } from "@/lib/format";
import type { WireTransfer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

const STAGES = [
  { key: "initiated", label: "Instruction initiated", note: "AETHER ledger" },
  { key: "screening", label: "Sanctions & AML screening", note: "OFAC / EU / HMT" },
  { key: "rail", label: "Rail hand-off", note: "SWIFT gpi tracker" },
  { key: "credit", label: "Beneficiary credited", note: "confirmation pending" },
] as const;

export interface ReceiptStepProps {
  wire: WireTransfer | null;
  draft: TransferDraft;
  onClose: () => void;
  onRestart: () => void;
}

export function ReceiptStep({ wire, draft, onClose, onRestart }: ReceiptStepProps) {
  const pushToast = useAetherStore((s) => s.pushToast);
  const playSound = useAetherStore((s) => s.playSound);
  const [stageIndex, setStageIndex] = useState(0);
  const [exporting, setExporting] = useState<"pdf" | "image" | null>(null);

  useEffect(() => {
    if (stageIndex >= STAGES.length - 1) return;
    const delay = stageIndex === 0 ? 700 : stageIndex === 1 ? 1_400 : 2_200;
    const timer = window.setTimeout(() => setStageIndex((value) => value + 1), delay);
    return () => window.clearTimeout(timer);
  }, [stageIndex]);

  const reference = wire?.reference ?? `AE-DRAFT-${Math.floor(Math.random() * 999_999)}`;
  const sourceAmount = wire?.sourceAmount ?? draft.sourceAmount;
  const targetAmount = wire?.targetAmount ?? draft.sourceAmount * 0.92;
  const rate = wire?.rate ?? 0.92;
  const fee = wire?.fee ?? 0;

  const receiptRows = useMemo(
    () => [
      { label: "Reference", value: reference, mono: true },
      { label: "Initiated", value: `${formatDate(new Date())} ${formatTimeShort(new Date())} UTC`, mono: true },
      { label: "Beneficiary", value: wire?.recipientName ?? draft.name },
      { label: "Entity", value: wire?.recipientEntity ?? draft.entity },
      { label: "IBAN", value: wire?.iban ?? draft.iban, mono: true },
      { label: "BIC", value: wire?.swift ?? draft.swift, mono: true },
      { label: "You sent", value: formatMoney(sourceAmount, draft.sourceCurrency), mono: true },
      { label: "Beneficiary receives", value: formatMoney(targetAmount, draft.targetCurrency), mono: true },
      { label: "Applied rate", value: `1 : ${rate.toPrecision(6)}`, mono: true },
      { label: "Spread", value: `${wire?.spreadBps ?? 6} bps · ${formatBps(wire?.spreadBps ?? 6)}`, mono: true },
      { label: "Fee", value: formatUsd(fee), mono: true },
      { label: "Auth", value: draft.authMethod === "biometric" ? "FaceID / TouchID" : "OTP 6-digit", mono: true },
      { label: "ETA", value: formatCountdown(wire?.etaSeconds ?? 42), mono: true },
    ],
    [reference, wire, draft, sourceAmount, targetAmount, rate, fee],
  );

  const exportImage = () => {
    setExporting("image");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="940" viewBox="0 0 720 940">
  <rect width="720" height="940" fill="#05060a"/>
  <rect x="24" y="24" width="672" height="892" rx="28" fill="none" stroke="#6e56f8" stroke-opacity="0.45"/>
  <text x="56" y="96" fill="#f4f6f8" font-family="monospace" font-size="20" letter-spacing="6">AETHER // CAPITAL</text>
  <text x="56" y="150" fill="#2ee6a8" font-family="monospace" font-size="44" font-weight="bold">${formatMoney(targetAmount, draft.targetCurrency)}</text>
  <text x="56" y="188" fill="#9aa2ad" font-family="monospace" font-size="16">credited to ${wire?.recipientName ?? draft.name}</text>
  ${receiptRows
    .map(
      (row, index) =>
        `<text x="56" y="${250 + index * 40}" fill="#5f6773" font-family="monospace" font-size="14">${row.label.toUpperCase()}</text><text x="664" y="${250 + index * 40}" text-anchor="end" fill="#f4f6f8" font-family="monospace" font-size="15">${row.value}</text>`,
    )
    .join("")}
  <text x="56" y="880" fill="#5f6773" font-family="monospace" font-size="12">SETTLEMENT PROOF · IMMUTABLE AUDIT TRAIL</text>
</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aether-receipt-${reference}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    window.setTimeout(() => {
      setExporting(null);
      playSound("confirm", 12);
      pushToast({
        title: "Receipt image exported",
        body: `${reference} rendered as a vector settlement proof.`,
        tone: "positive",
      });
    }, 900);
  };

  const exportPdf = () => {
    setExporting("pdf");
    window.setTimeout(() => {
      setExporting(null);
      playSound("confirm", [10, 18, 10]);
      pushToast({
        title: "PDF queued to compliance vault",
        body: `${reference} will be available in Documents → Settlement proofs (simulated export).`,
        tone: "signal",
      });
    }, 1_600);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-start gap-4">
          <span className="relative grid size-14 shrink-0 place-items-center">
            <motion.span
              className="absolute inset-0 rounded-full bg-[color:var(--positive)]/25"
              initial={{ scale: 0.5, opacity: 0.9 }}
              animate={{ scale: 2.1, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              aria-hidden
            />
            <svg viewBox="0 0 52 52" className="relative size-14" aria-hidden>
              <motion.circle
                cx="26"
                cy="26"
                r="23"
                fill="none"
                stroke="var(--positive)"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
              <motion.path
                d="M15 27.5l7.5 7.5L37 20"
                fill="none"
                stroke="var(--positive)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.42, delay: 0.45, ease: "easeOut" }}
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
              Wire authorised &amp; submitted
            </h3>
            <p className="mt-1 text-[12px] text-muted">
              {formatMoney(sourceAmount, draft.sourceCurrency)} →{" "}
              {formatMoney(targetAmount, draft.targetCurrency)} · {wire?.recipientName ?? draft.name}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Badge tone="positive" icon={<Check className="size-3" />}>
                authorised
              </Badge>
              <Badge tone="signal">{reference}</Badge>
              <Badge tone="neutral">
                eta {formatCountdown(wire?.etaSeconds ?? 42)}
              </Badge>
            </div>
          </div>
        </div>

        <ol className="mt-6 space-y-0">
          {STAGES.map((item, index) => {
            const done = index <= stageIndex;
            const active = index === stageIndex;
            return (
              <li key={item.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <motion.span
                    animate={{
                      scale: active ? [1, 1.25, 1] : 1,
                      background: done ? "var(--positive)" : "var(--surface-3)",
                    }}
                    transition={{ duration: active ? 1.4 : 0.2, repeat: active ? Infinity : 0 }}
                    className={cn("grid size-3.5 place-items-center rounded-full border")}
                    style={{
                      borderColor: done ? "var(--positive)" : "var(--line-strong)",
                    }}
                    aria-hidden
                  />
                  {index < STAGES.length - 1 && (
                    <span
                      className={cn(
                        "my-1 w-px flex-1 transition-colors duration-500",
                        index < stageIndex ? "bg-[color:var(--positive)]/60" : "bg-[var(--line)]",
                      )}
                      style={{ minHeight: 26 }}
                      aria-hidden
                    />
                  )}
                </div>
                <div className={cn("pb-4", index === STAGES.length - 1 && "pb-0")}>
                  <p className={cn("text-[12.5px] font-medium", done ? "text-ink" : "text-dim")}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-dim">
                    {item.note}
                    {active && " · in progress"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
          <Button
            size="sm"
            variant="outline"
            loading={exporting === "pdf"}
            icon={<FileText className="size-4" />}
            onClick={exportPdf}
          >
            Download PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={exporting === "image"}
            icon={<ImageIcon className="size-4" />}
            onClick={exportImage}
          >
            Export image
          </Button>
          <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={onRestart}>
            New transfer
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, rotateX: -6 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(160deg,var(--accent-soft),transparent_55%)] p-5"
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-[repeating-linear-gradient(90deg,var(--canvas)_0_10px,transparent_10px_20px)]" aria-hidden />
        <div className="flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-dim">
            settlement proof
          </p>
          <Download className="size-3.5 text-dim" aria-hidden />
        </div>
        <p className="numeric mt-3 text-[26px] font-semibold tracking-[-0.035em] text-ink">
          {formatMoney(targetAmount, draft.targetCurrency)}
        </p>
        <p className="mt-1 text-[11.5px] text-muted">
          {draft.targetCurrency} · credited to {wire?.recipientName ?? draft.name}
        </p>
        <dl className="mt-4 space-y-2 text-[11.5px]">
          {receiptRows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-dim">{row.label}</dt>
              <dd className={cn("truncate text-ink", row.mono && "numeric")}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </div>
  );
}
