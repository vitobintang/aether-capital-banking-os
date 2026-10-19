import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, ledger, wires } from "@/db/schema";
import { readSessionToken, resolveSession } from "@/lib/auth";
import { buildQuote } from "@/lib/fx";
import type { CurrencyCode, LedgerEntry, WireTransfer } from "@/lib/types";
import { createId, scoreRisk, validateIban, validateSwift } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface WireBody {
  recipientName?: string;
  recipientEntity?: string;
  iban?: string;
  swift?: string;
  sourceCurrency?: CurrencyCode;
  targetCurrency?: CurrencyCode;
  sourceAmount?: number;
  authMethod?: "biometric" | "otp";
}

const VALID: ReadonlySet<string> = new Set(["USD", "EUR", "GBP", "BTC", "ETH"]);

export async function POST(request: Request): Promise<Response> {
  const user = await resolveSession(readSessionToken(request));
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as WireBody;

  const iban = (body.iban ?? "").replace(/\s+/g, "").toUpperCase();
  const swift = (body.swift ?? "").toUpperCase();
  const sourceAmount = Number(body.sourceAmount ?? 0);
  const sourceCurrency = VALID.has(body.sourceCurrency ?? "")
    ? (body.sourceCurrency as CurrencyCode)
    : "USD";
  const targetCurrency = VALID.has(body.targetCurrency ?? "")
    ? (body.targetCurrency as CurrencyCode)
    : "EUR";

  if (!validateIban(iban)) {
    return Response.json({ error: "IBAN failed ISO-13616 mod-97 validation" }, { status: 422 });
  }
  if (!validateSwift(swift)) {
    return Response.json({ error: "SWIFT/BIC must be 8 or 11 characters" }, { status: 422 });
  }
  if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
    return Response.json({ error: "Source amount must be greater than zero" }, { status: 422 });
  }

  const [sourceAccount] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.ownerId, user.id))
    .limit(1);
  if (!sourceAccount) {
    return Response.json({ error: "No funding account provisioned for this user" }, { status: 422 });
  }

  const quote = buildQuote(sourceAmount, sourceCurrency, targetCurrency);
  const now = new Date();
  const reference = `AE-${now.getFullYear()}-${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`;
  const geo = { lat: 48.8566, lng: 2.3522, city: "Paris", country: "France", countryCode: "FR" };
  const risk = scoreRisk({
    amount: sourceAmount,
    ts: now.toISOString(),
    category: "Wire",
    geo,
    channel: "wire",
  });

  const [wireRow] = await db
    .insert(wires)
    .values({
      id: createId("wire"),
      ownerId: user.id,
      reference,
      createdAt: now.toISOString(),
      recipientName: body.recipientName?.trim() || "Unnamed beneficiary",
      recipientEntity: body.recipientEntity?.trim() || "—",
      iban,
      swift,
      sourceCurrency,
      targetCurrency,
      sourceAmount,
      targetAmount: Number(quote.targetAmount.toFixed(6)),
      rate: quote.clientRate,
      fee: quote.fee,
      spreadBps: quote.spreadBps,
      etaSeconds: quote.etaSeconds,
      status: "in_transit",
      authMethod: body.authMethod === "otp" ? "otp" : "biometric",
    })
    .returning();

  if (!wireRow) return Response.json({ error: "wire could not be persisted" }, { status: 500 });

  const [ledgerRow] = await db
    .insert(ledger)
    .values({
      id: createId("led"),
      ownerId: user.id,
      ts: now.toISOString(),
      merchant: `Outbound wire · ${wireRow.recipientEntity}`,
      category: "Wire",
      amount: Number(sourceAmount.toFixed(2)),
      currency: sourceCurrency,
      direction: "debit",
      status: "pending",
      accountId: sourceAccount.id,
      cardId: null,
      channel: "wire",
      geo,
      riskScore: risk.score,
      reference,
    })
    .returning();

  const wire: WireTransfer = {
    id: wireRow.id,
    reference: wireRow.reference,
    createdAt: wireRow.createdAt,
    recipientName: wireRow.recipientName,
    recipientEntity: wireRow.recipientEntity,
    iban: wireRow.iban,
    swift: wireRow.swift,
    sourceCurrency: wireRow.sourceCurrency,
    targetCurrency: wireRow.targetCurrency,
    sourceAmount: wireRow.sourceAmount,
    targetAmount: wireRow.targetAmount,
    rate: wireRow.rate,
    fee: wireRow.fee,
    spreadBps: wireRow.spreadBps,
    etaSeconds: wireRow.etaSeconds,
    status: wireRow.status,
    authMethod: wireRow.authMethod,
  };

  const entry: LedgerEntry | null = ledgerRow
    ? {
        id: ledgerRow.id,
        ts: ledgerRow.ts,
        merchant: ledgerRow.merchant,
        category: ledgerRow.category,
        amount: ledgerRow.amount,
        currency: ledgerRow.currency,
        direction: ledgerRow.direction,
        status: ledgerRow.status,
        accountId: ledgerRow.accountId,
        cardId: ledgerRow.cardId,
        channel: ledgerRow.channel,
        geo: ledgerRow.geo,
        riskScore: ledgerRow.riskScore,
        reference: ledgerRow.reference,
      }
    : null;

  return Response.json({ wire, entry, quote }, { status: 201 });
}
