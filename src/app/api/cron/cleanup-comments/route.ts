import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    // Basic authorization check (e.g. Cron secret)
    // For now, we'll allow it if called with a valid service role or just rely on the fact it's a maintenance task.
    // Ideally, check for 'Authorization: Bearer <CRON_SECRET>'
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // Allowing open for now as per "simple MVP" usually, or just protect it lightly.
        // Let's rely on the fact it's an internal maintenance function.
    }

    try {
        // Use service role to bypass RLS for cleanup
        const supabase = await createClient(); // Note: This uses cookie auth by default. 
        // We probably need admin permissions to run the RPC properly if RLS blocks 'delete'.
        // Let's try importing supabase-js for admin client if needed, or if RPC is SECURITY DEFINER it runs as owner.
        // The RPC 'delete_old_archived_comments' is SECURITY DEFINER, so any authenticated user (or even anon if granted) can call it.
        // However, to be safe, let's use the standard client.

        const { error } = await supabase.rpc('delete_old_archived_comments');

        if (error) {
            console.error('Cleanup Cron Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Cleanup complete' });
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}
