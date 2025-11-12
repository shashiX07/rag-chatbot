# PDF Support Documentation

## Overview
Your RAG chatbot now supports PDF file uploads in addition to TXT and MD files. The system extracts text content from PDFs and processes them into vector embeddings for semantic search.

## Implementation Details

### Backend Changes
- **File**: `app/api/upload/route.ts`
- **Library**: `pdf-parse-fork` (Simple, reliable PDF text extraction)
- **Functionality**: Extracts text content from PDF files with a single function call

### Frontend Changes
- **File**: `components/FileUpload.tsx`
- **Update**: Accept attribute now includes `.pdf` files
- **UI**: Updated text to indicate PDF support

## How It Works

1. **Upload**: User selects a PDF file through the file upload interface
2. **Processing**: The server receives the PDF and converts it to a buffer
3. **Text Extraction**: PDF.js loads the document and extracts text from each page
4. **Validation**: Checks if the PDF contains extractable text
5. **Storage**: Text is chunked and stored with embeddings in Supabase
6. **RAG**: The content is now searchable through the chat interface

## Supported File Types
- ✅ `.txt` - Plain text files
- ✅ `.md` - Markdown files  
- ✅ `.pdf` - PDF documents

## Error Handling
The system handles various PDF-related errors:
- Empty PDFs or PDFs with no extractable text
- Corrupted or invalid PDF files
- Image-only PDFs (scanned documents without OCR)

## Testing
To test PDF upload:
1. Start your development server: `npm run dev`
2. Navigate to the application
3. Click the upload area
4. Select a PDF file with readable text
5. Wait for the success message indicating chunks created
6. Use the chat to query information from the uploaded PDF

## Limitations
- **Image-based PDFs**: PDFs that are scanned images without OCR text layer won't extract content
- **Protected PDFs**: Password-protected PDFs may not be readable
- **Complex Layouts**: Tables and complex formatting may not extract perfectly

## Future Enhancements
Consider adding:
- OCR support for image-based PDFs using Tesseract.js
- Progress indicators for large PDF files
- PDF metadata extraction (author, title, etc.)
- Support for additional formats (DOCX, PPTX, etc.)
