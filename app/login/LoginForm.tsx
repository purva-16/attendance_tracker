"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      router.push(params.get("from") || "/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-5">
      <form
        onSubmit={handleSubmit}
        className="margin-rule w-full max-w-sm bg-paper/50 border border-line pl-12 pr-5 py-7 sm:pl-20 sm:pr-6 sm:py-8"
      >
        <p className="text-red text-xs tracking-[0.2em] uppercase mb-2">
          Roll Call
        </p>
        <h1 className="font-display text-3xl font-semibold text-ink mb-1">
          Sign In
        </h1>
        <p className="text-sm text-inkSoft mb-6">
          Enter your details to open the ledger.
        </p>

        <label className="block text-xs uppercase tracking-wide text-inkSoft mb-1">
          Username
        </label>
        <input
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 bg-transparent border border-line px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-red/40"
        />

        <label className="block text-xs uppercase tracking-wide text-inkSoft mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-2 bg-transparent border border-line px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-red/40"
        />

        {error && (
          <p className="text-red text-xs mt-2 mb-2" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="stamp mt-4 w-full border-2 border-ink text-ink font-bold uppercase tracking-widest text-sm py-3 active:bg-ink active:text-paper sm:hover:bg-ink sm:hover:text-paper transition-colors disabled:opacity-50"
        >
          {loading ? "Checking…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
