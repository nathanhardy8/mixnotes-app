import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { createAdminClient } from '@/utils/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover' as any,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { planId, interval } = body; // expect planId: 'engineer_basic' | 'engineer_pro'

        // 1. Auth & Role Check
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = user.user_metadata?.role;
        // Allow anyone to subscribe (and become an engineer)


        // 2. Resolve Price ID
        let priceId: string | undefined;
        if (planId === 'engineer_basic') {
            priceId = process.env.STRIPE_PRICE_ENGINEER_BASIC_MONTHLY;
        } else if (planId === 'engineer_pro') {
            priceId = process.env.STRIPE_PRICE_ENGINEER_PRO_MONTHLY;
        }

        if (!priceId) {
            return NextResponse.json({ error: 'Invalid plan configuration' }, { status: 400 });
        }

        // 3. Get/Create Stripe Customer
        const adminSupabase = createAdminClient();
        const { data: subData } = await adminSupabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .single();

        let customerId = subData?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id
                },
                name: user.user_metadata?.name
            });
            customerId = customer.id;

            // Save to DB immediately so we don't duplicate later
            await adminSupabase
                .from('subscriptions')
                .upsert({
                    user_id: user.id,
                    stripe_customer_id: customerId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
        }

        // 4. Create Subscription Directly (Cardless Trial)
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            trial_period_days: 30,
            payment_behavior: 'default_incomplete', // Allows creation without payment method
            metadata: {
                userId: user.id,
                planId: planId
            },
            expand: ['latest_invoice.payment_intent'],
        });

        // Debug logging
        console.log('Subscription created:', JSON.stringify(subscription, null, 2));
        const currentPeriodEnd = (subscription as any).current_period_end;
        console.log('current_period_end (raw):', currentPeriodEnd);

        const periodEndDate = currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Fallback to 30 days if missing
        console.log('periodEndDate:', periodEndDate);

        // 5. Sync to Supabase immediately (optional but good for speed)
        await adminSupabase
            .from('subscriptions')
            .update({
                stripe_subscription_id: subscription.id,
                status: 'trialing',
                plan_id: planId,
                current_period_end: periodEndDate.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        // 6. Promote user to engineer role immediately
        await adminSupabase.auth.admin.updateUserById(user.id, {
            user_metadata: { role: 'engineer' }
        });

        return NextResponse.json({ url: `${process.env.APP_URL}/dashboard` });

    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
