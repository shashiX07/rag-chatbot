import { NextRequest } from 'next/server';
import { retrieveRelevantDocuments } from '@/lib/vectorStore';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const runtime = 'edge';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 });
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // Retrieve relevant documents using RAG
    const relevantDocs = await retrieveRelevantDocuments(userQuery, 3);

    // Build context from retrieved documents
    let context = '';
    if (relevantDocs.length > 0) {
      context = '\n\nRelevant context from knowledge base:\n\n';
      relevantDocs.forEach((doc, index) => {
        context += `[Source ${index + 1}] (from ${doc.metadata.filename || 'unknown'}):\n${doc.content}\n\n`;
      });
    }

    // Create the system prompt with RAG context
    const systemPrompt = `You are a helpful AI assistant with access to a knowledge base. 
Answer questions based on the provided context when available. 
If the context doesn't contain relevant information, use your general knowledge but mention that you're not finding specific information in the knowledge base.
Be concise, accurate, and helpful.${context}`;

    // Use Vercel AI SDK streamText with Google provider
    const result = streamText({
      model: google('gemini-2.0-flash'),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // Check if it's a quota error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
      return new Response(
        '⚠️ API quota exceeded. Your Gemini API has reached its limit. Please wait 24 hours for reset or upgrade your API plan at https://ai.google.dev/',
        { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        }
      );
    }
    
    return new Response(
      'Sorry, I encountered an error. Please try again later.',
      { status: 200, headers: { 'Content-Type': 'text/plain' } }
    );
  }
}
