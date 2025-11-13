import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(req: NextRequest) {
  try {
    // Delete all documents from the database
    const { error } = await supabase
      .from('documents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (neq with impossible UUID)

    if (error) {
      console.error('Error clearing database:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to clear database', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully! All documents have been removed.',
    });
  } catch (error) {
    console.error('Error in clear API:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while clearing the database' },
      { status: 500 }
    );
  }
}
