# 🚀 Quick Start Guide - RAG Chatbot

**Get your chatbot running in 10 minutes!**

---

## ⚡ Super Fast Setup

### 1️⃣ Get API Keys (3 minutes)

**Gemini API:**
```
https://makersuite.google.com/app/apikey
→ Create API Key → Copy
```

**Supabase:**
```
https://supabase.com
→ New Project → Wait 2 min → Settings → API
→ Copy: URL, anon key, service_role key
```

### 2️⃣ Setup Database (2 minutes)

```
Supabase Dashboard → SQL Editor → New Query
→ Copy from supabase-setup.sql → Run
```

### 3️⃣ Configure App (1 minute)

Edit `.env.local`:
```env
GOOGLE_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4️⃣ Install & Run (2 minutes)

```bash
npm install
npm run dev
```

### 5️⃣ Test (2 minutes)

1. Open http://localhost:3000
2. Upload `sample-docs/company-faq.md`
3. Ask: "What services does TechCorp offer?"

---

## 🎯 Common Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)

# Build & Deploy
npm run build            # Build for production
npm start                # Run production build
npm run lint             # Check code quality

# Type checking
npm run type-check       # Verify TypeScript
```

---

## 📂 Key Files

```
.env.local               # ← Add your API keys here
supabase-setup.sql       # ← Run this in Supabase
sample-docs/             # ← Test documents

app/api/chat/route.ts    # RAG chat endpoint
app/api/upload/route.ts  # File upload

components/ChatInterface.tsx   # Main UI
lib/gemini.ts            # AI client
lib/vectorStore.ts       # RAG logic
```

---

## 🐛 Quick Fixes

**"Failed to generate embedding"**
→ Check `GOOGLE_API_KEY` in `.env.local`

**"Failed to store document"**
→ Run `supabase-setup.sql` in Supabase SQL Editor

**"Connection error"**
→ Check all Supabase credentials in `.env.local`

**"Build failed"**
→ Delete `.next` folder and run `npm run build` again

---

## 🚀 Deploy to Vercel (5 minutes)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "RAG Chatbot"
git push

# 2. Go to vercel.com
→ Import Repository
→ Add Environment Variables (same as .env.local)
→ Deploy

# 3. Done! ✨
```

---

## 💡 Test Questions

After uploading `sample-docs/company-faq.md`:

- "What services does TechCorp offer?"
- "How can I contact support?"
- "Where are your offices?"
- "What technologies do you use?"
- "Do you offer training?"

---

## 📚 Full Documentation

- **README.md** - Complete project overview
- **SETUP_GUIDE.md** - Step-by-step instructions
- **ARCHITECTURE.md** - Technical deep dive
- **SUBMISSION_CHECKLIST.md** - Assignment checklist

---

## ✅ Health Check

Run these to verify everything works:

```bash
# 1. Check environment
cat .env.local              # Should have all 4 variables

# 2. Check dependencies
npm list @google/generative-ai
npm list @supabase/supabase-js
npm list ai

# 3. Test build
npm run build               # Should complete without errors

# 4. Check types
npm run type-check          # Should show no errors
```

---

## 🎯 Features Overview

✅ AI Chat with Gemini
✅ RAG (Retrieval-Augmented Generation)
✅ Document Upload (TXT/MD)
✅ Vector Search (Supabase + pgvector)
✅ Streaming Responses
✅ Dark Mode
✅ Chat History
✅ Source Citations
✅ Mobile Responsive

---

## 📞 Need Help?

1. Check **SETUP_GUIDE.md** for detailed steps
2. Review **README.md** troubleshooting section
3. Verify environment variables match `.env.example`
4. Check Supabase dashboard for database errors
5. Look at browser console for client errors

---

**Built with ❤️ using Next.js + Gemini + Supabase**

**Star on GitHub if you like it! ⭐**
