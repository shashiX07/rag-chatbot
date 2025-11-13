import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Verify authorization (optional - for cron jobs)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete documents older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { error, count } = await supabase
      .from('documents')
      .delete()
      .lt('created_at', thirtyMinutesAgo);

    if (error) {
      console.error('Error during cleanup:', error);
      return NextResponse.json(
        { success: false, message: 'Cleanup failed', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${count || 0} old documents.`,
      deletedCount: count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in cleanup API:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during cleanup' },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET(req: NextRequest) {
  return POST(req);
}
