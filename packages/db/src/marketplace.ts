import { db } from "./client.js";

/** Minimal delivery ledger. Never used to grant paid access or API credits. */
export interface MarketplaceDelivery {
  deliveryId: string;
  event: "ping" | "marketplace_purchase";
  bodyHash: string;
  action: string | null;
  accountId: string | null;
  accountType: string | null;
  planId: string | null;
  previousPlanId: string | null;
  effectiveAt: string | null;
}

export const MARKETPLACE_SCHEMA = `create table if not exists public.newsbeat_marketplace_deliveries (
  delivery_id text primary key,
  event text not null,
  body_hash text not null,
  action text,
  github_account_id text,
  github_account_type text,
  plan_id text,
  previous_plan_id text,
  effective_at timestamptz,
  received_at timestamptz not null default now()
)`;

export type DeliveryResult = "recorded" | "duplicate" | "conflict";
export async function recordMarketplaceDelivery(
  delivery: MarketplaceDelivery,
): Promise<DeliveryResult> {
  const sql = db();
  // Only invoked after signature and payload validation. Additive deployment bootstrap.
  await sql.unsafe(MARKETPLACE_SCHEMA);
  const inserted = await sql`
    insert into public.newsbeat_marketplace_deliveries
      (delivery_id, event, body_hash, action, github_account_id, github_account_type,
       plan_id, previous_plan_id, effective_at)
    values (${delivery.deliveryId}, ${delivery.event}, ${delivery.bodyHash}, ${delivery.action},
      ${delivery.accountId}, ${delivery.accountType}, ${delivery.planId},
      ${delivery.previousPlanId}, ${delivery.effectiveAt})
    on conflict (delivery_id) do nothing returning delivery_id`;
  if (inserted.length) return "recorded";
  // The unique constraint serializes concurrent redeliveries. A conflicting reuse
  // of a delivery ID is not silently accepted as an already processed event.
  const [existing] = await sql<Array<{ body_hash: string; event: string }>>`
    select body_hash, event from public.newsbeat_marketplace_deliveries
    where delivery_id = ${delivery.deliveryId}`;
  return existing?.body_hash === delivery.bodyHash &&
    existing.event === delivery.event
    ? "duplicate"
    : "conflict";
}
