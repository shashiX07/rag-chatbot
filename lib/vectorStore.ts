import { supabaseAdmin } from './supabaseAdmin';
import { generateEmbedding, cosineSimilarity } from './gemini';
import { Document, Source } from '@/types';

// Chunk text into smaller pieces for better retrieval
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap; // Move forward by chunkSize minus overlap
    
    // Prevent infinite loop if we're not making progress
    if (start <= end - chunkSize + overlap) {
      start = end;
    }
  }
  
  return chunks;
}

// Store document chunks with embeddings in Supabase
export async function storeDocument(
  content: string,
  filename: string
): Promise<{ success: boolean; chunks: number; error?: string }> {
  try {
    const chunks = chunkText(content);
    const documentsToInsert = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);
      
      documentsToInsert.push({
        content: chunk,
        embedding: JSON.stringify(embedding), // Convert to JSON string for pgvector
        metadata: {
          filename,
          chunk_index: i,
          total_chunks: chunks.length,
          created_at: new Date().toISOString(),
        },
      });
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .insert(documentsToInsert);

    if (error) {
      console.error('Error inserting documents:', error);
      return { success: false, chunks: 0, error: error.message };
    }

    return { success: true, chunks: chunks.length };
  } catch (error) {
    console.error('Error storing document:', error);
    return { 
      success: false, 
      chunks: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Retrieve relevant documents using vector similarity search
export async function retrieveRelevantDocuments(
  query: string,
  topK: number = 3
): Promise<Source[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Fetch all documents from Supabase
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*');

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }

    if (!documents || documents.length === 0) {
      return [];
    }

    // Calculate similarity scores
    const documentsWithScores = documents
      .map((doc) => {
        try {
          // Parse embedding if it's a string
          const docEmbedding = typeof doc.embedding === 'string' 
            ? JSON.parse(doc.embedding) 
            : doc.embedding;
          
          // Skip if embeddings have different lengths
          if (!docEmbedding || !Array.isArray(docEmbedding)) {
            console.warn(`Invalid embedding for document ${doc.id}`);
            return null;
          }
          
          if (docEmbedding.length !== queryEmbedding.length) {
            console.warn(`Embedding length mismatch for document ${doc.id}: ${docEmbedding.length} vs ${queryEmbedding.length}`);
            return null;
          }
          
          return {
            ...doc,
            similarity: cosineSimilarity(queryEmbedding, docEmbedding),
          };
        } catch (err) {
          console.error(`Error processing document ${doc.id}:`, err);
          return null;
        }
      })
      .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

    // Sort by similarity and take top K
    const topDocuments = documentsWithScores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    // Format as Source objects
    return topDocuments.map((doc) => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      similarity: doc.similarity,
    }));
  } catch (error) {
    console.error('Error retrieving documents:', error);
    return [];
  }
}

// Get all documents (for admin purposes)
export async function getAllDocuments(): Promise<Document[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all documents:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllDocuments:', error);
    return [];
  }
}

// Delete all documents (for admin purposes)
export async function deleteAllDocuments(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Error deleting documents:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAllDocuments:', error);
    return false;
  }
}
