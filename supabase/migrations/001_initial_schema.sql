-- =============================================================================
-- GOLF CHARITY SUBSCRIPTION PLATFORM
-- Migration: 001_initial_schema
-- Description: Complete database schema covering users, subscriptions, scores,
--              charities, draws, and winners with all business logic baked in.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE subscription_plan AS ENUM ('monthly', 'yearly');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due', 'trialing');
CREATE TYPE draw_type AS ENUM ('random', 'algorithmic');
CREATE TYPE draw_status AS ENUM ('draft', 'simulated', 'published');
CREATE TYPE match_tier AS ENUM ('five_match', 'four_match', 'three_match');
CREATE TYPE winner_verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payout_status AS ENUM ('pending', 'paid');

-- =============================================================================
-- TABLE: profiles
-- Extended user data linked 1:1 to auth.users (via Supabase Auth).
-- We never store PII in auth.users beyond email; everything else goes here.
-- =============================================================================

CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,                -- cached from auth.users for easy querying
    full_name       TEXT,
    display_name    TEXT,
    avatar_url      TEXT,
    phone           TEXT,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    country         TEXT DEFAULT 'GB',           -- for future multi-country expansion
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatically create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- TABLE: charities
-- Admin-managed list of charities users can select.
-- =============================================================================

CREATE TABLE charities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    logo_url        TEXT,
    banner_url      TEXT,
    website_url     TEXT,
    upcoming_events JSONB DEFAULT '[]'::JSONB,   -- [{title, date, description, location}]
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER charities_updated_at
    BEFORE UPDATE ON charities
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- TABLE: subscriptions
-- One row per user subscription. A user can only have ONE active subscription.
-- Links to Stripe for payment lifecycle management.
-- =============================================================================

CREATE TABLE subscriptions (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    charity_id                  UUID REFERENCES charities(id) ON DELETE SET NULL,

    -- Stripe references
    stripe_customer_id          TEXT,
    stripe_subscription_id      TEXT UNIQUE,
    stripe_price_id             TEXT,

    -- Plan details
    plan                        subscription_plan NOT NULL DEFAULT 'monthly',
    status                      subscription_status NOT NULL DEFAULT 'inactive',
    amount_pence                INTEGER NOT NULL DEFAULT 0,  -- stored in smallest currency unit (pence/cents)

    -- Charity contribution
    charity_percentage          NUMERIC(5,2) NOT NULL DEFAULT 10.00  -- minimum 10%, user can increase
                                    CHECK (charity_percentage >= 10.00 AND charity_percentage <= 100.00),

    -- Prize pool contribution per cycle (auto-calculated: amount_pence * (1 - charity_percentage/100))
    -- Stored for quick prize pool calculations
    prize_pool_contribution_pence INTEGER GENERATED ALWAYS AS (
        ROUND(amount_pence * (1.0 - charity_percentage / 100.0))
    ) STORED,

    -- Dates
    current_period_start        TIMESTAMPTZ,
    current_period_end          TIMESTAMPTZ,
    cancelled_at                TIMESTAMPTZ,
    cancel_at_period_end        BOOLEAN NOT NULL DEFAULT FALSE,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT one_active_subscription_per_user UNIQUE (user_id, stripe_subscription_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_charity_id ON subscriptions(charity_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- TABLE: scores
-- Stores golf scores in Stableford format.
-- ROLLING-5 LOGIC: enforced by trigger — a user never has more than 5 scores.
-- When a 6th score is inserted, the oldest is automatically deleted.
-- =============================================================================

CREATE TABLE scores (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score       INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),  -- Stableford range
    played_on   DATE NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scores_user_id_played_on ON scores(user_id, played_on DESC);

CREATE TRIGGER scores_updated_at
    BEFORE UPDATE ON scores
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Rolling-5 trigger: after each INSERT, delete excess rows for that user
CREATE OR REPLACE FUNCTION enforce_rolling_5_scores()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    excess_count INTEGER;
BEGIN
    -- Count how many scores the user has after this insertion
    SELECT COUNT(*) - 5 INTO excess_count
    FROM scores
    WHERE user_id = NEW.user_id;

    -- Delete the oldest score(s) if count > 5
    IF excess_count > 0 THEN
        DELETE FROM scores
        WHERE id IN (
            SELECT id
            FROM scores
            WHERE user_id = NEW.user_id
            ORDER BY played_on ASC, created_at ASC
            LIMIT excess_count
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_rolling_5_scores_trigger
    AFTER INSERT ON scores
    FOR EACH ROW EXECUTE PROCEDURE enforce_rolling_5_scores();

-- =============================================================================
-- TABLE: draws
-- One row per monthly draw. Stores draw config, numbers drawn, and pool amounts.
-- =============================================================================

CREATE TABLE draws (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_month                  DATE NOT NULL UNIQUE,           -- first day of the month (e.g. 2026-03-01)
    draw_type                   draw_type NOT NULL DEFAULT 'random',
    status                      draw_status NOT NULL DEFAULT 'draft',

    -- The 5 numbers drawn (1-45 Stableford range used as the draw pool)
    drawn_numbers               INTEGER[] NOT NULL DEFAULT '{}',  -- e.g. {12, 25, 7, 33, 41}

    -- Prize pool breakdown (in pence)
    total_pool_pence            INTEGER NOT NULL DEFAULT 0,
    jackpot_pool_pence          INTEGER NOT NULL DEFAULT 0,      -- 40% — can roll over
    four_match_pool_pence       INTEGER NOT NULL DEFAULT 0,      -- 35%
    three_match_pool_pence      INTEGER NOT NULL DEFAULT 0,      -- 25%

    -- Jackpot carried over from previous month (if no 5-match winner)
    carried_over_jackpot_pence  INTEGER NOT NULL DEFAULT 0,

    -- Active subscriber count at draw time (snapshot)
    subscriber_count            INTEGER NOT NULL DEFAULT 0,

    -- Simulation metadata (stored as JSONB for flexibility)
    simulation_result           JSONB,

    published_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_draws_draw_month ON draws(draw_month DESC);
CREATE INDEX idx_draws_status ON draws(status);

CREATE TRIGGER draws_updated_at
    BEFORE UPDATE ON draws
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- TABLE: draw_entries
-- Snapshot of the numbers each user "entered" with for a specific draw.
-- These are their scores at the time the draw was run (a point-in-time snapshot).
-- =============================================================================

CREATE TABLE draw_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id         UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entry_numbers   INTEGER[] NOT NULL,              -- snapshot of user's ≤5 scores at draw time
    match_count     INTEGER NOT NULL DEFAULT 0       -- how many numbers matched
                        CHECK (match_count >= 0 AND match_count <= 5),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (draw_id, user_id)
);

CREATE INDEX idx_draw_entries_draw_id ON draw_entries(draw_id);
CREATE INDEX idx_draw_entries_user_id ON draw_entries(user_id);

-- =============================================================================
-- TABLE: winners
-- Created after a draw is published. One row per winning match tier per draw.
-- Multiple users can share a tier (prize split equally).
-- =============================================================================

CREATE TABLE winners (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id                 UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
    draw_entry_id           UUID NOT NULL REFERENCES draw_entries(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    match_tier              match_tier NOT NULL,                 -- five_match | four_match | three_match
    matched_numbers         INTEGER[] NOT NULL,                  -- which specific numbers matched
    prize_amount_pence      INTEGER NOT NULL DEFAULT 0,          -- individual winner's share

    -- Winner verification
    verification_status     winner_verification_status NOT NULL DEFAULT 'pending',
    proof_url               TEXT,                                -- Screenshot upload URL
    admin_notes             TEXT,
    verified_by             UUID REFERENCES profiles(id),
    verified_at             TIMESTAMPTZ,

    -- Payout
    payout_status           payout_status NOT NULL DEFAULT 'pending',
    paid_at                 TIMESTAMPTZ,
    payment_reference       TEXT,                                -- manual ref or Stripe transfer ID

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (draw_id, draw_entry_id, match_tier)
);

CREATE INDEX idx_winners_draw_id ON winners(draw_id);
CREATE INDEX idx_winners_user_id ON winners(user_id);
CREATE INDEX idx_winners_verification_status ON winners(verification_status);
CREATE INDEX idx_winners_payout_status ON winners(payout_status);

CREATE TRIGGER winners_updated_at
    BEFORE UPDATE ON winners
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- PRIZE POOL CALCULATION FUNCTION
-- Called when a draw is being prepared. Calculates pool splits.
-- prize_pool_pence = SUM of prize_pool_contribution_pence for all active subs
--                   for this draw month.
-- Distribution: 40% jackpot, 35% four-match, 25% three-match
-- Jackpot adds any carried-over amount from previous month.
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_prize_pool(
    p_draw_id UUID,
    p_carried_over_pence INTEGER DEFAULT 0
)
RETURNS TABLE (
    total_pool          INTEGER,
    jackpot_pool        INTEGER,
    four_match_pool     INTEGER,
    three_match_pool    INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
    v_subscription_pool INTEGER;
BEGIN
    -- Sum prize pool contributions from all currently active subscriptions
    SELECT COALESCE(SUM(prize_pool_contribution_pence), 0)
    INTO v_subscription_pool
    FROM subscriptions
    WHERE status = 'active';

    total_pool       := v_subscription_pool + p_carried_over_pence;
    jackpot_pool     := ROUND(v_subscription_pool * 0.40) + p_carried_over_pence;
    four_match_pool  := ROUND(v_subscription_pool * 0.35);
    three_match_pool := ROUND(v_subscription_pool * 0.25);

    RETURN NEXT;
END;
$$;

-- =============================================================================
-- DRAW GENERATION FUNCTION (Random Mode)
-- Draws 5 unique numbers from 1-45.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_random_draw_numbers()
RETURNS INTEGER[]
LANGUAGE plpgsql AS $$
DECLARE
    numbers INTEGER[] := '{}';
    candidate INTEGER;
BEGIN
    WHILE array_length(numbers, 1) IS DISTINCT FROM 5 LOOP
        candidate := FLOOR(RANDOM() * 45 + 1)::INTEGER;
        IF NOT (candidate = ANY(numbers)) THEN
            numbers := array_append(numbers, candidate);
        END IF;
    END LOOP;
    RETURN numbers;
END;
$$;

-- =============================================================================
-- DRAW GENERATION FUNCTION (Algorithmic Mode)
-- Weighted by most-frequent user scores across ALL active subscribers.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_algorithmic_draw_numbers()
RETURNS INTEGER[]
LANGUAGE plpgsql AS $$
DECLARE
    numbers     INTEGER[] := '{}';
    candidate   INTEGER;
    rec         RECORD;
    pool        INTEGER[];
    pool_index  INTEGER;
BEGIN
    -- Build a weighted pool: each score value appears N times based on frequency
    SELECT array_agg(score ORDER BY freq DESC) INTO pool
    FROM (
        SELECT s.score, COUNT(*) AS freq
        FROM scores s
        INNER JOIN subscriptions sub ON sub.user_id = s.user_id AND sub.status = 'active'
        GROUP BY s.score
    ) freq_table;

    -- If no scores exist, fall back to random
    IF pool IS NULL OR array_length(pool, 1) = 0 THEN
        RETURN generate_random_draw_numbers();
    END IF;

    -- Pick 5 unique numbers from the weighted pool
    WHILE array_length(numbers, 1) IS DISTINCT FROM 5 LOOP
        pool_index := FLOOR(RANDOM() * array_length(pool, 1) + 1)::INTEGER;
        candidate  := pool[pool_index];
        IF NOT (candidate = ANY(numbers)) THEN
            numbers := array_append(numbers, candidate);
        END IF;
    END LOOP;

    RETURN numbers;
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws            ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners          ENABLE ROW LEVEL SECURITY;

-- Helper: check if the calling user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
    SELECT is_admin FROM profiles WHERE id = auth.uid();
$$;

-- *** profiles ***
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE USING (is_admin());

-- *** subscriptions ***
CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription"
    ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts subscriptions"
    ON subscriptions FOR INSERT WITH CHECK (TRUE);          -- webhook uses service role
CREATE POLICY "Admins can manage all subscriptions"
    ON subscriptions FOR ALL USING (is_admin());

-- *** scores ***
CREATE POLICY "Users can view their own scores"
    ON scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scores"
    ON scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scores"
    ON scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scores"
    ON scores FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all scores"
    ON scores FOR ALL USING (is_admin());

-- *** charities (public read, admin write) ***
CREATE POLICY "Anyone can view active charities"
    ON charities FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage charities"
    ON charities FOR ALL USING (is_admin());

-- *** draws (public read for published, admin for all) ***
CREATE POLICY "Anyone can view published draws"
    ON draws FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can manage all draws"
    ON draws FOR ALL USING (is_admin());

-- *** draw_entries ***
CREATE POLICY "Users can view their own draw entries"
    ON draw_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all draw entries"
    ON draw_entries FOR ALL USING (is_admin());
CREATE POLICY "Service role manages draw entries"
    ON draw_entries FOR INSERT WITH CHECK (TRUE);

-- *** winners ***
CREATE POLICY "Users can view their own winnings"
    ON winners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload proof for their own winnings"
    ON winners FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all winners"
    ON winners FOR ALL USING (is_admin());

-- =============================================================================
-- SEED: Default Charities
-- =============================================================================

INSERT INTO charities (name, slug, description, is_featured, is_active) VALUES
    ('Golf Foundation', 'golf-foundation', 
     'The Golf Foundation uses the transformative power of golf to change lives, delivering programmes that inspire young people across the UK.', 
     TRUE, TRUE),
    ('Cancer Research UK', 'cancer-research-uk', 
     'Cancer Research UK funds scientists, doctors and nurses to help beat cancer sooner. Your contribution helps fund life-saving research.', 
     FALSE, TRUE),
    ('The R&A Foundation', 'randa-foundation', 
     'Dedicated to ensuring golf''s global development through grants, scholarships, and sustainable golf course management.', 
     FALSE, TRUE),
    ('Prostate Cancer UK', 'prostate-cancer-uk', 
     'Prostate Cancer UK fights to help more men survive prostate cancer and enjoy a better quality of life.', 
     FALSE, TRUE),
    ('Mind (Mental Health)', 'mind-mental-health', 
     'Mind provides advice and support to empower anyone experiencing a mental health problem. Golf is a powerful tool for mental wellbeing.', 
     FALSE, TRUE);
