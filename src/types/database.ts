// =============================================================================
// GOLF CHARITY SUBSCRIPTION PLATFORM
// File: src/types/database.ts
// Description: TypeScript types mirroring the Supabase database schema.
//              Generated manually to match 001_initial_schema.sql.
//              Use with the Supabase client for full type-safety.
// =============================================================================

// ---------------------------------------------------------------------------
// ENUMS
// ---------------------------------------------------------------------------

export type SubscriptionPlan = 'monthly' | 'yearly';

export type SubscriptionStatus =
  | 'active'
  | 'inactive'
  | 'cancelled'
  | 'past_due'
  | 'trialing';

export type DrawType = 'random' | 'algorithmic';

export type DrawStatus = 'draft' | 'simulated' | 'published';

export type MatchTier = 'five_match' | 'four_match' | 'three_match';

export type WinnerVerificationStatus = 'pending' | 'approved' | 'rejected';

export type PayoutStatus = 'pending' | 'paid';

// ---------------------------------------------------------------------------
// TABLE ROWS (as stored in DB - snake_case to match Supabase conventions)
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;                      // UUID — matches auth.users.id
  email: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_admin: boolean;
  country: string;
  created_at: string;              // ISO 8601 timestamptz
  updated_at: string;
}

export interface Charity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  upcoming_events: CharityEvent[];
  is_featured: boolean;
  is_active: boolean;
  contact_email?: string;
  created_at: string;
  updated_at: string;
}

export interface CharityEvent {
  title: string;
  date: string;                    // ISO 8601 date string
  description: string | null;
  location: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  charity_id: string | null;

  // Stripe
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;

  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount_pence: number;            // e.g. 999 = £9.99
  charity_percentage: number;      // 10.00 – 100.00
  prize_pool_contribution_pence: number; // GENERATED column

  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  cancel_at_period_end: boolean;

  created_at: string;
  updated_at: string;
}

export interface Score {
  id: string;
  user_id: string;
  score: number;                   // 1–45 Stableford
  played_on: string;               // ISO 8601 date (DATE type from DB)
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Draw {
  id: string;
  draw_month: string;              // e.g. '2025-03-01'
  status: string;                  // 'pending' | 'published' | 'completed'
  drawn_numbers: number[];         // 5 integers from 1–45

  // Matches the column names written by the Draw Engine API
  total_prize_pool_pence: number;  // Full pool incl. rollover
  rollover_amount_pence: number;   // Unclaimed pence carried to next month

  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrawSimulationResult {
  five_match_count: number;
  four_match_count: number;
  three_match_count: number;
  estimated_jackpot_per_winner: number;
  estimated_four_match_per_winner: number;
  estimated_three_match_per_winner: number;
  run_at: string;
}

export interface DrawEntry {
  id: string;
  draw_id: string;
  user_id: string;
  entry_numbers: number[];         // snapshot of user's ≤5 scores at draw time
  match_count: number;             // 0–5
  created_at: string;
}

export interface Winner {
  id: string;
  draw_id: string;
  draw_entry_id: string;
  user_id: string;

  match_tier: MatchTier;
  matched_numbers: number[];
  prize_amount_pence: number;

  verification_status: WinnerVerificationStatus;
  proof_url: string | null;
  admin_notes: string | null;
  verified_by: string | null;      // admin profile ID
  verified_at: string | null;

  payout_status: PayoutStatus;
  paid_at: string | null;
  payment_reference: string | null;

  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// SUPABASE DATABASE TYPE MAP
// Used with: createClient<Database>(url, key)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      charities: {
        Row: Charity;
        Insert: Omit<Charity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Charity, 'id' | 'created_at' | 'updated_at'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<
          Subscription,
          'id' | 'created_at' | 'updated_at' | 'prize_pool_contribution_pence'
        >;
        Update: Partial<
          Omit<
            Subscription,
            'id' | 'user_id' | 'created_at' | 'updated_at' | 'prize_pool_contribution_pence'
          >
        >;
      };
      scores: {
        Row: Score;
        Insert: Omit<Score, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Score, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      draws: {
        Row: Draw;
        Insert: Omit<Draw, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Draw, 'id' | 'created_at' | 'updated_at'>>;
      };
      draw_entries: {
        Row: DrawEntry;
        Insert: Omit<DrawEntry, 'id' | 'created_at'>;
        Update: Partial<Omit<DrawEntry, 'id' | 'draw_id' | 'user_id' | 'created_at'>>;
      };
      winners: {
        Row: Winner;
        Insert: Omit<Winner, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Winner, 'id' | 'draw_id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
    };
    Functions: {
      calculate_prize_pool: {
        Args: { p_draw_id: string; p_carried_over_pence?: number };
        Returns: Array<{
          total_pool: number;
          jackpot_pool: number;
          four_match_pool: number;
          three_match_pool: number;
        }>;
      };
      generate_random_draw_numbers: {
        Args: Record<never, never>;
        Returns: number[];
      };
      generate_algorithmic_draw_numbers: {
        Args: { _limit: number };
        Returns: Array<{ score: number }>;
      };
      is_admin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
    };
    Enums: {
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
      draw_type: DrawType;
      draw_status: DrawStatus;
      match_tier: MatchTier;
      winner_verification_status: WinnerVerificationStatus;
      payout_status: PayoutStatus;
    };
  };
}

// ---------------------------------------------------------------------------
// CONVENIENCE / JOINED TYPES
// Used throughout the app when joining related tables.
// ---------------------------------------------------------------------------

/** Profile + its active subscription + selected charity */
export interface UserWithSubscription extends Profile {
  subscription: (Subscription & { charity: Charity | null }) | null;
}

/** A draw with all its entries and winners materialised */
export interface DrawWithResults extends Draw {
  entries: DrawEntry[];
  winners: WinnerWithProfile[];
}

/** Winner enriched with user profile and draw details */
export interface WinnerWithProfile extends Winner {
  profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'display_name'>;
  draw: Pick<Draw, 'id' | 'draw_month' | 'drawn_numbers'>;
}

/** Score entry form values (client-side) */
export interface ScoreFormValues {
  score: number;
  played_on: string;         // 'YYYY-MM-DD'
  notes?: string;
}

/** Prize pool breakdown (returned by calculate_prize_pool function) */
export interface PrizePoolBreakdown {
  total_pool: number;
  jackpot_pool: number;         // 40% + rollover
  four_match_pool: number;      // 35%
  three_match_pool: number;     // 25%
}

/** Admin analytics snapshot */
export interface AnalyticsSnapshot {
  total_users: number;
  active_subscribers: number;
  total_prize_pool_pence: number;
  total_charity_contribution_pence: number;
  draws_run: number;
  pending_winner_verifications: number;
}
