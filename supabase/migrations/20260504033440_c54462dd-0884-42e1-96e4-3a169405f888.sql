
CREATE TABLE public.build_off_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  build_off_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  object_key TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  model TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_build_off_runs_lookup
  ON public.build_off_runs (build_off_id, tool, created_at DESC);

CREATE UNIQUE INDEX idx_build_off_runs_published
  ON public.build_off_runs (build_off_id, tool)
  WHERE is_published = true;

ALTER TABLE public.build_off_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read build-off runs"
  ON public.build_off_runs
  FOR SELECT
  USING (true);
