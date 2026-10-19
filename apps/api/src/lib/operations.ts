import {
  OperationSchemas,
  operationFromTool,
  type Operation,
} from "@newsgraph/contracts";
import {
  db,
  reserveUsage,
  settleUsage,
  InsufficientBalance,
  PRICE,
} from "@newsgraph/db";
import {
  NewsError,
  topics,
  newsPage,
  brief,
  stories,
  watchMany,
} from "./news.js";
import { searchNews, getStory } from "./search.js";
export interface Principal {
  accountId: string | null;
  keyHash: string | null;
  kind: "anonymous" | "key" | "oauth";
  scopes: string[];
}
export const ANONYMOUS: Principal = {
  accountId: null,
  keyHash: null,
  kind: "anonymous",
  scopes: ["news:read"],
};
export function maximumCost(operation: Operation, args: any): number {
  if (operation === "topics") return 0;
  if (operation === "brief") return PRICE.brief;
  return PRICE.checkMoved * (operation === "watch" ? args.watches.length : 1);
}
export function actualCost(operation: Operation, result: any): number {
  if (operation === "topics") return 0;
  if (operation === "brief") return PRICE.brief;
  if (operation === "watch")
    return result.results.reduce(
      (sum: number, row: any) =>
        sum +
        (row.error
          ? 0
          : row.items.length
            ? PRICE.checkMoved
            : PRICE.checkEmpty),
      0,
    );
  if (operation === "story") return PRICE.checkMoved;
  return (operation === "stories" ? result.stories.length : result.items.length)
    ? PRICE.checkMoved
    : PRICE.checkEmpty;
}
export const handlers: Record<Operation, (input: any) => Promise<any>> = {
  topics: (a) => topics(a.query, a.limit, a.offset),
  news: (a) => newsPage(a.beat_id, a.before, !!a.before),
  changes: (a) => newsPage(a.beat_id, a.cursor),
  brief: (a) => brief(a.beat_id, a.cursor, a.history),
  stories: (a) => stories(a.beat_id, a.limit, a.offset, a.page_size),
  watch: (a) =>
    watchMany(a.watches.map((w: any) => ({ ...w, cursor: w.cursor ?? "" }))),
  search: searchNews,
  story: (a) => getStory(a.id),
};
export interface ExecutorDependencies {
  run: typeof handlers;
  reserve: typeof reserveUsage;
  settle: typeof settleUsage;
  database: typeof db;
}
const defaults: ExecutorDependencies = {
  run: handlers,
  reserve: reserveUsage,
  settle: settleUsage,
  database: db,
};
/** One authorization, validation and billing boundary for every transport. */
export async function executeOperation(
  operation: Operation,
  args: unknown,
  principal = ANONYMOUS,
  deps = defaults,
) {
  if (!principal.scopes.includes("news:read"))
    throw new NewsError(
      "insufficient_scope",
      "news:read permission is required.",
      403,
    );
  const parsed = OperationSchemas[operation].safeParse(args);
  if (!parsed.success)
    throw new NewsError(
      "invalid_request",
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
      400,
    );
  const max = maximumCost(operation, parsed.data);
  let reservation: string | undefined;
  if (principal.accountId && max) {
    try {
      reservation = await deps.reserve(
        deps.database(),
        principal.accountId,
        principal.keyHash,
        operation,
        max,
      );
    } catch (error) {
      if (error instanceof InsufficientBalance)
        throw new NewsError(
          "payment_required",
          "Not enough available credit for this operation. Add credit in your account.",
          402,
        );
      throw new NewsError(
        "billing_unavailable",
        "Billing is temporarily unavailable. No operation was started.",
        503,
      );
    }
  }
  try {
    const result = await deps.run[operation](parsed.data);
    const cost = actualCost(operation, result);
    if (reservation) await deps.settle(deps.database(), reservation, cost);
    return {
      ...result,
      usage: {
        operation,
        cost_micro: principal.accountId ? cost : 0,
        currency: "USD",
        receipt_id: reservation ?? null,
        tier: principal.kind,
      },
    };
  } catch (error) {
    if (reservation) {
      try {
        await deps.settle(deps.database(), reservation, 0);
      } catch {
        console.error("Could not release usage reservation", reservation);
      }
    }
    throw error;
  }
}
export async function callNewsTool(
  name: string,
  args: unknown,
  principal = ANONYMOUS,
) {
  const op = operationFromTool(name);
  if (!op) throw new NewsError("unknown_tool", "Unknown news tool.", 404);
  return executeOperation(op, args, principal);
}
