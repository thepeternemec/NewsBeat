/**
 * What an account has left, and spending it.
 *
 * The ledger and the balance answer different questions. The ledger is history —
 * every call, what it cost, what the balance was afterwards — so a dispute is
 * answerable without replaying anything. The balance is the fast answer to "can
 * this account afford one more call", and it would be a `sum()` over the ledger on
 * every request if it were derived.
 *
 * So both, written in **one transaction**, which is the only part that matters: a
 * balance that drifts from its ledger is a billing bug, and a billing bug found by
 * a customer is the expensive kind.
 */
import type { Sql, TransactionSql } from "postgres";
import { TRIAL_MICRO } from "./billing.js";

export { TRIAL_MICRO };
/** Micro-dollars. 1,000,000 = $1. */
export const TOPUP_MIN_MICRO = 6_000_000; // $6 = 30 days, the smallest published plan
export const TRIAL_DAYS = 7;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
const TRIAL_START_ROUTE = "__trial_start__";

export function trialWindow(startedAt: Date | null, now = new Date()) {
  const expiresAt = startedAt ? new Date(startedAt.getTime() + TRIAL_MS) : null;
  return { startedAt, expiresAt, expired: expiresAt !== null && now >= expiresAt };
}

/** A zero-cost ledger marker records the first metered call for the account.
 * Key rotation does not change this date, and old usage is not retroactively timed. */
export async function trialFor(sql: Sql | TransactionSql, accountId: string, now = new Date()) {
  const rows = await sql<Array<{ created_at: Date }>>`
    select created_at from public.usage_ledger
    where account_id = ${accountId} and route = ${TRIAL_START_ROUTE}
    order by created_at asc limit 1`;
  return trialWindow(rows[0] ? new Date(rows[0].created_at) : null, now);
}

export interface Balance {
  /** Spendable now. */
  availableMicro: number;
  /** Trial credits remaining; spent before anything topped up. */
  creditsMicro: number;
  /** Money added, remaining. */
  toppedUpMicro: number;
}

const ZERO: Balance = { availableMicro: 0, creditsMicro: 0, toppedUpMicro: 0 };

export async function balanceFor(sql: Sql, accountId: string): Promise<Balance> {
  const rows = await sql<Array<{ credits_micro: string | number; topped_up_micro: string | number }>>`
    select credits_micro, topped_up_micro from public.account_balance where account_id = ${accountId}`;
  const row = rows[0];
  if (!row) return ZERO;
  const credits = Number(row.credits_micro);
  const toppedUp = Number(row.topped_up_micro);
  return { availableMicro: credits + toppedUp, creditsMicro: credits, toppedUpMicro: toppedUp };
}

/**
 * Charge an account, and record it.
 *
 * Returns the balance after the call. Trial credits are spent first — the customer
 * paid for the topped-up part, so burning the grant before the money is the only
 * order that cannot be argued with.
 *
 * Atomic: the decrement and the ledger row are in one transaction. Two concurrent
 * requests cannot both read the same balance and both spend it.
 */
export async function spend(
  sql: Sql,
  row: { accountId: string; keyHash: string | null; route: string; beatId: string | null; costMicro: number },
): Promise<{ balance: Balance; charged: number }> {
  return sql.begin(async (tx) => {
    // Lock the row so a concurrent call waits rather than reading the old balance.
    const rows = await tx<Array<{ credits_micro: string | number; topped_up_micro: string | number }>>`
      select credits_micro, topped_up_micro from public.account_balance
      where account_id = ${row.accountId} for update`;
    const current = rows[0];
    if (!current) return { balance: ZERO, charged: 0 };

    // Recheck inside the balance lock: a call crossing the deadline must not
    // draw trial credits even if it passed the middleware a moment earlier.
    const trial = await trialFor(tx, row.accountId);

    const credits = Number(current.credits_micro);
    const toppedUp = Number(current.topped_up_micro);
    const available = (trial.expired ? 0 : credits) + toppedUp;

    // Never charge more than they hold. A balance that can go negative is a debt
    // nobody agreed to, and the refusal is the 402's job, not the ledger's.
    const charged = Math.min(row.costMicro, Math.max(0, available));
    const fromCredits = Math.min(trial.expired ? 0 : credits, charged);
    const fromToppedUp = charged - fromCredits;

    const nextCredits = credits - fromCredits;
    const nextToppedUp = toppedUp - fromToppedUp;
    const after: Balance = {
      availableMicro: (trial.expired ? 0 : nextCredits) + nextToppedUp,
      creditsMicro: nextCredits,
      toppedUpMicro: nextToppedUp,
    };

    if (!trial.startedAt && charged > 0) {
      await tx`insert into public.usage_ledger (account_id, key_hash, route, cost_micro, credits_after)
               values (${row.accountId}, ${row.keyHash}, ${TRIAL_START_ROUTE}, 0, ${available})`;
    }

    await tx`update public.account_balance
             set credits_micro = ${nextCredits}, topped_up_micro = ${nextToppedUp}, updated_at = now()
             where account_id = ${row.accountId}`;

    await tx`insert into public.usage_ledger (account_id, key_hash, route, beat_id, cost_micro, credits_after)
             values (${row.accountId}, ${row.keyHash}, ${row.route}, ${row.beatId}, ${charged}, ${after.availableMicro})`;

    return { balance: after, charged };
  });
}

/** Add to a balance. A grant, a top-up, a refund — the ledger records the effect. */
export async function grant(
  sql: Sql,
  accountId: string,
  micro: number,
  kind: "credits" | "topup" = "credits",
): Promise<Balance> {
  if (!Number.isInteger(micro) || micro <= 0) throw new Error("grant must be a positive integer of micro-dollars");
  const column = kind === "topup" ? "topped_up_micro" : "credits_micro";
  await sql`
    insert into public.account_balance (account_id, credits_micro, topped_up_micro)
    values (${accountId},
            ${kind === "credits" ? micro : 0},
            ${kind === "topup" ? micro : 0})
    on conflict (account_id) do update
      set ${sql(column)} = public.account_balance.${sql(column)} + ${micro},
          updated_at = now()`;
  return balanceFor(sql, accountId);
}

/** Create the balance row for a new account, with the trial grant. */
export async function openBalance(sql: Sql, accountId: string): Promise<Balance> {
  await sql`
    insert into public.account_balance (account_id, credits_micro)
    values (${accountId}, ${TRIAL_MICRO})
    on conflict (account_id) do nothing`;
  return balanceFor(sql, accountId);
}
