
-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_provider TEXT CHECK (billing_provider IN ('stripe', 'paypal')),
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    billing_status TEXT CHECK (billing_status IN ('active', 'trialing', 'past_due', 'canceled', 'exempt', 'inactive')),
    plan_interval TEXT CHECK (plan_interval IN ('month', 'year')),
    current_period_end TIMESTAMPTZ,
    trial_start_at TIMESTAMPTZ,
    trial_end_at TIMESTAMPTZ,
    trial_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Only Service Role (API) can update subscriptions (Checkout/Webhooks)
-- Users cannot update this table directly via client

-- Function to handle new user signup (Trigger) -> Initialize Subscription entry?
-- Or we create it on "Start Trial".
-- Prompt says: "Starting trial sets ... trial_used = true".
-- Ideally, we create the row when the user acts.
-- However, for simpler queries, having a row for every engineer is nice.
-- Let's stick to creating it via API.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(billing_status);

-- Add Share Token to Projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token);
