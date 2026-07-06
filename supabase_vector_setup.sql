-- ============================================================
-- Bot V3: Vector Embedding Setup (chạy trong Supabase Dashboard)
-- SQL Editor → paste toàn bộ file này → Run
-- ============================================================

-- 1. Bật extension pgvector (chỉ cần chạy 1 lần)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Thêm cột embedding vào customer_faqs (vector 768 chiều — Gemini text-embedding-004)
ALTER TABLE customer_faqs ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Index tìm kiếm nhanh (IVFFlat — tốt cho < 1 triệu FAQ)
CREATE INDEX IF NOT EXISTS customer_faqs_embedding_idx
  ON customer_faqs USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- 4. Hàm tìm FAQ tương đồng nhất (gọi từ client qua supabase.rpc)
CREATE OR REPLACE FUNCTION match_faqs(
  query_embedding vector(768),
  match_threshold  float DEFAULT 0.6,
  match_count      int   DEFAULT 5
)
RETURNS TABLE (
  id         uuid,
  question   text,
  answer     text,
  category   text,
  tags       text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id,
    cf.question,
    cf.answer,
    cf.category,
    cf.tags,
    1 - (cf.embedding <=> query_embedding) AS similarity
  FROM customer_faqs cf
  WHERE cf.is_approved = true
    AND cf.answer IS NOT NULL
    AND length(cf.answer) > 10
    AND cf.embedding IS NOT NULL
    AND 1 - (cf.embedding <=> query_embedding) > match_threshold
  ORDER BY cf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Xong! Quay lại Admin → Bot V3 → Xây lại Embedding để embed toàn bộ FAQ.
