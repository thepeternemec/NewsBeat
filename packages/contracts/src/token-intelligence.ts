export const TOKEN_CHAINS = {
  solana: { label: "Solana", explorer: "https://solscan.io/token/" },
  ethereum: { label: "Ethereum", explorer: "https://etherscan.io/token/" },
  base: { label: "Base", explorer: "https://basescan.org/token/" },
  arbitrum: { label: "Arbitrum", explorer: "https://arbiscan.io/token/" },
} as const;

export type TokenChain = keyof typeof TOKEN_CHAINS;

export const TOKEN_ADDRESS_ERROR = "Choose Solana, Ethereum, Base or Arbitrum and enter a complete contract address.";

export function parseTokenAsset(asset: string): { chain: TokenChain; address: string } | null {
  const [chain, address, extra] = asset.trim().split(":");
  if (extra !== undefined || !chain || !address || !Object.hasOwn(TOKEN_CHAINS, chain)) return null;
  if (chain === "solana") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) ? { chain, address } : null;
  if (!/^0x[0-9a-f]{40}$/i.test(address)) return null;
  return { chain: chain as TokenChain, address: address.toLowerCase() };
}

interface TokenizedEquity {
  symbol: string;
  name: string;
  ticker: string;
  isin: string;
  addresses: Record<"solana" | "ethereum" | "arbitrum", string>;
}

/** Native deployments from the xStocks issuer registry, checked 2026-11-11. */
export const TOKENIZED_EQUITIES: readonly TokenizedEquity[] = [
  {
    symbol: "NVDAx", name: "NVIDIA xStock", ticker: "NVDA", isin: "CH1436219195",
    addresses: { solana: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
      ethereum: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d", arbitrum: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d" },
  },
  {
    symbol: "AAPLx", name: "Apple xStock", ticker: "AAPL", isin: "CH1436219187",
    addresses: { solana: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
      ethereum: "0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a", arbitrum: "0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a" },
  },
  {
    symbol: "HOODx", name: "Robinhood xStock", ticker: "HOOD", isin: "CH1436219666",
    addresses: { solana: "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg",
      ethereum: "0xe1385fdd5ffb10081cd52c56584f25efa9084015", arbitrum: "0xe1385fdd5ffb10081cd52c56584f25efa9084015" },
  },
];

export interface TokenPool {
  id: string;
  dex: string;
  quote_symbol: string;
  price_usd: number | null;
  liquidity_usd: number | null;
  volume_24h_usd: number | null;
  change_24h_pct: number | null;
  url: string;
}

export interface TokenIntelligence {
  asset: { chain: TokenChain; address: string; explorer_url: string; name: string | null; symbol: string | null };
  registry: { issuer: string; isin: string; ticker: string; source_url: string; checked_on: string } | null;
  market: {
    status: "fresh" | "stale" | "no_pools" | "unavailable";
    source: string;
    source_url: string;
    fetched_at: string | null;
    matching_pools: number;
    pools: TokenPool[];
  };
  underlying_news: {
    status: "fresh" | "stale" | "unavailable";
    last_success_at: string | null;
    beat_id: string;
    items: { title: string; url: string; source: string; published_at: string }[];
  } | null;
  limitations: string[];
}
