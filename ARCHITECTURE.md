# RAG Chatbot - Architecture & Design Document

## 🎯 Project Overview

This document provides a comprehensive overview of the RAG (Retrieval-Augmented Generation) Chatbot architecture, implementation details, and design decisions.

## 📐 System Architecture

### High-Level Architecture

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Next.js Frontend (React)          │
│   - ChatInterface Component         │
│   - FileUpload Component            │
│   - ThemeToggle Component           │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Next.js API Routes                │
│   - /api/chat (RAG Endpoint)        │
│   - /api/upload (Document Ingestion)│
└──────┬──────────────────────────────┘
       │
       ├─────────────────┬─────────────┐
       ▼                 ▼             ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Gemini AI  │  │   Vector     │  │  Supabase    │
│              │  │   Store      │  │  PostgreSQL  │
│ - Chat Model │  │  Operations  │  │  + pgvector  │
│ - Embeddings │  └──────────────┘  └──────────────┘
└──────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 + React | UI framework with App Router |
| Styling | TailwindCSS | Utility-first CSS |
| State | React Hooks + localStorage | Client-side state management |
| AI Model | Google Gemini 1.5 Flash | Text generation |
| Embeddings | Gemini Embedding-001 | Vector representations |
| Vector DB | Supabase + pgvector | Document storage & retrieval |
| Streaming | Vercel AI SDK | Real-time response streaming |
| Language | TypeScript | Type-safe development |

## 🔄 Data Flow

### 1. Document Upload Flow

```
User Uploads File
    ↓
┌───────────────────────────────┐
│ Frontend: FileUpload.tsx      │
│ - Validate file type          │
│ - Create FormData             │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ API: /api/upload              │
│ - Parse file content          │
│ - Extract text                │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ vectorStore: chunkText()      │
│ - Split into 500-char chunks  │
│ - 50-char overlap             │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ gemini: generateEmbedding()   │
│ - Create 768-dim vector       │
│ - For each chunk              │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Supabase: Insert              │
│ - Store chunk + embedding     │
│ - Add metadata                │
└───────────────────────────────┘
```

### 2. Chat Query Flow

```
User Sends Message
    ↓
┌────────────────────────────────┐
│ Frontend: ChatInterface.tsx    │
│ - Add to messages array        │
│ - Call /api/chat               │
└────────────────┬───────────────┘
                 ↓
┌────────────────────────────────┐
│ API: /api/chat                 │
│ - Extract user query           │
└────────────────┬───────────────┘
                 ↓
┌────────────────────────────────┐
│ gemini: generateEmbedding()    │
│ - Create query vector          │
└────────────────┬───────────────┘
                 ↓
┌────────────────────────────────┐
│ vectorStore: retrieve()        │
│ - Fetch all documents          │
│ - Calculate cosine similarity  │
│ - Return top 3                 │
└────────────────┬───────────────┘
                 ↓
┌────────────────────────────────┐
│ Construct Prompt               │
│ - Add system instructions      │
│ - Include retrieved context    │
│ - Format conversation history  │
└────────────────┬───────────────┘
                 ↓
┌────────────────────────────────┐
│ Gemini: Generate Response      │
│ - Stream tokens                │
│ - Use RAG context              │
└────────────────┬───────────────┘
                 ↓
┌────────────────────────────────┐
│ Frontend: Display              │
│ - Stream response in real-time │
│ - Update UI progressively      │
└────────────────────────────────┘
```

## 🧩 Component Architecture

### Frontend Components

#### 1. ChatInterface Component
**Location:** `components/ChatInterface.tsx`

**Responsibilities:**
- Manage chat state (messages array)
- Handle user input
- Call chat API
- Stream responses
- Persist to localStorage

**Key Features:**
- Real-time streaming display
- Auto-scroll to latest message
- Loading states
- Error handling
- Clear chat functionality

#### 2. ChatMessage Component
**Location:** `components/ChatMessage.tsx`

**Responsibilities:**
- Display individual messages
- Format user vs. assistant styles
- Show source citations
- Display timestamps

**Styling:**
- User messages: Blue, right-aligned
- Assistant messages: Gray, left-aligned
- Rounded speech bubbles
- Smooth animations

#### 3. FileUpload Component
**Location:** `components/FileUpload.tsx`

**Responsibilities:**
- File selection UI
- Upload to API
- Progress indication
- Success/error feedback

**Features:**
- Drag-and-drop support (optional)
- File type validation
- Visual feedback
- Accessible design

#### 4. ThemeToggle Component
**Location:** `components/ThemeToggle.tsx`

**Responsibilities:**
- Toggle dark/light mode
- Persist theme choice
- Update document class

**Implementation:**
- Uses localStorage
- Respects system preference
- Smooth transitions

### API Routes

#### 1. Chat Endpoint
**Location:** `app/api/chat/route.ts`

**Input:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant',
    content: string
  }>
}
```

**Process:**
1. Extract last user message
2. Generate query embedding
3. Retrieve relevant documents
4. Construct RAG prompt
5. Stream Gemini response

**Output:**
- Streaming text response
- HTTP 200 with text/plain stream

#### 2. Upload Endpoint
**Location:** `app/api/upload/route.ts`

**Input:**
- `multipart/form-data` with file

**Process:**
1. Validate file type (TXT/MD)
2. Extract text content
3. Chunk into pieces
4. Generate embeddings
5. Store in Supabase

**Output:**
```typescript
{
  success: boolean,
  message: string,
  chunks?: number
}
```

### Library Modules

#### 1. Gemini Client
**Location:** `lib/gemini.ts`

**Functions:**
- `getGeminiModel()` - Get chat model
- `getEmbeddingModel()` - Get embedding model
- `generateEmbedding(text)` - Create 768-dim vector
- `cosineSimilarity(a, b)` - Calculate similarity

**Configuration:**
- Model: `gemini-1.5-flash`
- Embedding: `embedding-001`
- API Key: From environment

#### 2. Vector Store
**Location:** `lib/vectorStore.ts`

**Functions:**
- `chunkText()` - Split text into chunks
- `storeDocument()` - Save with embeddings
- `retrieveRelevantDocuments()` - Semantic search
- `getAllDocuments()` - Fetch all (admin)
- `deleteAllDocuments()` - Clear database (admin)

**Key Parameters:**
- Chunk size: 500 characters
- Overlap: 50 characters
- Top K: 3 documents
- Embedding dimensions: 768

#### 3. Supabase Clients
**Location:** `lib/supabase.ts`, `lib/supabaseAdmin.ts`

**Two Clients:**
1. **Public Client** - Uses anon key, for client-side
2. **Admin Client** - Uses service role, for server-side

**Security:**
- Row Level Security enabled
- Public operations allowed (adjust for production)
- Service key never exposed to client

## 🔐 Security Considerations

### Environment Variables

| Variable | Visibility | Purpose |
|----------|------------|---------|
| `GOOGLE_API_KEY` | Server-only | Gemini API access |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase connection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Read access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Admin access |

### Best Practices

1. **Never expose service keys** - Only use in server components/API routes
2. **Validate inputs** - Check file types, sizes, content
3. **Rate limiting** - Implement for production (currently none)
4. **Authentication** - Add user auth for production deployment
5. **RLS Policies** - Tighten Supabase policies based on users

## 📊 Database Schema

### Documents Table

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Fields:**
- `id` - Unique identifier
- `content` - Text chunk (500 chars)
- `embedding` - 768-dimensional vector
- `metadata` - JSON with filename, chunk_index, etc.
- `created_at` - Timestamp

**Indexes:**
- `ivfflat` on embedding (cosine distance)

**Metadata Structure:**
```json
{
  "filename": "document.txt",
  "chunk_index": 0,
  "total_chunks": 10,
  "created_at": "2025-01-15T10:30:00Z"
}
```

## ⚡ Performance Optimizations

### Current Implementation

1. **Edge Runtime** - Chat API uses Edge for faster cold starts
2. **Streaming** - Immediate response start, better UX
3. **IVFFlat Index** - Fast approximate nearest neighbor search
4. **Client Caching** - localStorage for chat history

### Future Improvements

1. **Redis Caching** - Cache embeddings for common queries
2. **Batch Processing** - Process multiple uploads in parallel
3. **Lazy Loading** - Load chat history on demand
4. **CDN** - Cache static assets
5. **Connection Pooling** - Optimize database connections

## 🧪 Testing Strategy

### Manual Testing Checklist

- [ ] Upload TXT file successfully
- [ ] Upload MD file successfully
- [ ] Reject unsupported file types
- [ ] Ask question and get relevant answer
- [ ] Verify source citations appear
- [ ] Test dark mode toggle
- [ ] Clear chat history
- [ ] Test responsive design
- [ ] Test with long documents
- [ ] Test with multiple documents

### Future Testing

1. **Unit Tests** - Test individual functions
2. **Integration Tests** - Test API routes
3. **E2E Tests** - Test full user flows
4. **Load Tests** - Test concurrent users
5. **Security Tests** - Test for vulnerabilities

## 📈 Monitoring & Analytics

### Recommended Metrics

1. **Usage Metrics**
   - Number of queries per day
   - Number of documents uploaded
   - Average response time
   - Token usage

2. **Quality Metrics**
   - Response accuracy (manual review)
   - User feedback scores
   - Retrieval precision

3. **Performance Metrics**
   - API latency
   - Database query time
   - Embedding generation time
   - Token generation rate

### Tools

- **Vercel Analytics** - Page views, performance
- **Supabase Dashboard** - Database metrics
- **Google AI Studio** - API usage, quotas
- **Custom Logging** - Application-level events

## 🚀 Deployment

### Vercel Configuration

**Environment Variables Required:**
- `GOOGLE_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Build Settings:**
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### Production Checklist

- [ ] Set all environment variables
- [ ] Test build locally (`npm run build`)
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Enable Vercel Analytics
- [ ] Configure error tracking
- [ ] Set up monitoring alerts
- [ ] Add rate limiting
- [ ] Review RLS policies
- [ ] Add authentication

## 🔮 Future Enhancements

### Short Term (1-2 weeks)

1. **PDF Support** - Add proper PDF parsing
2. **Better Chunking** - Semantic chunking algorithm
3. **User Feedback** - Thumbs up/down on responses
4. **Export Chat** - Download conversation history
5. **Keyboard Shortcuts** - Better UX

### Medium Term (1-2 months)

1. **Authentication** - User accounts with Supabase Auth
2. **Multiple Chats** - Save different conversations
3. **Document Management** - View/delete uploaded docs
4. **Advanced Search** - Filter by document, date, etc.
5. **Response Caching** - Speed up common queries

### Long Term (3+ months)

1. **Multi-modal** - Support images, audio
2. **Agent Capabilities** - Function calling, tool use
3. **Collaborative** - Share chats with team
4. **Analytics Dashboard** - Usage insights
5. **Custom Models** - Fine-tune on specific domains

## 📚 References

- [Next.js Documentation](https://nextjs.org/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [pgvector Guide](https://github.com/pgvector/pgvector)
- [RAG Paper](https://arxiv.org/abs/2005.11401)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-12  
**Maintained By:** Development Team
