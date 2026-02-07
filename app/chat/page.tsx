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
    <div className={`min-h-screen grid gap-8 p-12 ${showDebugUI ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
      <div className={`bw-box flex flex-col ${showDebugUI ? "lg:col-span-2" : ""}`}>
        <div className="p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-xl font-semibold">Britten Weddings — Test Chat</h1>
            {!publicMode && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDebug}
                  onChange={(e) => toggleShowDebug(e.target.checked)}
                  className="bw-input"
                />
                Show debug
              </label>
            )}
          </div>
          {showDebugUI && (
            <div className="flex items-center gap-6 mt-3">
              <p className="text-sm text-gray-600">
                Confidence: <span className="font-medium">{confidence}</span>
              </p>
              <Link href="/admin/new-card" className="text-sm text-gray-600 hover:opacity-80">
                Add knowledge card
              </Link>
            </div>
          )}
        </div>

        <div className="flex-1 px-6 pb-6 space-y-4 overflow-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "text-right" : "text-left"}
            >
              <div
                className={[
                  "inline-block max-w-[85%] px-4 py-2",
                  m.role === "user"
                    ? "bw-btn"
                    : "bw-box text-black",
                ].join(" ")}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-gray-500">Thinking…</p>}
        </div>

        <div className="p-6 flex gap-3">
          <input
            className="flex-1 bw-input px-3 py-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a test question…"
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            className="bw-btn px-4"
            onClick={send}
          >
            Send
          </button>
        </div>
      </div>

      {showDebugUI && (
        <div className="bw-box p-6">
          <h2 className="text-lg font-semibold">Debug: Retrieved Cards</h2>
          <p className="text-sm text-gray-600 mt-3">
            Top matches used for grounding.
          </p>

          <div className="mt-6 space-y-4">
            {debug.length === 0 ? (
              <p className="text-sm text-gray-500">No cards yet.</p>
            ) : (
              debug.map((c) => (
                <div key={c.id} className="bw-box p-4">
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-gray-600 mt-2">
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
