#!/usr/bin/env node
/**
 * Add balance to an account.
 *
 *   npm run balance:grant -- <github-login> <dollars> [credits|topup]
 *
 * The operator's lever until Stripe exists. It is also how a support request is
 * answered: refund a bad day, extend a trial, credit a tester. `topup` is money
 * the customer paid; `credits` is the grant, and the two are tracked separately
 * because only one of them is revenue.
 *
 *   npm run balance:grant -- thepeternemec 6 topup
 */
import postgres from "postgres";

const [login, dollars, kind = "credits"] = process.argv.slice(2);
const url = process.env.DATABASE_URL;

if (!url || !login || !dollars) {
  console.error("usage: npm run balance:grant -- <github-login> <dollars> [credits|topup]");
  process.exit(2);
}
if (kind !== "credits" && kind !== "topup") {
  console.error('kind must be "credits" or "topup"');
  process.exit(2);
}

const micro = Math.round(Number(dollars) * 1_000_000);
if (!Number.isFinite(micro) || micro <= 0) {
  console.error("dollars must be a positive number");
  process.exit(2);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  const rows = await sql`select account_id from public.accounts where github_login = ${login} limit 1`;
  if (!rows[0]) {
    console.error(`no account for login "${login}" — they have to sign in once at /keys first`);
    process.exit(1);
  }
  const accountId = rows[0].account_id;
  const column = kind === "topup" ? "topped_up_micro" : "credits_micro";

  await sql`
    insert into public.account_balance (account_id, credits_micro, topped_up_micro)
    values (${accountId}, ${kind === "credits" ? micro : 0}, ${kind === "topup" ? micro : 0})
    on conflict (account_id) do update
      set ${sql(column)} = public.account_balance.${sql(column)} + ${micro},
          updated_at = now()`;

  const [b] = await sql`select credits_micro, topped_up_micro from public.account_balance where account_id = ${accountId}`;
  const credits = Number(b.credits_micro);
  const toppedUp = Number(b.topped_up_micro);
  console.log(
    `  ${login}: +$${(micro / 1e6).toFixed(2)} ${kind} → $${((credits + toppedUp) / 1e6).toFixed(2)} available ($${(credits / 1e6).toFixed(2)} credits, $${(toppedUp / 1e6).toFixed(2)} topped up)`,
  );
} catch (error) {
  console.error("grant failed:", error.message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
