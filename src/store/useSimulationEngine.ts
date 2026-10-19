"use client";

import { useEffect, useRef } from "react";
import { useAetherStore } from "./useAetherStore";
import { convert } from "@/lib/fx";
import { formatUsd } from "@/lib/format";
import type { LedgerEntry, SecurityAlert } from "@/lib/types";
import { clamp, createId } from "@/lib/utils";

/**
 * Simulated real-time market/instrument socket.
 * Emulates a WebSocket feed: price ticks, card authorisations, inbound wires
 * and fraud-model detections, all routed through the Zustand store.
 */
export function useSimulationEngine(): void {
  const simulation = useAetherStore((s) => s.simulation);
  const status = useAetherStore((s) => s.status);
  const started = useRef(false);

  useEffect(() => {
    if (!simulation || status !== "ready" || started.current) return;
    started.current = true;

    const store = useAetherStore;

    const priceTimer = window.setInterval(() => {
      store.getState().tickMarket();
      const state = store.getState();
      const btc = state.market.find((m) => m.symbol === "BTC");
      if (btc) {
        state.recordEvent({
          type: "price",
          message: `BTC/USD ${btc.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        });
      }
    }, 1_700);

    const ledgerTimer = window.setInterval(() => {
      const state = store.getState();
      if (!state.simulation) return;

      const roll = Math.random();
      if (roll > 0.62) {
        const entry = createSimulatedLedger(state.rates, {
          accountId: state.accounts[0]?.id ?? "",
          cardId: (state.cards.find((card) => !card.isVirtual) ?? state.cards[0])?.id ?? null,
        });
        state.injectLiveEntry(entry);
        const usd = Math.abs(convert(entry.amount, entry.currency, "USD", state.rates));
        const isIncoming = entry.direction === "credit";
        state.recordEvent({
          type: isIncoming ? "incoming" : "spend",
          message: `${isIncoming ? "Inbound" : "Authorised"} ${entry.merchant} ${formatUsd(usd, { sign: isIncoming })}`,
          amountUsd: usd,
        });
        state.playSound(isIncoming ? "cash" : "tap", isIncoming ? [14, 26, 14] : 8);
        state.pushToast({
          title: isIncoming ? "Inbound transfer settled" : "Card authorised",
          body: `${entry.merchant} · ${formatUsd(usd, { sign: isIncoming })}`,
          tone: isIncoming ? "positive" : "neutral",
          ttl: 3600,
        });
        state.expandIsland(
          isIncoming
            ? { kind: "incoming", title: "Inbound wire", detail: entry.merchant, amount: entry.amount, currency: entry.currency }
            : { kind: "transfer", title: "Authorisation", detail: entry.merchant, amount: entry.amount, currency: entry.currency },
          4200,
        );
      }
    }, 5_200);

    const fraudTimer = window.setInterval(() => {
      const state = store.getState();
      if (!state.simulation || Math.random() > 0.34) return;
      const ledgerSample = state.ledger.find((entry) => entry.riskScore >= 70);
      const alert: SecurityAlert = {
        id: createId("alert_live"),
        ts: new Date().toISOString(),
        severity: "high",
        title: "Flagged · anomalous settlement",
        detail: ledgerSample
          ? `${ledgerSample.merchant} · ${ledgerSample.geo.city}, ${ledgerSample.geo.countryCode}`
          : "Unrecognised beneficiary · velocity spike",
        confidence: clamp(62 + Math.round(Math.random() * 34), 60, 99),
        geo: ledgerSample?.geo ?? { lat: 6.5244, lng: 3.3792, city: "Lagos", country: "Nigeria", countryCode: "NG" },
        ledgerId: ledgerSample?.id ?? null,
        resolved: false,
        vector: "device fingerprint mismatch · new ASN",
      };
      state.raiseAlert(alert);
      state.recordEvent({ type: "fraud", message: `Risk engine flagged ${alert.detail}` });
      state.playSound("alert", [30, 40, 30]);
      state.pushToast({
        title: "Fraud model · high confidence",
        body: `${alert.confidence}% · ${alert.detail}`,
        tone: "negative",
        ttl: 6000,
      });
      state.expandIsland({ kind: "fraud", title: "Risk engine", detail: `${alert.confidence}% confidence` }, 5200);
    }, 11_000);

    const burnerTimer = window.setInterval(() => {
      const state = store.getState();
      const ticking = state.cards.some(
        (card) => card.expiresInSeconds !== null && card.expiresInSeconds > 0,
      );
      if (!ticking) return;
      let froze: string | null = null;
      const cards = state.cards.map((card) => {
        if (card.expiresInSeconds === null) return card;
        const next = card.expiresInSeconds - 1;
        if (next <= 0 && !card.controls.frozen) {
          froze = card.id;
          return {
            ...card,
            expiresInSeconds: 0,
            controls: { ...card.controls, frozen: true },
          };
        }
        return { ...card, expiresInSeconds: Math.max(0, next) };
      });
      if (cards !== state.cards) store.setState({ cards });
      if (froze) {
        state.pushToast({
          title: "Burner card expired",
          body: "TTL elapsed — the virtual card was auto-frozen and can no longer be used.",
          tone: "warning",
          ttl: 5200,
        });
        state.playSound("freeze", 24);
      }
    }, 1_000);

    return () => {
      started.current = false;
      window.clearInterval(priceTimer);
      window.clearInterval(ledgerTimer);
      window.clearInterval(fraudTimer);
      window.clearInterval(burnerTimer);
    };
  }, [simulation, status]);
}

interface LedgerRouting {
  accountId: string;
  cardId: string | null;
}

function createSimulatedLedger(
  rates: Record<"USD" | "EUR" | "GBP" | "BTC" | "ETH", number>,
  routing: LedgerRouting,
): LedgerEntry {
  const merchants = [
    { merchant: "Snowflake Compute", category: "SaaS" as const, min: 3_200, max: 28_000, city: "San Francisco", countryCode: "US", country: "United States", lat: 37.7749, lng: -122.4194 },
    { merchant: "Google Ads", category: "Marketing" as const, min: 4_200, max: 62_000, city: "New York", countryCode: "US", country: "United States", lat: 40.7128, lng: -74.006 },
    { merchant: "Nobu Downtown", category: "Dining" as const, min: 180, max: 2_400, city: "New York", countryCode: "US", country: "United States", lat: 40.7128, lng: -74.006 },
    { merchant: "Coinbase Prime", category: "Crypto" as const, min: 12_000, max: 180_000, city: "Singapore", countryCode: "SG", country: "Singapore", lat: 1.3521, lng: 103.8198 },
    { merchant: "Customer Settlement — Orbital", category: "Wire" as const, min: 18_000, max: 320_000, city: "Berlin", countryCode: "DE", country: "Germany", lat: 52.52, lng: 13.405, credit: true },
    { merchant: "AWS us-east-1", category: "Utilities" as const, min: 6_400, max: 96_000, city: "Austin", countryCode: "US", country: "United States", lat: 30.2672, lng: -97.7431 },
    { merchant: "Emirates SkyCargo", category: "Travel" as const, min: 1_200, max: 18_000, city: "Dubai", countryCode: "AE", country: "UAE", lat: 25.2048, lng: 55.2708 },
  ];
  const template = merchants[Math.floor(Math.random() * merchants.length)]!;
  const isIncoming = template.credit === true || Math.random() > 0.86;
  const amount = Number((template.min + Math.random() * (template.max - template.min)).toFixed(2));
  const ts = new Date().toISOString();
  const geo = { lat: template.lat, lng: template.lng, city: template.city, country: template.country, countryCode: template.countryCode };
  const risky = amount > 120_000 && Math.random() > 0.55;
  void rates;
  return {
    id: createId("led_live"),
    ts,
    merchant: template.merchant,
    category: template.category,
    amount,
    currency: "USD",
    direction: isIncoming ? "credit" : "debit",
    status: isIncoming ? "settled" : "pending",
    accountId: routing.accountId,
    cardId: isIncoming ? null : routing.cardId,
    channel: isIncoming ? "wire" : "card",
    geo,
    riskScore: risky ? 78 : Math.round(4 + Math.random() * 18),
    reference: `AE-2026-${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
  };
}
