import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createAdminClient } from '@/utils/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const supabase = createAdminClient();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                // Typically we handle subscription.created, but this confirms the flow finished.
                // We can ensure customer ID linkage here too.
                const userId = session.metadata?.userId;
                if (userId) {
                    await supabase.from('subscriptions').update({
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: session.subscription as string,
                        updated_at: new Date().toISOString()
                    }).eq('user_id', userId);
                }
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const userId = subscription.metadata?.userId;
                // Note: subscription.metadata might be empty if not propagated from checkout line items sometimes, 
                // usually subscription_data.metadata in checkout propagates to subscription.metadata. 
                // Fallback: look up by customer_id if userId missing.

                let targetUserId = userId;
                if (!targetUserId) {
                    const { data: subData } = await supabase
                        .from('subscriptions')
                        .select('user_id')
                        .eq('stripe_customer_id', subscription.customer as string)
                        .single();
                    targetUserId = subData?.user_id;
                }

                if (!targetUserId) {
                    console.error('Webhook: No userId found for subscription', subscription.id);
                    break;
                }

                const status = subscription.status;
                const priceId = subscription.items.data[0].price.id;

                // Map Entitlements
                let planKey: 'engineer_basic' | 'engineer_pro' = 'engineer_basic';
                let quotaBytes = 50 * 1024 * 1024 * 1024; // 50GB
                let hasAi = false;

                if (priceId === process.env.STRIPE_PRICE_ENGINEER_PRO_MONTHLY) {
                    planKey = 'engineer_pro';
                    quotaBytes = 100 * 1024 * 1024 * 1024; // 100GB
                    hasAi = true;
                }

                // Determine Onboarding Status
                // If active or trialing -> ACTIVE. Else LOCKED.
                let onboardingStatus = 'LOCKED_PENDING_BILLING';
                if (['active', 'trialing'].includes(status)) {
                    onboardingStatus = 'ACTIVE';
                }

                await supabase.from('subscriptions').upsert({
                    user_id: targetUserId,
                    stripe_customer_id: subscription.customer as string,
                    stripe_subscription_id: subscription.id,
                    stripe_price_id: priceId,
                    billing_status: status,
                    plan: planKey,
                    quota_bytes: quotaBytes,
                    has_ai_mix_assistant: hasAi,
                    onboarding_status: onboardingStatus,
                    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                    trial_start_at: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
                    trial_end_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                    updated_at: new Date().toISOString()
                });

                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                // Mark as canceled/locked
                await supabase.from('subscriptions').update({
                    billing_status: 'canceled',
                    onboarding_status: 'LOCKED_PENDING_BILLING',
                    updated_at: new Date().toISOString()
                }).eq('stripe_subscription_id', subscription.id);
                break;
            }
        }
    } catch (err: any) {
        console.error('Webhook processing failed:', err);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
