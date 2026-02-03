-- Add Onboarding Status and Stripe fields to subscriptions table

-- 1. Create onboarding_status enum/check
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'LOCKED_PENDING_BILLING',
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT, -- Ensure explicit naming if not using provider_customer_id
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT; -- Ensure explicit naming if not using provider_subscription_id

-- Add check constraint for onboarding_status
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_onboarding_status_check;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_onboarding_status_check
CHECK (onboarding_status IN ('LOCKED_PENDING_BILLING', 'ACTIVE'));

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_onboarding_status ON public.subscriptions(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);

-- Backfill existing active subscriptions to ACTIVE
UPDATE public.subscriptions
SET onboarding_status = 'ACTIVE'
WHERE billing_status IN ('active', 'trialing', 'exempt');
