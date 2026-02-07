"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/chat";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setError("That password doesn’t look right.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-12">
      <div className="w-full max-w-sm bw-box p-8">
        <h1 className="text-xl font-semibold">Britten RAG Test</h1>
        <p className="text-sm text-gray-600 mt-4">
          Enter the shared password to access the test chat.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <input
            className="w-full bw-input px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full bw-btn py-2">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
