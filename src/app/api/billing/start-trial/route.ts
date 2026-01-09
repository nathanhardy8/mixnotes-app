
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Check if trial already used in DB
    // Use Admin/Service Role to write to subscriptions
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await adminClient
        .from('subscriptions')
        .select('trial_used')
        .eq('user_id', user.id)
        .single();

    if (existing?.trial_used) {
        return NextResponse.json({ error: 'Trial already used' }, { status: 400 });
    }

    // 2. Start Trial
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 Days

    const { error } = await adminClient
        .from('subscriptions')
        .upsert({
            user_id: user.id,
            billing_status: 'trialing',
            trial_start_at: now.toISOString(),
            trial_end_at: trialEnd.toISOString(),
            trial_used: true,
            updated_at: now.toISOString()
        });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
