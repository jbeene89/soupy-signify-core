-- Demo submissions table
CREATE TABLE public.demo_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier SMALLINT NOT NULL CHECK (tier BETWEEN 0 AND 3),
  prompt_length INT NOT NULL CHECK (prompt_length >= 0 AND prompt_length <= 2000),
  baseline_cost_cents INT NOT NULL CHECK (baseline_cost_cents >= 0),
  soupy_cost_cents INT NOT NULL CHECK (soupy_cost_cents >= 0),
  partners TEXT[] NOT NULL DEFAULT '{}',
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_demo_submissions_tier_created
  ON public.demo_submissions (tier, created_at DESC);

-- Enable RLS
ALTER TABLE public.demo_submissions ENABLE ROW LEVEL SECURITY;

-- No direct client access. Writes go through a server function using the service role.
-- Reads happen only via the aggregate function below.
-- (No policies defined => deny by default for anon/authenticated.)

-- Public-safe aggregate: weekly Tier 0 savings
CREATE OR REPLACE FUNCTION public.get_tier0_savings_this_week()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(baseline_cost_cents - soupy_cost_cents), 0)::BIGINT
  FROM public.demo_submissions
  WHERE tier = 0
    AND created_at >= now() - INTERVAL '7 days';
$$;

-- Allow anon + authenticated to call the aggregate
GRANT EXECUTE ON FUNCTION public.get_tier0_savings_this_week() TO anon, authenticated;