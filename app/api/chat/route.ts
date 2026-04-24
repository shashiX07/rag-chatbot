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
      model: google('gemini-2.5-flash'),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('quota') || errorMessage.includes('429')) {
            controller.enqueue(new TextEncoder().encode('\n\n⚠️ API quota exceeded. Your Gemini API has reached its limit. Please wait 24 hours for reset or upgrade your API plan at https://ai.google.dev/'));
          } else {
            controller.enqueue(new TextEncoder().encode('\n\nSorry, I encountered an error: ' + errorMessage));
          }
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // Check if it's a synchronous quota error
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
      'Sorry, I encountered an error: ' + String(error),
      { status: 200, headers: { 'Content-Type': 'text/plain' } }
    );
  }
}
