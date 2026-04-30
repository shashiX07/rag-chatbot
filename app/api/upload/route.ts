import { NextRequest, NextResponse } from 'next/server';
import { storeDocument } from '@/lib/vectorStore';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Get file content
    const buffer = Buffer.from(await file.arrayBuffer());
    let content = '';
    const filename = file.name;

    // Parse based on file type
    if (file.type === 'text/plain' || filename.endsWith('.txt')) {
      content = buffer.toString('utf-8');
    } else if (file.type === 'text/markdown' || filename.endsWith('.md')) {
      content = buffer.toString('utf-8');
    } else if (file.type === 'application/pdf' || filename.endsWith('.pdf')) {
      // Extract text from PDF
      try {
        // @ts-ignore - pdf-parse-fork doesn't have types
        const pdfParse = (await import('pdf-parse-fork')).default;
        const pdfData = await pdfParse(buffer);
        content = pdfData.text;
        
        console.log(`PDF parsed: ${pdfData.numpages} pages, ${content.length} characters`);
        
        if (!content || content.trim().length === 0) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'PDF file appears to be empty or contains no extractable text.' 
            },
            { status: 400 }
          );
        }
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json(
          { 
            success: false, 
            message: `Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}` 
          },
          { status: 400 }
        );
      }
    } else if (filename.endsWith('.csv') || file.type === 'text/csv') {
      try {
        const { parse } = await import('csv-parse/sync');
        const records = parse(buffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true
        });
        content = records.map((record: any) => {
          return Object.entries(record)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        }).join('\n');
      } catch (csvError) {
        console.error('CSV parsing error:', csvError);
        return NextResponse.json(
          { success: false, message: 'Failed to parse CSV file.' },
          { status: 400 }
        );
      }
    } else if (filename.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const mammoth = await import('mammoth');
        // @ts-ignore - Mammoth types might be slightly off with buffer
        const result = await mammoth.extractRawText({ buffer });
        content = result.value;
      } catch (docxError) {
        console.error('DOCX parsing error:', docxError);
        return NextResponse.json(
          { success: false, message: 'Failed to parse DOCX file.' },
          { status: 400 }
        );
      }
    } else if (file.type.startsWith('image/')) {
      try {
        // Send the image to our Python FastAPI service
        const pythonFormData = new FormData();
        pythonFormData.append('file', new Blob([buffer], { type: file.type }), filename);

        const ocrUrl = process.env.OCR_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${ocrUrl}/scan`, {
          method: 'POST',
          body: pythonFormData,
        });

        if (!response.ok) {
          throw new Error(`Python OCR service returned status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error from Python OCR service');
        }

        content = data.content;
        console.log(`Image scanned via local service: ${content.length} characters extracted`);
        
        if (!content || content.trim().length === 0) {
          return NextResponse.json(
            { success: false, message: 'Image appears to be empty or contains no extractable text.' },
            { status: 400 }
          );
        }
      } catch (imgError) {
        console.error('Image scanning error:', imgError);
        return NextResponse.json(
          { success: false, message: 'Failed to scan image. Ensure the OCR service is running and accessible (check OCR_API_URL in .env).' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unsupported file type. Please upload TXT, MD, PDF, DOCX, CSV, or Image files.' 
        },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'File is empty or could not be read' },
        { status: 400 }
      );
    }

    // Store document with embeddings
    const result = await storeDocument(content, filename);

    if (!result.success) {
      // Check if it's a database table error
      const isTableError = result.error?.includes('documents') && 
                          (result.error.includes('not found') || result.error.includes('PGRST205'));
      
      // Check if it's a dimension mismatch error
      const isDimensionError = result.error?.includes('expected') && result.error?.includes('dimensions');
      
      return NextResponse.json(
        { 
          success: false, 
          message: isTableError 
            ? '⚠️ Database not set up! Please run supabase-setup.sql in your Supabase SQL Editor. See DATABASE_SETUP_REQUIRED.md for instructions.'
            : isDimensionError
            ? '⚠️ Database dimension mismatch! Your table was created with wrong dimensions. Run FIX_VECTOR_DIMENSION.sql in Supabase SQL Editor to fix it.'
            : result.error || 'Failed to store document'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${filename}`,
      chunks: result.chunks,
    });
  } catch (error) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to upload file' 
      },
      { status: 500 }
    );
  }
}
