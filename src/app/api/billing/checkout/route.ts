
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { planId, interval = 'month', provider } = await request.json();

    // 1. Block PRO Plan
    if (planId === 'engineer_pro') {
        return NextResponse.json({ error: 'PRO plan is coming soon and not available yet.' }, { status: 400 });
    }

    // Default to Basic if not specified (or enforce it)
    const effectivePlanId = planId || 'engineer_basic';

    // DEMO MODE: Update DB immediately to simulate successful payment
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    // 30 days or 1 year
    const periodEnd = new Date(now.getTime() + (interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000);

    // Map plan details
    const planDetails = {
        plan: effectivePlanId,
        quota_bytes: effectivePlanId === 'engineer_pro' ? 107374182400 : 53687091200,
        has_ai_mix_assistant: effectivePlanId === 'engineer_pro'
    };

    await adminClient
        .from('subscriptions')
        .upsert({
            user_id: user.id,
            billing_provider: provider,
            billing_status: 'active',
            plan_interval: interval,
            provider_subscription_id: `sub_${Math.random().toString(36).substr(2, 9)}`,
            current_period_end: periodEnd.toISOString(),
            updated_at: now.toISOString(),
            ...planDetails
        });

    // In a real app, this would return a Stripe Checkout Session URL
    // Here we redirect back to billing with success
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));

    return NextResponse.json({
        url: `${origin}/dashboard/billing?status=success`
    });
}
