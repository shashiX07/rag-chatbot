# 🚀 RAG Chatbot - Complete Setup Guide

This guide will walk you through setting up the RAG Chatbot from scratch.

## 📝 Step-by-Step Instructions

### Phase 1: Prerequisites (5 minutes)

#### 1. Get Your API Keys

**Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

**Supabase Account:**
1. Go to [Supabase](https://supabase.com)
2. Sign up for a free account
3. Create a new project
   - Give it a name (e.g., "rag-chatbot")
   - Choose a strong database password
   - Select a region close to you
   - Wait 2-3 minutes for setup

### Phase 2: Database Setup (10 minutes)

#### 2. Configure Supabase Database

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of `supabase-setup.sql` and paste it
5. Click **Run** or press `Ctrl+Enter`
6. You should see "Database setup complete!"

#### 3. Get Supabase Credentials

1. In Supabase, go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (under Project API keys)
   - **service_role** key (under Project API keys) - ⚠️ Keep this secret!

### Phase 3: Project Setup (5 minutes)

#### 4. Install Dependencies

```bash
cd rag-chatbot
npm install
```

#### 5. Configure Environment Variables

1. Open `.env.local` in the root directory
2. Replace the placeholder values:

```env
# Gemini API Key
GOOGLE_API_KEY=AIza...your_actual_key...

# Supabase Configuration  
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your_service_role_key...
```

3. Save the file

### Phase 4: Run the Application (2 minutes)

#### 6. Start Development Server

```bash
npm run dev
```

You should see:
```
✓ Starting...
✓ Ready in 2.5s
- Local:        http://localhost:3000
```

#### 7. Open in Browser

Visit [http://localhost:3000](http://localhost:3000)

You should see the RAG Chatbot interface! 🎉

### Phase 5: Test the Application (5 minutes)

#### 8. Upload a Test Document

1. At the bottom of the page, click **"Click to upload document"**
2. Select `sample-docs/company-faq.md`
3. Wait for the success message (should take 10-30 seconds)
4. You should see: "✅ Successfully processed company-faq.md (X chunks created)"

#### 9. Ask Questions

Try these questions:
- "What services does TechCorp offer?"
- "How can I contact support?"
- "Where are your offices located?"
- "Do you provide training?"

The bot should answer using information from the uploaded document!

### Phase 6: Deploy to Vercel (10 minutes)

#### 10. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - RAG Chatbot"
git branch -M main
git remote add origin https://github.com/yourusername/rag-chatbot.git
git push -u origin main
```

#### 11. Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New Project"**
4. Import your `rag-chatbot` repository
5. In **Environment Variables**, add:
   - `GOOGLE_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Click **Deploy**
7. Wait 2-3 minutes
8. Your app is live! 🚀

## 🎯 What You've Built

Congratulations! You now have:

✅ A fully functional RAG chatbot  
✅ Document upload and processing  
✅ Semantic search with vector embeddings  
✅ Streaming AI responses  
✅ Dark mode support  
✅ Persistent chat history  
✅ A deployed production app  

## 📚 Understanding the Code

### How RAG Works

**Document Upload Flow:**
```
User uploads file 
  → Text extraction
  → Chunking (500 chars each)
  → Generate embeddings (768-dim vectors)
  → Store in Supabase with metadata
```

**Chat Query Flow:**
```
User asks question
  → Generate query embedding
  → Find top 3 similar chunks (cosine similarity)
  → Add context to prompt
  → Stream Gemini response
  → Display with sources
```

### Key Files

- **`app/api/chat/route.ts`** - RAG endpoint that retrieves context and streams responses
- **`app/api/upload/route.ts`** - Handles file uploads and chunking
- **`lib/gemini.ts`** - Gemini client and embedding generation
- **`lib/vectorStore.ts`** - Vector operations (store, retrieve, search)
- **`components/ChatInterface.tsx`** - Main chat UI with streaming

## 🔧 Customization Ideas

### 1. Add PDF Support

Install pdf-parse properly:
```bash
npm install pdf-parse @types/pdf-parse
```

### 2. Improve Chunking

Try semantic chunking instead of fixed-size:
- Split by sentences
- Use overlapping windows
- Adjust chunk size based on content

### 3. Add Authentication

Use Supabase Auth:
```bash
npm install @supabase/auth-helpers-nextjs
```

### 4. Add More Data Sources

- Connect to Google Drive
- Scrape websites
- Import from Notion
- Connect to databases

### 5. Improve UI

- Add markdown rendering
- Add code syntax highlighting
- Add image support
- Add voice input

## 🐛 Common Issues

### Issue: "Failed to generate embedding"

**Solution:** 
- Check your Gemini API key is valid
- Ensure you have API quota
- Try a different model if rate limited

### Issue: "Failed to store document"

**Solution:**
- Verify Supabase credentials
- Check the `documents` table exists
- Run the SQL setup script again
- Check Supabase logs for errors

### Issue: "Deployment fails on Vercel"

**Solution:**
- Ensure all environment variables are set
- Check build logs for specific errors
- Make sure dependencies are in `package.json`
- Try clearing cache and redeploying

### Issue: "Chat doesn't retrieve documents"

**Solution:**
- Upload documents first
- Check Supabase table has data:
  ```sql
  SELECT count(*) FROM documents;
  ```
- Check embedding dimensions match (768)
- Verify pgvector extension is enabled

## 📊 Monitoring & Optimization

### Check Supabase Usage

```sql
-- Count documents
SELECT COUNT(*) FROM documents;

-- Check embedding dimensions
SELECT 
  metadata->>'filename' as file,
  COUNT(*) as chunks
FROM documents
GROUP BY metadata->>'filename';

-- Test similarity search
SELECT 
  content,
  metadata,
  1 - (embedding <=> '[your_test_vector]') as similarity
FROM documents
ORDER BY embedding <=> '[your_test_vector]'
LIMIT 5;
```

### Optimize Performance

1. **Chunking:** Smaller chunks = better precision, more API calls
2. **Top K:** More results = better context, slower response
3. **Caching:** Add Redis for frequently asked questions
4. **Rate Limiting:** Add rate limiting to prevent abuse

## 🎓 Learning Resources

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Gemini API Guide](https://ai.google.dev/docs)
- [Supabase Vector Guide](https://supabase.com/docs/guides/ai)
- [RAG Explained](https://www.pinecone.io/learn/retrieval-augmented-generation/)

## 💡 Next Steps

1. **Add more documents** - Build a comprehensive knowledge base
2. **Improve prompts** - Experiment with system prompts
3. **Add analytics** - Track popular questions
4. **Add feedback** - Let users rate responses
5. **Scale up** - Add caching, rate limiting, monitoring

---

**Need Help?** Open an issue on GitHub or check the troubleshooting section in README.md

**Built with ❤️ using Next.js, Gemini, and Supabase**
