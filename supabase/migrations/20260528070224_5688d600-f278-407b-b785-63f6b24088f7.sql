
-- ============================================
-- tier0_checkpoints: roster of trained SLM checkpoints
-- ============================================
CREATE TABLE public.tier0_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  model_family TEXT NOT NULL,
  endpoint_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  measured_cost_per_mtoken_micros BIGINT NOT NULL DEFAULT 0,
  measured_tokens_per_sec INTEGER NOT NULL DEFAULT 0,
  trained_on_samples INTEGER NOT NULL DEFAULT 0,
  eval_pass_rate NUMERIC(5,4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tier0_checkpoints TO anon, authenticated;
GRANT ALL ON public.tier0_checkpoints TO service_role;

ALTER TABLE public.tier0_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tier0 checkpoints"
  ON public.tier0_checkpoints FOR SELECT
  USING (true);

-- Only one active at a time
CREATE UNIQUE INDEX tier0_checkpoints_one_active
  ON public.tier0_checkpoints (is_active)
  WHERE is_active = true;

-- ============================================
-- tier0_runs: every prompt the SLM absorbed
-- ============================================
CREATE TABLE public.tier0_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkpoint_id UUID REFERENCES public.tier0_checkpoints(id) ON DELETE SET NULL,
  prompt_hash TEXT NOT NULL,
  prompt_length INTEGER NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  ttft_ms INTEGER,
  cost_micros BIGINT NOT NULL DEFAULT 0,
  baseline_gpt5_micros BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  error_message TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tier0_runs TO anon, authenticated;
GRANT ALL ON public.tier0_runs TO service_role;

ALTER TABLE public.tier0_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tier0 runs"
  ON public.tier0_runs FOR SELECT
  USING (true);

CREATE INDEX tier0_runs_created_at_idx ON public.tier0_runs (created_at DESC);
CREATE INDEX tier0_runs_checkpoint_idx ON public.tier0_runs (checkpoint_id, created_at DESC);

-- ============================================
-- tier0_training_metrics: telemetry from training loop
-- ============================================
CREATE TABLE public.tier0_training_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkpoint_id UUID REFERENCES public.tier0_checkpoints(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  loss NUMERIC(10,6),
  eval_score NUMERIC(5,4),
  samples_per_sec NUMERIC(10,2),
  gpu_util_pct SMALLINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tier0_training_metrics TO anon, authenticated;
GRANT ALL ON public.tier0_training_metrics TO service_role;

ALTER TABLE public.tier0_training_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read training metrics"
  ON public.tier0_training_metrics FOR SELECT
  USING (true);

CREATE INDEX tier0_training_metrics_ck_step_idx
  ON public.tier0_training_metrics (checkpoint_id, step);

-- ============================================
-- helper: live measured stats from last 24h
-- ============================================
CREATE OR REPLACE FUNCTION public.get_tier0_live_stats()
RETURNS TABLE(
  checkpoint_id UUID,
  checkpoint_name TEXT,
  total_runs BIGINT,
  avg_latency_ms NUMERIC,
  avg_tokens_per_sec NUMERIC,
  cost_per_mtoken_micros NUMERIC,
  total_saved_micros BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS checkpoint_id,
    c.name AS checkpoint_name,
    COUNT(r.id) AS total_runs,
    COALESCE(AVG(r.latency_ms), 0)::NUMERIC AS avg_latency_ms,
    COALESCE(AVG(
      CASE WHEN r.latency_ms > 0
           THEN (r.tokens_out::NUMERIC * 1000) / r.latency_ms
           ELSE NULL END
    ), 0)::NUMERIC AS avg_tokens_per_sec,
    CASE WHEN SUM(r.tokens_out) > 0
         THEN (SUM(r.cost_micros)::NUMERIC * 1000000) / SUM(r.tokens_out)
         ELSE 0
    END AS cost_per_mtoken_micros,
    COALESCE(SUM(r.baseline_gpt5_micros - r.cost_micros), 0)::BIGINT AS total_saved_micros
  FROM public.tier0_checkpoints c
  LEFT JOIN public.tier0_runs r
    ON r.checkpoint_id = c.id
    AND r.created_at >= now() - INTERVAL '24 hours'
    AND r.status = 'ok'
  WHERE c.is_active = true
  GROUP BY c.id, c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_tier0_live_stats() TO anon, authenticated, service_role;
