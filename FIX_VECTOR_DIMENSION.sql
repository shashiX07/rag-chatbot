-- Run this script in your Supabase SQL Editor to fix the dimension mismatch error

-- 1. Drop the existing index (pgvector's ivfflat only supports up to 2000 dimensions)
-- We will rely on exact nearest neighbor search which works perfectly for 3072 dimensions
DROP INDEX IF EXISTS documents_embedding_idx;

-- 2. Drop the function if it depends on the old vector type
DROP FUNCTION IF EXISTS match_documents(vector(768), float, int);
DROP FUNCTION IF EXISTS match_documents(vector(3072), float, int);

-- 3. Alter the table column to the correct dimension (3072 for gemini-embedding-2)
-- Since we cannot easily cast vectors of different dimensions, we must recreate the column or cast it to text and back if possible, 
-- but the safest approach is to clear out old data since old embeddings are useless if they have the wrong dimensions.
TRUNCATE TABLE documents; -- Clears out the old incompatible 768-dimension rows

-- Now alter the column
ALTER TABLE documents 
ALTER COLUMN embedding TYPE vector(3072);

-- Note: We DO NOT recreate the index. Pgvector handles vectors > 2000 dims efficiently 
-- via exact nearest neighbor search (sequential scan).

-- 4. Recreate the match_documents function for the new dimension
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(3072),
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

SELECT 'Vector dimension successfully updated to 3072!' as status;
