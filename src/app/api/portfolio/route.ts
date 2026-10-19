import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, alerts, cards, ledger, marketAssets, wires } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { readSessionToken, resolveSession } from "@/lib/auth";
import { BASE_RATES } from "@/lib/fx";
import { buildHistory } from "@/lib/mock-data";
import { RECIPIENTS } from "@/lib/mock-data";
import type { CurrencyCode, PortfolioSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash % 100_000;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await ensureSeeded();
    const user = await resolveSession(readSessionToken(request));
    if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

    const [accountRows, cardRows, ledgerRows, alertRows, wireRows, marketRows] =
      await Promise.all([
        db.select().from(accounts).where(eq(accounts.ownerId, user.id)),
        db.select().from(cards).where(eq(cards.ownerId, user.id)),
        db.select().from(ledger).where(eq(ledger.ownerId, user.id)).orderBy(desc(ledger.ts)).limit(1_240),
        db.select().from(alerts).where(eq(alerts.ownerId, user.id)).orderBy(desc(alerts.ts)),
        db.select().from(wires).where(eq(wires.ownerId, user.id)).orderBy(desc(wires.createdAt)),
        db.select().from(marketAssets),
      ]);

    const rates: Record<CurrencyCode, number> = { ...BASE_RATES };
    const btc = marketRows.find((row) => row.symbol === "BTC");
    const eth = marketRows.find((row) => row.symbol === "ETH");
    if (btc && btc.price > 0) rates.BTC = 1 / btc.price;
    if (eth && eth.price > 0) rates.ETH = 1 / eth.price;

    const netWorth = accountRows.reduce(
      (sum, row) => sum + row.balance / (rates[row.code] ?? 1),
      0,
    );

    const snapshot: PortfolioSnapshot = {
      accounts: accountRows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        assetClass: row.assetClass,
        balance: row.balance,
        rateToUsd: row.rateToUsd,
        change24h: row.change24h,
        iban: row.iban,
        available: row.available,
      })),
      cards: cardRows.map((row) => ({
        id: row.id,
        label: row.label,
        holder: row.holder,
        network: row.network,
        last4: row.last4,
        expiryMonth: row.expiryMonth,
        expiryYear: row.expiryYear,
        cvv: row.cvv,
        finish: row.finish,
        isVirtual: row.isVirtual,
        balance: row.balance,
        spend30d: row.spend30d,
        controls: row.controls,
        createdAt: row.createdAt,
        expiresInSeconds: row.expiresInSeconds,
      })),
      ledger: ledgerRows.map((row) => ({
        id: row.id,
        ts: row.ts,
        merchant: row.merchant,
        category: row.category,
        amount: row.amount,
        currency: row.currency,
        direction: row.direction,
        status: row.status,
        accountId: row.accountId,
        cardId: row.cardId,
        channel: row.channel,
        geo: row.geo,
        riskScore: row.riskScore,
        reference: row.reference,
      })),
      alerts: alertRows.map((row) => ({
        id: row.id,
        ts: row.ts,
        severity: row.severity,
        title: row.title,
        detail: row.detail,
        confidence: row.confidence,
        geo: row.geo,
        ledgerId: row.ledgerId,
        resolved: row.resolved,
        vector: row.vector,
      })),
      wires: wireRows.map((row) => ({
        id: row.id,
        reference: row.reference,
        createdAt: row.createdAt,
        recipientName: row.recipientName,
        recipientEntity: row.recipientEntity,
        iban: row.iban,
        swift: row.swift,
        sourceCurrency: row.sourceCurrency,
        targetCurrency: row.targetCurrency,
        sourceAmount: row.sourceAmount,
        targetAmount: row.targetAmount,
        rate: row.rate,
        fee: row.fee,
        spreadBps: row.spreadBps,
        etaSeconds: row.etaSeconds,
        status: row.status,
        authMethod: row.authMethod,
      })),
      market: marketRows.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        price: row.price,
        change24h: row.change24h,
        series: row.series,
      })),
      recipients: RECIPIENTS,
      history: buildHistory(Date.now(), Math.max(10_000, netWorth), hashSeed(user.id)),
      generatedAt: new Date().toISOString(),
    };

    return Response.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "snapshot failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
