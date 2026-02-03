
import { createClient } from '@/utils/supabase/client';
import { Subscription, User } from '@/types';

const supabase = createClient();

// Configuration
const TRIAL_DAYS = 30;
export const EXEMPT_EMAIL = 'nathan.hardy24@gmail.com';

export const billingService = {
    async getSubscription(userId: string): Promise<Subscription | null> {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !data) return null;

        return {
            userId: data.user_id,
            billingProvider: data.billing_provider,
            providerCustomerId: data.provider_customer_id,
            providerSubscriptionId: data.provider_subscription_id,
            billingStatus: data.billing_status,
            planInterval: data.plan_interval,
            currentPeriodEnd: data.current_period_end,
            trialStartAt: data.trial_start_at,
            trialEndAt: data.trial_end_at,
            trialUsed: data.trial_used,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    async startTrial(userId: string): Promise<{ success: boolean; error?: string }> {
        // 1. Check if trial already used
        const existing = await this.getSubscription(userId);
        if (existing?.trialUsed) {
            return { success: false, error: 'Trial already used' };
        }

        const now = new Date();
        const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

        // 2. Create/Update Subscription
        const { error } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: userId,
                billing_status: 'trialing',
                trial_start_at: now.toISOString(),
                trial_end_at: trialEnd.toISOString(),
                trial_used: true,
                updated_at: now.toISOString()
            });

        if (error) return { success: false, error: error.message };
        return { success: true };
    },

    // In a real app, this generates a Stripe Session URL.
    // For this build, we will simulate the connection via API to allow testing.
    async createCheckoutSession(userId: string, planId: 'engineer_basic' | 'engineer_pro', interval: 'month' | 'year', provider: 'stripe' | 'paypal'): Promise<{ url?: string; error?: string }> {
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, interval, provider }) // User ID inferred from session
            });
            const data = await res.json();
            if (!res.ok) return { error: data.error };
            return { url: data.url };
        } catch (e: any) {
            return { error: e.message };
        }
    },

    async getPortalLink(): Promise<{ url?: string; error?: string }> {
        try {
            const res = await fetch('/api/billing/portal', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) return { error: data.error };
            return { url: data.url };
        } catch (e: any) {
            return { error: e.message };
        }
    },

    // Client-side access check helper
    // WARNING: Critical checks must also happen SERVER-SIDE (Layout/API)
    checkAccess(user: User | null): { allowed: boolean; reason?: 'trial_expired' | 'no_sub' | 'inactive' } {
        if (!user) return { allowed: false, reason: 'no_sub' };

        // 1. Admin / Exempt
        if (user.role === 'admin' || user.email === EXEMPT_EMAIL) return { allowed: true };

        // 2. Check Subscription
        const sub = user.subscription;

        if (!sub) return { allowed: false, reason: 'no_sub' };

        // Exempt status in DB
        if (sub.billingStatus === 'exempt') return { allowed: true };

        // Active
        if (sub.billingStatus === 'active') return { allowed: true };

        // Trialing
        if (sub.billingStatus === 'trialing') {
            if (sub.trialEndAt && new Date(sub.trialEndAt) > new Date()) {
                return { allowed: true };
            }
            return { allowed: false, reason: 'trial_expired' };
        }

        // Canceled (access until period end)
        if (sub.billingStatus === 'canceled') {
            if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()) {
                return { allowed: true };
            }
            return { allowed: false, reason: 'inactive' };
        }

        return { allowed: false, reason: 'inactive' };
    }
};
