"use client";
import { useEffect, useState } from "react";
type Key = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};
export default function KeyManager() {
  const [keys, setKeys] = useState<Key[]>([]),
    [authenticated, setAuthenticated] = useState(false),
    [label, setLabel] = useState(""),
    [secret, setSecret] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [balance, setBalance] = useState(0);
  async function refresh() {
    const response = await fetch("/api/keys/status", { cache: "no-store" });
    if (!response.ok)
      throw new Error("Account connections could not be loaded.");
    const data = await response.json();
    setAuthenticated(!!data.authenticated);
    setKeys(data.keys ?? []);
    setBalance(data.balance_micro ?? 0);
  }
  useEffect(() => {
    refresh().catch((e) => setMessage(e.message));
  }, []);
  async function action(path: string, body: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/keys/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      if (data.key) {
        setSecret(data.key);
        setLabel("");
      }
      if (path === "logout" || path === "revoke") setSecret("");
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="scaffold">
      <div className="wrap">
        <span className="sec-eyebrow">Your connections</span>
        <h2 className="sec-title">One account. Every agent.</h2>
        {authenticated ? (
          <>
            <p className="sec-sub">
              Available balance: ${(balance / 1000000).toFixed(2)}. Each
              connection has its own key and shares your account’s rate limit
              and credit.
            </p>
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() => void action("logout", {})}
            >
              Sign out of all browser sessions
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action("create", { label });
              }}
              className="hero-cta"
            >
              <label>
                Connection name{" "}
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={80}
                  required
                  placeholder="My trading agent"
                  style={{
                    background: "transparent",
                    color: "inherit",
                    border: "1px solid #444",
                    padding: 12,
                  }}
                />
              </label>
              <button className="btn-primary" disabled={busy || !label.trim()}>
                Create connection
              </button>
            </form>
            {secret && (
              <div className="code">
                <div className="code-bar">
                  Save this key now. It is shown only once.
                </div>
                <pre
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {secret}
                </pre>
                <button className="btn-ghost" onClick={() => setSecret("")}>
                  I saved it
                </button>
              </div>
            )}
            <div className="features">
              {keys.map((key) => (
                <div className="feature" key={key.id}>
                  <h3 className="feature-title">{key.label}</h3>
                  <p className="feature-desc">
                    Last used:{" "}
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleString()
                      : "Never"}
                  </p>
                  <button
                    className="btn-ghost"
                    disabled={busy}
                    onClick={() => void action("revoke", { id: key.id })}
                  >
                    Revoke this connection
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="sec-sub">
            Sign in above to create and manage named connections. Signing in
            keeps your existing agents connected.
          </p>
        )}
        {message && (
          <p role="status" className="hero-tiny">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
