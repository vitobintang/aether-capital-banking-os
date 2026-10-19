import { db } from "@/db";
import { cards } from "@/db/schema";
import { readSessionToken, resolveSession } from "@/lib/auth";
import type { CardFinish, CardNetwork, PaymentCard } from "@/lib/types";
import { clamp, createId } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface CreateBurnerBody {
  label?: string;
  network?: CardNetwork;
  finish?: CardFinish;
  dailyOnlineLimit?: number;
  ttlMinutes?: number;
  funding?: number;
}

function randomDigits(count: number): string {
  let out = "";
  for (let i = 0; i < count; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

export function toCard(row: typeof cards.$inferSelect): PaymentCard {
  return {
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
  };
}

/** Mints a single-use virtual (burner) card owned by the signed-in user. */
export async function POST(request: Request): Promise<Response> {
  const user = await resolveSession(readSessionToken(request));
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as CreateBurnerBody;

  const ttlMinutes = clamp(Math.round(body.ttlMinutes ?? 30), 1, 1440);
  const limit = clamp(Math.round(body.dailyOnlineLimit ?? 2_500), 50, 250_000);
  const funding = clamp(Number(body.funding ?? 5_000), 0, 1_000_000);
  const now = new Date();
  const expiry = new Date(now.getTime() + ttlMinutes * 60_000);

  const [created] = await db
    .insert(cards)
    .values({
      id: createId("card_burner"),
      ownerId: user.id,
      label:
        body.label?.trim() ||
        `Burner · ${expiry.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      holder: `${user.displayName.toUpperCase().slice(0, 18)} // BURNER`,
      network: body.network === "MASTERCARD" ? "MASTERCARD" : "VISA",
      last4: randomDigits(4),
      expiryMonth: expiry.getMonth() + 1,
      expiryYear: expiry.getFullYear(),
      cvv: randomDigits(3),
      finish:
        body.finish === "holographic"
          ? "holographic"
          : body.finish === "titanium"
            ? "titanium"
            : "frosted",
      isVirtual: true,
      balance: funding,
      spend30d: 0,
      controls: {
        frozen: false,
        onlineEnabled: true,
        internationalEnabled: false,
        contactlessEnabled: false,
        atmEnabled: false,
        dailyOnlineLimit: limit,
        dailyAtmLimit: 0,
      },
      expiresInSeconds: ttlMinutes * 60,
      createdAt: now.toISOString(),
    })
    .returning();

  if (!created) return Response.json({ error: "mint failed" }, { status: 500 });

  return Response.json({ card: toCard(created) }, { status: 201 });
}
