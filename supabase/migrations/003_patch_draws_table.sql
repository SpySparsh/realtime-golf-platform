-- ============================================================
-- Migration: Patch `draws` table to match the Draw Engine API
-- 
-- Uses ADD COLUMN IF NOT EXISTS so it is safe to run even
-- if some columns already exist from the initial schema.
-- ============================================================

-- 1. The month identifier used as a primary key for the draw
--    e.g. '2025-03' (TEXT), must be unique per draw cycle.
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS draw_month TEXT NOT NULL DEFAULT '';

ALTER TABLE public.draws
  ADD UNIQUE (draw_month);

-- 2. The 5 drawn winning numbers (array of integers, 1–45)
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS drawn_numbers INTEGER[] NOT NULL DEFAULT '{}';

-- 3. Total prize pool including any rollover from last month (in pence)
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS total_prize_pool_pence BIGINT NOT NULL DEFAULT 0;

-- 4. The rollover amount to carry into NEXT month's pool (in pence)
--    Set to 0 initially; updated at end of draw execution.
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS rollover_amount_pence BIGINT NOT NULL DEFAULT 0;

-- 5. Draw lifecycle status
--    Values: 'pending' | 'published' | 'completed' | 'cancelled'
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- 6. Timestamps
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 7. Auto-update updated_at on any row modification
--    (Requires the moddatetime extension — enable it in Supabase Dashboard
--     under Database > Extensions if not already active.)
DROP TRIGGER IF EXISTS handle_draws_updated_at ON public.draws;
CREATE TRIGGER handle_draws_updated_at
  BEFORE UPDATE ON public.draws
  FOR EACH ROW
  EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- ============================================================
-- Verify: quick sanity check on the final column list
-- ============================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'draws'
-- ORDER BY ordinal_position;
