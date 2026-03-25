-- ============================================================
-- RPC: generate_algorithmic_draw_numbers(_limit integer)
-- 
-- Returns `_limit` unique integers (1–45) weighted by global
-- score frequency. Scores that appear more often across all
-- users have a proportionally higher chance of being drawn.
--
-- Fallback: if the scores table is empty, returns _limit
-- random unique numbers between 1 and 45.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_algorithmic_draw_numbers(_limit integer DEFAULT 5)
RETURNS TABLE(score integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _total_scores bigint;
BEGIN
  -- Check if any scores exist
  SELECT count(*) INTO _total_scores FROM public.scores;

  IF _total_scores = 0 THEN
    -- FALLBACK: No scores in DB → return _limit random unique numbers 1–45
    RETURN QUERY
      SELECT s::integer AS score
      FROM generate_series(1, 45) AS s
      ORDER BY random()
      LIMIT _limit;
  ELSE
    -- WEIGHTED DRAW: Numbers that appear more frequently get higher probability.
    --
    -- How it works:
    --   1. Count how often each distinct score value (1–45) appears globally.
    --   2. Use that frequency as a weight: random() ^ (1.0 / weight).
    --      This is the "exponential sort" weighted sampling trick —
    --      higher weights produce values closer to 1, so they sort higher.
    --   3. Include score values with 0 occurrences at weight = 0.5
    --      so every number has _some_ chance of appearing (fairness floor).
    --   4. Return top _limit results ordered by weighted random descending.
    RETURN QUERY
      WITH freq AS (
        SELECT
          s.score AS val,
          count(sc.score)::float AS weight
        FROM generate_series(1, 45) AS s(score)
        LEFT JOIN public.scores sc ON sc.score = s.score
        GROUP BY s.score
      )
      SELECT f.val::integer AS score
      FROM freq f
      ORDER BY random() ^ (1.0 / GREATEST(f.weight, 0.5)) DESC
      LIMIT _limit;
  END IF;
END;
$$;

-- Grant execute to authenticated users (needed for Supabase RPC calls)
GRANT EXECUTE ON FUNCTION public.generate_algorithmic_draw_numbers(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_algorithmic_draw_numbers(integer) TO service_role;
