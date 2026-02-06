"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isPublicModeClient } from "@/src/lib/publicMode";

const STORAGE_KEY = "bw_show_debug";

function getStoredShowDebug(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null || v === "true";
}

type DebugCard = {
  id: string;
  title: string;
  similarity: number;
};

type ChatResponse = {
  answer: string;
  confidence: "high" | "medium" | "low";
  debug: { cards: DebugCard[] };
};

export default function ChatPage() {
  const [showDebug, setShowDebug] = useState(true);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [debug, setDebug] = useState<DebugCard[]>([]);
  const [confidence, setConfidence] =
    useState<ChatResponse["confidence"]>("low");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setShowDebug(getStoredShowDebug());
  }, []);

  function toggleShowDebug(checked: boolean) {
    setShowDebug(checked);
    localStorage.setItem(STORAGE_KEY, String(checked));
  }

  async function send() {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });

    const data: ChatResponse = await res.json();
    setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    if (!isPublicModeClient() && showDebug) {
      setDebug(data.debug?.cards ?? []);
      setConfidence(data.confidence ?? "low");
    }
    setLoading(false);
  }

  const publicMode = isPublicModeClient();
  const showDebugUI = !publicMode && showDebug;

  return (
    <div className={`min-h-screen grid gap-4 p-6 ${showDebugUI ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
      <div className={`rounded-2xl border shadow-sm flex flex-col ${showDebugUI ? "lg:col-span-2" : ""}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-xl font-semibold">Britten Weddings — Test Chat</h1>
            {!publicMode && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDebug}
                  onChange={(e) => toggleShowDebug(e.target.checked)}
                  className="rounded border-gray-400"
                />
                Show debug
              </label>
            )}
          </div>
          {showDebugUI && (
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-gray-600">
                Confidence: <span className="font-medium">{confidence}</span>
              </p>
              <Link href="/admin/new-card" className="text-sm text-gray-600 hover:text-black">
                Add knowledge card
              </Link>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 space-y-3 overflow-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "text-right" : "text-left"}
            >
              <div
                className={[
                  "inline-block max-w-[85%] rounded-2xl px-4 py-2",
                  m.role === "user"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-black",
                ].join(" ")}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-gray-500">Thinking…</p>}
        </div>

        <div className="p-4 border-t flex gap-2">
          <input
            className="flex-1 rounded-xl border px-3 py-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a test question…"
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            className="rounded-xl bg-black text-white px-4"
            onClick={send}
          >
            Send
          </button>
        </div>
      </div>

      {showDebugUI && (
        <div className="rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-semibold">Debug: Retrieved Cards</h2>
          <p className="text-sm text-gray-600 mt-1">
            Top matches used for grounding.
          </p>

          <div className="mt-4 space-y-3">
            {debug.length === 0 ? (
              <p className="text-sm text-gray-500">No cards yet.</p>
            ) : (
              debug.map((c) => (
                <div key={c.id} className="rounded-xl border p-3">
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    similarity: {c.similarity.toFixed(3)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
