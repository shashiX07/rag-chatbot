-- RAG Chatbot - Supabase Database Setup
-- Run this script in your Supabase SQL Editor

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table to store text chunks with embeddings
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(768),  -- Gemini embeddings are 768 dimensions
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster similarity search using IVFFlat algorithm
-- This dramatically improves query performance for vector similarity
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
-- NOTE: In production, you should restrict this based on your auth requirements
CREATE POLICY "Allow all operations on documents" 
ON documents
FOR ALL
USING (true)
WITH CHECK (true);

-- Optional: Create a function to search for similar documents
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

-- ============================================
-- AUTO-CLEANUP: Delete documents older than 30 minutes
-- ============================================

-- Function to clean up old documents
CREATE OR REPLACE FUNCTION cleanup_old_documents()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM documents
  WHERE created_at < NOW() - INTERVAL '30 minutes';
END;
$$;

-- Create a scheduled job to run cleanup every 5 minutes
-- Note: This requires pg_cron extension (available in Supabase Pro)
-- For free tier, you can trigger this via an API cron job (Vercel Cron or similar)

-- If you have pg_cron enabled (Pro plan):
-- SELECT cron.schedule('cleanup-old-documents', '*/5 * * * *', 'SELECT cleanup_old_documents();');

-- Alternative: Manual trigger function (call from API)
CREATE OR REPLACE FUNCTION trigger_cleanup()
RETURNS TABLE (deleted_count bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  count_deleted bigint;
BEGIN
  DELETE FROM documents
  WHERE created_at < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS count_deleted = ROW_COUNT;
  RETURN QUERY SELECT count_deleted;
END;
$$;

-- Verify setup
SELECT 'Database setup complete!' AS status;
