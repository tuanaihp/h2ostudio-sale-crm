// Bot V3: Vector Embedding RAG Engine
// Dùng Gemini text-embedding-004 + Supabase pgvector + Gemini synthesis
// Không cần OpenAI — cùng API key với Gemini chat đang có

import { supabase } from '../supabase';

const VECTOR_THRESHOLD = 0.6; // ngưỡng similarity cosine tối thiểu

export interface VectorRagResult {
  text: string;
  matched: boolean;
  score: number;        // 0–1, cosine similarity
  sources: string[];    // FAQ ids được dùng
  synthesized: boolean; // true = Gemini tổng hợp, false = không match
  fallbackToAI: boolean;
}

const FAIL: VectorRagResult = {
  text: '', matched: false, score: 0, sources: [], synthesized: false, fallbackToAI: true,
};

/** Embed một đoạn text qua /api/embed (Gemini text-embedding-004) */
async function embedText(text: string): Promise<number[]> {
  const res = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.substring(0, 2000) }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.embedding || [];
}

/** Tìm FAQ gần nhất trong pgvector via Supabase RPC */
async function searchSimilarFaqs(
  embedding: number[],
  threshold = VECTOR_THRESHOLD,
  topK = 5,
): Promise<Array<{ id: string; question: string; answer: string; category: string; tags: string[]; similarity: number }>> {
  const { data, error } = await (supabase as any).rpc('match_faqs', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
  });
  if (error) return [];
  return data || [];
}

/**
 * Main vector RAG search — Bot V3.
 * Gọi trước, nếu không match (fallbackToAI: true) → caller chuyển xuống V2/Tier2.
 */
export async function vectorRagSearch(params: {
  message: string;
  studioInfo?: string;
  knowledgeContext?: string;
}): Promise<VectorRagResult> {
  const { message, studioInfo, knowledgeContext } = params;

  try {
    // 1. Embed câu hỏi
    const embedding = await embedText(message);
    if (!embedding.length) return FAIL;

    // 2. Tìm FAQs tương đồng nhất
    const similarFaqs = await searchSimilarFaqs(embedding);
    if (!similarFaqs.length) return FAIL;

    const topScore = similarFaqs[0].similarity;

    // 3. Gemini tổng hợp câu trả lời từ top FAQs
    const synthRes = await fetch('/api/vector-synthesis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: message,
        faqs: similarFaqs,
        studioInfo,
        knowledgeContext,
      }),
    });
    if (!synthRes.ok) return FAIL;

    const { text } = await synthRes.json();
    if (!text?.trim()) return FAIL;

    return {
      text: text.trim(),
      matched: true,
      score: topScore,
      sources: similarFaqs.map(f => f.id),
      synthesized: true,
      fallbackToAI: false,
    };
  } catch {
    return FAIL;
  }
}
