-- Enable the pgvector extension once per database
CREATE EXTENSION IF NOT EXISTS vector;

-- Add a vector column alongside your existing float[] embedding
-- (keeping the float[] means your app still works even if vector is absent)
ALTER TABLE "AdviceLog"
  ADD COLUMN IF NOT EXISTS "embedding_vec" vector(1536);

-- ANN index (cosine). Adjust lists based on data size (10–10_000).
CREATE INDEX IF NOT EXISTS "advice_embedding_vec_cos_idx"
  ON "AdviceLog" USING ivfflat ("embedding_vec" vector_cosine_ops) WITH (lists = 100);

-- If your Neon org supports HNSW and you prefer it, use this instead of ivfflat:
-- CREATE INDEX IF NOT EXISTS "advice_embedding_vec_hnsw_idx"
--   ON "AdviceLog" USING hnsw ("embedding_vec" vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);

