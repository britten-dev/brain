import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { isPublicModeServer } from "@/src/lib/publicMode";

const HARD_MIN_SIM = 0.25;
const SOFT_MIN_SIM = 0.25;
const ERR_MSG = "I'm so sorry — something went wrong on my side while looking that up.";

function retrievalConfidence(topSim: number) {
  if (topSim >= 0.30) return "high" as const;
  if (topSim >= SOFT_MIN_SIM) return "medium" as const;
  return "low" as const;
}

function fallbackMessage(question: string): string {
  const q = question.toLowerCase();
  if (/\b(returns?|returning|refund|exchange)\b/.test(q)) {
    return "I’d love to help with that — I just need a couple of details. Which country are you in, and did you order via our website or Etsy?";
  }
  if (/\b(shipping|delivery|dispatch|tracking)\b/.test(q)) {
    return "I’d be happy to look into that for you. Which country are you in, and do you have an order number?";
  }
  return "I don’t have that in my knowledge base yet, but I’d like to. Could you tell me a little more about what you’re trying to find out?";
}

function supabaseServer() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const { question } = await req.json();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const sb = supabaseServer();

  // 1) embed the question
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });
  const queryEmbedding = emb.data[0].embedding;

  // 2) retrieve top-k cards via your RPC
  const { data: matches, error } = await sb.rpc("match_knowledge_cards", {
    query_embedding: queryEmbedding,
    match_threshold: HARD_MIN_SIM,
    match_count: 5,
  });

  if (error) {
    const errBody = isPublicModeServer()
      ? { answer: ERR_MSG }
      : { answer: ERR_MSG, confidence: "low", debug: { cards: [] } };
    return Response.json(errBody, { status: 500 });
  }

  const cards = (matches ?? []).map((m: any) => ({
    id: m.id,
    title: m.title,
    topics: m.topics,
    confidence: m.confidence,
    answer: m.answer,
    source: m.source,
    similarity: m.similarity,
  }));

  const topSim = cards[0]?.similarity ?? 0;
  const conf = retrievalConfidence(topSim);

  // 3) if retrieval is weak or no cards, return Sarah-style fallback
  if (!cards.length || topSim < HARD_MIN_SIM) {
    const body = isPublicModeServer()
      ? { answer: fallbackMessage(question) }
      : { answer: fallbackMessage(question), confidence: "low", debug: { cards: [] } };
    return Response.json(body);
  }

  // 4) generate an answer strictly grounded in the cards
  const system = `
You are “Sarah” from Britten Weddings, replying to brides in a calm, warm, empathetic tone. No emojis.

CRITICAL GROUNDING:
- Use ONLY facts found in the Knowledge Base context provided.
- Do not invent policies or fill gaps.
- If info is missing or conditional (e.g., depends on country or whether order was via Etsy vs website), ask ONE short clarifying question instead of guessing.
- If the KB does not cover it, say so clearly.

FORMAT:
- 1 short reassuring opener.
- 3–8 short sentences, plain English.
- End with a gentle next-step question if needed.
`.trim();

  const kbContext = cards
    .map(
      (c, i) => `Card ${i + 1}
id: ${c.id}
title: ${c.title}
topics: ${JSON.stringify(c.topics)}
card_confidence: ${c.confidence}
similarity: ${c.similarity}
answer: ${c.answer}
`
    )
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "system", content: `KNOWLEDGE BASE CONTEXT:\n${kbContext}` },
      { role: "user", content: `Customer question:\n${question}` },
    ],
  });

  const answer =
    completion.choices[0]?.message?.content?.trim() ||
    "I’m so sorry — I’m not able to answer that right now.";

  const body = isPublicModeServer()
    ? { answer }
    : {
        answer,
        confidence: conf,
        debug: {
          cards: cards.map((c) => ({ id: c.id, title: c.title, similarity: c.similarity })),
        },
      };
  return Response.json(body);
}
