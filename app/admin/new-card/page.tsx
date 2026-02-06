"use client";

import Link from "next/link";
import { useState } from "react";

export default function NewCardPage() {
  const [title, setTitle] = useState("");
  const [topics, setTopics] = useState("");
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState("0.9");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSaving(true);

    const res = await fetch("/api/cards/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        topics: topics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        answer,
        confidence: Number(confidence),
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setStatus(data?.error || "Something went wrong saving the card.");
      return;
    }

    setStatus(`Saved ✔ Card ID: ${data.id}`);
    setTitle("");
    setTopics("");
    setAnswer("");
    setConfidence("0.9");
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl">
      <Link href="/chat" className="text-sm text-gray-600 hover:text-black">
        ← Back to chat
      </Link>
      <h1 className="text-2xl font-semibold mt-2">Add Knowledge Card</h1>
      <p className="mt-2 text-gray-600">
        Internal tool for adding a reusable policy/answer card.
      </p>

      <form onSubmit={onSave} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Where we’re based"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Topics (comma-separated)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="e.g. location, studio, contact"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Confidence (0–1)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            placeholder="0.9"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Answer</label>
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[180px]"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write the reusable, generalized reply here…"
            required
          />
        </div>

        <button
          className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save card"}
        </button>

        {status && <p className="text-sm mt-2">{status}</p>}
      </form>
    </div>
  );
}
