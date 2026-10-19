import { randomUUID } from "node:crypto";
import type { Sql } from "./client.js";
export class InsufficientBalance extends Error {}
/** Reserve before work. Row locks serialize concurrent callers across transports. */
export async function reserveUsage(
  sql: Sql,
  accountId: string,
  keyHash: string | null,
  operation: string,
  maximum: number,
) {
  if (!Number.isSafeInteger(maximum) || maximum < 0)
    throw new Error("Invalid reservation");
  const id = randomUUID();
  await sql.begin(async (tx) => {
    await tx`insert into account_balance(account_id) select account_id from accounts where account_id=${accountId} on conflict do nothing`;
    const [row] =
      await tx`select credits_micro, topped_up_micro from account_balance where account_id=${accountId} for update`;
    const [held] =
      await tx`select coalesce(sum(maximum_micro),0)::text as amount from usage_reservations where account_id=${accountId} and settled_at is null`;
    if (
      !row ||
      Number(row.credits_micro) +
        Number(row.topped_up_micro) -
        Number(held?.amount ?? 0) <
        maximum
    )
      throw new InsufficientBalance("Insufficient available balance");
    await tx`insert into usage_reservations(id,account_id,key_hash,operation,maximum_micro) values (${id},${accountId},${keyHash},${operation},${maximum})`;
  });
  return id;
}
/** A repeated settlement is a no-op. Zero releases failed work without charging it. */
export async function settleUsage(sql: Sql, id: string, cost: number) {
  return sql.begin(async (tx) => {
    const [ref] =
      await tx`select account_id from usage_reservations where id=${id}`;
    if (!ref) throw new Error("Reservation not found");
    const [balance] =
      await tx`select credits_micro,topped_up_micro from account_balance where account_id=${ref.account_id} for update`;
    const [row] =
      await tx`select * from usage_reservations where id=${id} for update`;
    if (!row || !balance) throw new Error("Reservation not found");
    if (row.settled_at) return Number(row.charged_micro);
    if (
      !Number.isSafeInteger(cost) ||
      cost < 0 ||
      cost > Number(row.maximum_micro)
    )
      throw new Error("Invalid settlement");
    const credits = Number(balance.credits_micro),
      topped = Number(balance.topped_up_micro);
    if (credits + topped < cost) throw new Error("Balance invariant failed");
    const fromCredits = Math.min(credits, cost);
    await tx`update account_balance set credits_micro=${credits - fromCredits}, topped_up_micro=${topped - (cost - fromCredits)},updated_at=now() where account_id=${ref.account_id}`;
    await tx`insert into usage_ledger(account_id,key_hash,route,cost_micro,credits_after) values (${ref.account_id},${row.key_hash},${row.operation},${cost},${credits + topped - cost})`;
    await tx`update usage_reservations set settled_at=now(),charged_micro=${cost} where id=${id}`;
    return cost;
  });
}
/** Crashed requests never retain credit indefinitely. Called by maintenance after 15 min. */
export async function releaseAbandonedUsage(sql: Sql) {
  const rows =
    await sql`select id from usage_reservations where settled_at is null and created_at < now()-interval '15 minutes' limit 100`;
  for (const row of rows) await settleUsage(sql, row.id, 0);
  return rows.length;
}
