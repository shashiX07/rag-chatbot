# Embedding Fallback System

## Overview
Your RAG chatbot now includes an automatic fallback embedding system to handle API quota limitations.

## How It Works

### Primary Method: Gemini Embeddings
- Uses Google's `text-embedding-004` model
- High-quality semantic embeddings
- Requires API quota

### Fallback Method: Simple Hash-Based Embeddings
- Automatically activates when Gemini quota is exceeded
- Creates deterministic 768-dimensional vectors
- Based on word position and character frequencies
- Not as semantically rich, but functional for basic RAG

## When Fallback Activates

The system automatically switches to fallback embeddings when:
1. Gemini API quota is exceeded (429 error)
2. Any other API error occurs
3. You'll see a warning: `⚠️  Gemini quota exceeded. Using fallback embedding method.`

## Performance Comparison

### Gemini Embeddings (Primary)
- ✅ High semantic accuracy
- ✅ Better context understanding
- ✅ Superior for complex queries
- ❌ Limited by API quota
- ❌ Requires internet connection

### Fallback Embeddings
- ✅ No API quota needed
- ✅ Works offline
- ✅ Fast and deterministic
- ✅ Better than no embeddings
- ❌ Less semantically accurate
- ❌ Basic keyword matching

## How to Restore Full Functionality

### Option 1: Wait for Quota Reset
- Free tier quotas reset daily
- Check your usage: https://ai.dev/usage?tab=rate-limit

### Option 2: Upgrade API Plan
- Visit: https://ai.google.dev/gemini-api/docs/rate-limits
- Consider paid tier for production use

### Option 3: Use Alternative Embedding Service
You can modify `lib/gemini.ts` to use:
- OpenAI embeddings
- Cohere embeddings
- HuggingFace embeddings
- Local embedding models (transformers.js)

## Current Status

Your chatbot will continue to work with the fallback system. The accuracy might be slightly reduced, but basic RAG functionality remains operational.

## Recommendations

1. **For Testing**: Fallback embeddings are sufficient
2. **For Production**: 
   - Upgrade to paid Gemini API tier
   - Or implement a better local embedding solution
   - Or use a different embedding service

## Monitoring

Watch your console for these messages:
- `⚠️  Gemini quota exceeded. Using fallback embedding method.`
- `⚠️  Using fallback embedding method due to error.`

These indicate the fallback is active.
