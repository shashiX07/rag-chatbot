-- FIX: Update vector dimension from 3 to 768
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the existing table (this will delete all data)
DROP TABLE IF EXISTS documents CASCADE;

-- Step 2: Recreate the table with correct dimensions
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(768),  -- Correct dimension for embeddings
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Recreate the index
CREATE INDEX documents_embedding_idx 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 4: Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Step 5: Recreate policy
CREATE POLICY "Allow all operations on documents" 
ON documents
FOR ALL
USING (true)
WITH CHECK (true);

-- Step 6: Recreate search function with correct dimensions
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Verify
SELECT 'Database fixed! Vector dimension is now 768.' AS status;
