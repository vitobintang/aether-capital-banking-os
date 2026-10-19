"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock3, Search, ShieldCheck, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Field } from "@/components/ui/controls";
import { Badge } from "@/components/ui/feedback";
import type { TransferDraft } from "@/components/transfers/transfer-wizard";
import type { CurrencyCode, Recipient } from "@/lib/types";
import { cn, formatIban, formatSwift, initials, relativeTime, validateIban, validateSwift } from "@/lib/utils";
import { useAetherStore } from "@/store/useAetherStore";

const TARGET_CURRENCIES: CurrencyCode[] = ["EUR", "GBP", "USD", "BTC", "ETH"];

export interface RecipientStepProps {
  draft: TransferDraft;
  patch: (partial: Partial<TransferDraft>) => void;
}

export function RecipientStep({ draft, patch }: RecipientStepProps) {
  const recipients = useAetherStore((s) => s.recipients);
  const playSound = useAetherStore((s) => s.playSound);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length === 0) return recipients.slice(0, 6);
    return recipients
      .filter((recipient) =>
        `${recipient.name} ${recipient.entity} ${recipient.iban} ${recipient.country} ${recipient.currency}`
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 6);
  }, [query, recipients]);

  const ibanValue = draft.iban || draft.recipient?.iban || "";
  const swiftValue = draft.swift || draft.recipient?.swift || "";
  const ibanValid = validateIban(ibanValue);
  const swiftValid = validateSwift(swiftValue);

  const selectRecipient = (recipient: Recipient) => {
    patch({
      recipient,
      name: recipient.name,
      entity: recipient.entity,
      iban: formatIban(recipient.iban),
      swift: recipient.swift,
      targetCurrency: recipient.currency,
    });
    setQuery("");
    playSound("confirm", [8, 14, 8]);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search beneficiaries, entities, IBANs…"
            aria-label="Search saved recipients"
            className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-dim focus:border-accent"
          />
        </div>

        <ul className="mt-2.5 max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {matches.map((recipient, index) => {
              const selected = draft.recipient?.id === recipient.id;
              return (
                <motion.li
                  key={recipient.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <button
                    type="button"
                    onClick={() => selectRecipient(recipient)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.985]",
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold",
                        selected
                          ? "bg-accent text-[color:var(--accent-ink)]"
                          : "bg-[var(--surface-3)] text-ink",
                      )}
                      aria-hidden
                    >
                      {initials(recipient.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">
                        {recipient.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
                        {recipient.entity} · {recipient.countryCode} · {recipient.currency}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={recipient.trustScore >= 92 ? "positive" : "warning"}>
                        trust {recipient.trustScore}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[9.5px] text-dim">
                        {recipient.lastUsed ? (
                          <>
                            <Clock3 className="size-2.5" aria-hidden />
                            {relativeTime(recipient.lastUsed)}
                          </>
                        ) : (
                          <>
                            <UserPlus className="size-2.5" aria-hidden />
                            never used
                          </>
                        )}
                      </span>
                    </span>
                    {selected && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {matches.length === 0 && (
            <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-[11px] text-muted">
              No beneficiary matches “{query}”. Enter details manually on the right.
            </li>
          )}
        </ul>
      </div>

      <div className="space-y-3">
        <Field
          label="Beneficiary name"
          value={draft.name}
          onChange={(value) => patch({ name: value, recipient: null })}
          placeholder="Mireille Laurent"
          autoComplete="off"
        />
        <Field
          label="Entity / company"
          value={draft.entity}
          onChange={(value) => patch({ entity: value })}
          placeholder="Atelier Nord SARL"
          autoComplete="off"
        />
        <Field
          label="IBAN"
          value={draft.iban}
          onChange={(value) => patch({ iban: formatIban(value) })}
          placeholder="DE89 3704 0044 0532 0130 00"
          mono
          hint={draft.iban.length > 4 ? (ibanValid ? "mod-97 valid" : "checksum failed") : "ISO 13616"}
          error={draft.iban.length > 4 && !ibanValid ? "IBAN failed mod-97 validation" : null}
          suffix={
            draft.iban.length > 4 ? (
              ibanValid ? (
                <ShieldCheck className="size-4 text-[color:var(--positive)]" aria-label="Valid IBAN" />
              ) : (
                <span className="size-4 rounded-full border-2 border-[color:var(--negative)]" aria-label="Invalid IBAN" />
              )
            ) : null
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="SWIFT / BIC"
            value={draft.swift}
            onChange={(value) => patch({ swift: formatSwift(value) })}
            placeholder="BNPAFRPPXXX"
            mono
            maxLength={11}
            hint="8 or 11 chars"
            error={draft.swift.length > 0 && !swiftValid ? "Invalid BIC format" : null}
          />
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
              Receive in
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TARGET_CURRENCIES.map((code) => {
                const active = draft.targetCurrency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => patch({ targetCurrency: code })}
                    className={cn(
                      "numeric h-8 rounded-lg border px-2.5 text-[11px] font-semibold transition-all active:scale-95",
                      active
                        ? "border-transparent bg-accent text-[color:var(--accent-ink)]"
                        : "border-[var(--line)] bg-[var(--surface)] text-muted hover:text-ink",
                    )}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
            pre-flight compliance
          </p>
          <ul className="mt-2 space-y-1.5 text-[11px]">
            <Checklist ok={ibanValid} label="IBAN checksum (ISO 13616 mod-97)" />
            <Checklist ok={swiftValid} label="SWIFT/BIC structure" />
            <Checklist ok={draft.name.trim().length > 1} label="Beneficiary identity captured" />
            <Checklist
              ok={draft.entity.trim().length > 1}
              label="Entity sanctions screening key"
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Checklist({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
          ok
            ? "border-[color:var(--positive)] bg-[color:var(--positive)]/15 text-[color:var(--positive)]"
            : "border-[var(--line-strong)] text-dim",
        )}
        aria-hidden
      >
        {ok && <Check className="size-2.5" />}
      </span>
      <span className={ok ? "text-ink" : "text-muted"}>{label}</span>
    </li>
  );
}
