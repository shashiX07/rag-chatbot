export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
  file?: {
    name: string;
    type: string;
    size: number;
    status: 'uploading' | 'success' | 'error';
    message?: string;
  };
}

export interface Source {
  id: string;
  content: string;
  metadata: {
    filename?: string;
    chunk_index?: number;
  };
  similarity?: number;
}

export interface Document {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    filename: string;
    chunk_index: number;
    total_chunks: number;
    created_at: string;
  };
}

export interface ChatRequest {
  messages: Message[];
}

export interface EmbeddingRequest {
  text: string;
}

export interface EmbeddingResponse {
  embedding: number[];
}

export interface UploadRequest {
  file: File;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  documentId?: string;
  chunks?: number;
}
