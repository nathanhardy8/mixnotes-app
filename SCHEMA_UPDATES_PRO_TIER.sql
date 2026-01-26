-- Add PRO tier columns to subscriptions table

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'engineer_basic',
ADD COLUMN IF NOT EXISTS quota_bytes BIGINT DEFAULT 53687091200, -- 50GB
ADD COLUMN IF NOT EXISTS has_ai_mix_assistant BOOLEAN DEFAULT FALSE;

-- Add check constraint for plan types
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_plan_check
CHECK (plan IN ('engineer_basic', 'engineer_pro'));

-- Update existing Basic tiers to ensure they have correct defaults
UPDATE public.subscriptions
SET 
  plan = 'engineer_basic',
  quota_bytes = 53687091200,
  has_ai_mix_assistant = FALSE
WHERE plan IS NULL;
