# 🚨 DATABASE SETUP REQUIRED

## Error: Table 'public.documents' not found

Your Supabase database hasn't been set up yet. You need to create the documents table.

## Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Setup Script
1. Open the file: `supabase-setup.sql` (in your project root)
2. **Copy ALL the SQL code** from that file
3. **Paste it** into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify
You should see: ✅ `Database setup complete!`

### What This Creates:
- ✅ `documents` table - Stores your PDF content chunks
- ✅ `embedding` column - Vector embeddings for similarity search
- ✅ Indexes - For fast searching
- ✅ `match_documents()` function - For RAG queries

## After Running the SQL:

Your app will work! Try uploading your PDF again.

---

## Alternative: Copy-Paste Ready SQL

If you can't find the file, here's the complete SQL:

\`\`\`sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on documents" 
ON documents
FOR ALL
USING (true)
WITH CHECK (true);

-- Create search function
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
\`\`\`

---

## ⚠️ IMPORTANT
Run this SQL script in Supabase **BEFORE** uploading any documents!
