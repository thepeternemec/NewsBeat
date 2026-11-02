/**
 * A small cache for upstream data we do not control.
 *
 * Three free-tier sources with three different rate limits, and a landing page that can
 * be hit by every visitor at once. The rules this implements:
 *
 *  - **Fresh** values are returned without touching the network.
 *  - **Stale** values are returned immediately while a refresh runs behind the request,
 *    so a slow upstream adds latency to nobody. DefiLlama's chain list is ~2MB and takes
 *    over a second; that second is not one any visitor should wait for twice.
 *  - **Expired** values are refreshed inline, with concurrent callers sharing one
 *    request. Single-flight matters most precisely when the cache is empty and a hundred
 *    people arrive together.
 *
 * A failed refresh keeps serving the last good value and marks it stale, rather than
 * turning a brief upstream blip into an error page — but a failure with nothing cached
 * propagates the real reason, because there is nothing to fall back to, and
 * "cannot read properties of undefined" is not a useful thing to log.
 */

export interface Cached<T> {
  value: T;
  /** Epoch ms when the upstream was last read successfully. */
  fetchedAt: number;
  /** True when we are serving a value past its TTL. */
  stale: boolean;
}

interface Entry<T> {
  value: T;
  fetchedAt: number;
  expiresAt: number;
}

/** How long past its TTL a value may still be served while refreshing. */
const STALE_GRACE_MULTIPLIER = 12;

export class UpstreamCache {
  private entries = new Map<string, Entry<unknown>>();
  private inflight = new Map<string, Promise<void>>();
  private now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /**
   * Read through the cache. `ttlMs` is how long a value is good for; `load` is what to
   * call upstream. `load` throwing is not fatal when we already hold a value.
   */
  /**
   * `options.noStale` refuses to serve a value past its TTL, even inside the grace window.
   * Chain state needs this: Vercel runs several instances, each with its own cache, so a
   * request can land on one holding an older block — and a block number that goes
   * backwards reads as a broken product rather than as instance skew. Waiting ~200ms for
   * a fresh read is better than showing a number that was true a minute ago.
   */
  async read<T>(key: string, ttlMs: number, load: () => Promise<T>, options: { noStale?: boolean } = {}): Promise<Cached<T>> {
    const entry = this.entries.get(key) as Entry<T> | undefined;
    const now = this.now();

    if (entry && now < entry.expiresAt) {
      return { value: entry.value, fetchedAt: entry.fetchedAt, stale: false };
    }

    if (!options.noStale && entry && now < entry.expiresAt + ttlMs * STALE_GRACE_MULTIPLIER) {
      // Serve what we have and refresh behind the response. Errors are absorbed here on
      // purpose: the caller already has a usable value.
      void this.revalidate(key, ttlMs, load, false);
      return { value: entry.value, fetchedAt: entry.fetchedAt, stale: true };
    }

    await this.revalidate(key, ttlMs, load, true);
    const fresh = this.entries.get(key) as Entry<T>;
    return { value: fresh.value, fetchedAt: fresh.fetchedAt, stale: false };
  }

  /** Reads past the TTL. Used by tests, and by a caller debugging a cold cache. */
  async force<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<Cached<T>> {
    await this.revalidate(key, ttlMs, load, true);
    const fresh = this.entries.get(key) as Entry<T>;
    return { value: fresh.value, fetchedAt: fresh.fetchedAt, stale: false };
  }

  /**
   * Runs the loader once per key, however many callers are waiting. `rethrow` decides
   * whether a failure reaches the caller or is absorbed because a cached value exists.
   */
  private revalidate<T>(key: string, ttlMs: number, load: () => Promise<T>, rethrow: boolean): Promise<void> {
    const existing = this.inflight.get(key);
    if (existing) return rethrow ? existing : existing.catch(() => undefined);

    const run = (async () => {
      try {
        const value = await load();
        const now = this.now();
        this.entries.set(key, { value, fetchedAt: now, expiresAt: now + ttlMs });
      } catch (error) {
        const previous = this.entries.get(key);
        if (!previous) throw error;
        // Push the expiry out by one TTL so a broken upstream is not retried on every
        // request while it is down.
        this.entries.set(key, { ...previous, expiresAt: this.now() + ttlMs });
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, run);
    return rethrow ? run : run.catch(() => undefined);
  }
}

/** One process-wide cache; the API is a single Vercel function instance per region. */
export const upstreamCache = new UpstreamCache();
