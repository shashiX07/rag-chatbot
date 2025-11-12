import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Get the Gemini Pro model for chat
export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};

// Get the embedding model
export const getEmbeddingModel = () => {
  return genAI.getGenerativeModel({ model: 'text-embedding-004' });
};

// Simple hash-based embedding as fallback (deterministic)
function simpleEmbedding(text: string): number[] {
  const embedding = new Array(768).fill(0); // Standard embedding size
  const words = text.toLowerCase().split(/\s+/);
  
  words.forEach((word, idx) => {
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const position = (charCode * (i + 1) * (idx + 1)) % 768;
      embedding[position] += 1 / (words.length + 1);
    }
  });
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
}

// Generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = getEmbeddingModel();
    
    // Truncate text if it's too long (Gemini has limits)
    const maxLength = 2048;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;
    
    const result = await model.embedContent(truncatedText);
    
    if (!result.embedding || !result.embedding.values) {
      console.error('Invalid embedding response:', result);
      throw new Error('Invalid embedding response from Gemini');
    }
    
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding with Gemini:', error);
    
    // Check if it's a quota error
    if (error instanceof Error && error.message.includes('quota')) {
      console.warn('⚠️  Gemini quota exceeded. Using fallback embedding method.');
      console.warn('⚠️  For better results, wait for quota reset or upgrade your API plan.');
      return simpleEmbedding(text);
    }
    
    console.error('Error details:', error instanceof Error ? error.message : error);
    
    // Use fallback for any error
    console.warn('⚠️  Using fallback embedding method due to error.');
    return simpleEmbedding(text);
  }
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
