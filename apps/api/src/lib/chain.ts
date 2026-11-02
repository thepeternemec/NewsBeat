/**
 * On-chain readings from public endpoints, no key required.
 *
 * Two kinds of data, both fact-shaped rather than opinion-shaped:
 *
 *  - **Chain state**: block height, base fee, Solana slot. These are what "real-time"
 *    honestly means on a free public RPC — the numbers move every ~12 seconds and
 *    ~400ms, so a short TTL is meaningful rather than decorative.
 *  - **Contract prices**: DefiLlama resolves a token by `chain:address`, which is the
 *    identity that actually exists on chain. A ticker is a label someone chose; a
 *    contract address is the asset. Where the two disagree, the address wins.
 *
 * What this deliberately does not do: read balances, quote swaps, or send anything to a
 * node on a caller's behalf. Those turn a research feed into a wallet, and that is not
 * what this is.
 */

import type { ChainPulse, ContractToken, Sourced, TokenPayload } from "@blacksheep/contracts";
import { upstreamCache } from "./market-cache.js";

const TIMEOUT_MS = 6_000;

export const CHAIN_TTL = {
  /** Ethereum produces a block every ~12s; polling faster than 8s buys nothing. */
  pulse: 8_000,
  /** A price by contract is a sourced quote, not a tick feed. */
  token: 60_000,
} as const;

/** Public endpoints, tried in order. A single free RPC is a single point of failure. */
const ETH_RPCS = ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org"] as const;
const SOL_RPC = "https://api.mainnet-beta.solana.com";

async function rpc<T>(url: string, method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`${new URL(url).host} responded ${response.status}`);
  const body = (await response.json()) as { result?: T; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "rpc error");
  if (body.result === undefined) throw new Error("rpc returned no result");
  return body.result;
}

/** Tries each endpoint until one answers. The first that works wins for this read. */
async function rpcWithFallback<T>(urls: readonly string[], method: string): Promise<T> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      return await rpc<T>(url, method);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("all rpc endpoints failed");
}

const hex = (value: string) => Number.parseInt(value, 16);

export async function chainPulse(): Promise<Sourced<ChainPulse>> {
  const cached = await upstreamCache.read("chain:pulse", CHAIN_TTL.pulse, async () => {
    const observedAt = new Date().toISOString();
    // Both chains are read together but each may fail; a Solana outage must not hide the
    // Ethereum block number.
    const [eth, sol] = await Promise.allSettled([
      (async () => {
        const block = await rpcWithFallback<string>(ETH_RPCS, "eth_blockNumber");
        const gas = await rpcWithFallback<string>(ETH_RPCS, "eth_gasPrice");
        return { block: hex(block), gas_gwei: hex(gas) / 1e9, observed_at: observedAt };
      })(),
      (async () => {
        const slot = await rpcWithFallback<number>([SOL_RPC], "getSlot");
        return { slot, observed_at: observedAt };
      })(),
    ]);

    if (eth.status === "rejected" && sol.status === "rejected") {
      throw eth.reason instanceof Error ? eth.reason : new Error("chain endpoints unavailable");
    }

    return {
      ethereum: eth.status === "fulfilled" ? eth.value : null,
      solana: sol.status === "fulfilled" ? sol.value : null,
    } satisfies ChainPulse;
  });

  const ageSeconds = Math.max(0, Math.round((Date.now() - cached.fetchedAt) / 1000));
  return {
    source: "mixed",
    source_url: "https://ethereum-rpc.publicnode.com",
    fetched_at: new Date(cached.fetchedAt).toISOString(),
    ttl_seconds: Math.round(CHAIN_TTL.pulse / 1000),
    freshness: {
      status: ageSeconds * 1000 > CHAIN_TTL.pulse ? "stale" : "fresh",
      age_seconds: ageSeconds,
      refresh_in_seconds: Math.max(0, Math.round(CHAIN_TTL.pulse / 1000) - ageSeconds),
      upstream_cadence: "a block every ~12s, a Solana slot every ~400ms",
    },
    data: cached.value,
  };
}

interface RawCoins {
  coins: Record<string, { symbol?: string; price?: number; decimals?: number; confidence?: number; timestamp?: number }>;
}

/** Accepts `chain:address` or a bare address, which is assumed to be Ethereum. */
export function normaliseAsset(asset: string): string {
  const trimmed = asset.trim();
  if (trimmed.includes(":")) {
    const [chain, address] = trimmed.split(":");
    return `${(chain ?? "").toLowerCase()}:${address ?? ""}`;
  }
  return `ethereum:${trimmed}`;
}

export async function contractToken(asset: string): Promise<Sourced<TokenPayload>> {
  const requested = normaliseAsset(asset);
  const cached = await upstreamCache.read(`chain:token:${requested}`, CHAIN_TTL.token, async () => {
    const body = await fetch(`https://coins.llama.fi/prices/current/${requested}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json", "user-agent": "blacksheep/0.3" },
    });
    if (!body.ok) throw new Error(`coins.llama.fi responded ${body.status}`);
    return (await body.json()) as RawCoins;
  });

  const [chain, address] = requested.split(":");
  const entry = cached.value.coins[requested];
  const token: ContractToken | null =
    entry && typeof entry.price === "number"
      ? {
          asset: requested,
          chain: chain ?? "",
          address: address ?? "",
          symbol: entry.symbol ?? "",
          price_usd: entry.price,
          confidence: entry.confidence ?? 0,
          decimals: entry.decimals ?? 18,
          observed_at: new Date((entry.timestamp ?? Math.floor(cached.fetchedAt / 1000)) * 1000).toISOString(),
        }
      : null;

  const ageSeconds = Math.max(0, Math.round((Date.now() - cached.fetchedAt) / 1000));
  return {
    source: "defillama",
    source_url: `https://defillama.com/token/${requested}`,
    fetched_at: new Date(cached.fetchedAt).toISOString(),
    ttl_seconds: Math.round(CHAIN_TTL.token / 1000),
    freshness: {
      status: ageSeconds * 1000 > CHAIN_TTL.token ? "stale" : "fresh",
      age_seconds: ageSeconds,
      refresh_in_seconds: Math.max(0, Math.round(CHAIN_TTL.token / 1000) - ageSeconds),
      upstream_cadence: "on demand",
    },
    data: { token, requested },
  };
}
