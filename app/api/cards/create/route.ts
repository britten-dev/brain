import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

function supabaseServer() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const { title, topics, answer, confidence } = await req.json();

  if (!title || !answer) {
    return Response.json({ error: "Title and answer are required." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const sb = supabaseServer();

  // Embed the card answer (you can also include title/topics, but keep it simple for now)
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: answer,
  });

  const embedding = emb.data[0].embedding;

  const { data, error } = await sb
    .from("knowledge_cards")
    .insert([
      {
        title,
        topics: topics ?? [],
        answer,
        confidence: typeof confidence === "number" ? confidence : 0.9,
        source: { added_via: "admin_ui", added_at: new Date().toISOString() },
        embedding,
      },
    ])
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, id: data.id });
}
