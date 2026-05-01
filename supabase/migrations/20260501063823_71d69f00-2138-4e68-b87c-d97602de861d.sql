CREATE TABLE public.early_access_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_early_access_signups_created_at ON public.early_access_signups (created_at DESC);

ALTER TABLE public.early_access_signups ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authed) can submit a signup
CREATE POLICY "anyone can submit a signup"
  ON public.early_access_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public select / update / delete policies. Only service role (admin) can read.