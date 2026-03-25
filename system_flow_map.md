# Comprehensive System Flow & Component Map

This technical guide traces the exact functional paths, file connections, and data flows for the core user journeys in the Golf Charity Subscription Platform. Follow these file paths in your code editor to see precisely how the frontend, API, database, and third-party services interact.

---

## 1. The Subscription Flow (Public Visitor ➡️ Paid User)

**1. The Starting Point (Frontend UI)**
*   **File:** [src/app/pricing/page.tsx](file:///d:/golf_subscription/src/app/pricing/page.tsx)
*   **Action:** A visitor reviews the plans and clicks the "Subscribe Monthly" or "Subscribe Yearly" button.
*   **Component Handler:** The [handleCheckout(plan)](file:///d:/golf_subscription/src/app/pricing/page.tsx#33-66) client-side function intercepts the click event. It verifies the user is authenticated (redirecting to [src/app/auth/login/page.tsx](file:///d:/golf_subscription/src/app/auth/login/page.tsx) if not) and prepares the selected charity choice.

**2. Initiating Checkout (API Route)**
*   **File:** [src/app/api/stripe/checkout/route.ts](file:///d:/golf_subscription/src/app/api/stripe/checkout/route.ts)
*   **Action:** The frontend sends a [POST](file:///d:/golf_subscription/src/app/api/emails/send/route.ts#4-30) request here.
*   **Logic:** This server api leverages the `stripe` server SDK to dynamically generate a Stripe Checkout Session URL based on the `price_id` associated with the chosen plan, appending the user's [id](file:///d:/golf_subscription/src/middleware.ts#4-70) and `charityId` into the Stripe `metadata`. It returns this URL to the client, which executes a `window.location.href` to jump into Stripe's secure portal.

**3. Payment Success & Database Sync (Stripe Webhook)**
*   **File:** [src/app/api/stripe/webhook/route.ts](file:///d:/golf_subscription/src/app/api/stripe/webhook/route.ts)
*   **Action:** Stripe asynchronously POSTs event objects back to the app when the payment succeeds.
*   **Logic:** 
  1. The route validates the `stripe-signature` header against your secure webhook secret.
  2. A switch statement catches `checkout.session.completed`, `invoice.paid`, or `customer.subscription.deleted`.
  3. It extracts the `stripe_customer_id` and custom `metadata`.
  4. It calls [createAdminClient()](file:///d:/golf_subscription/src/lib/supabase/admin.ts#4-21) (the Supabase Service Role key) to securely bypass Row Level Security (RLS).
  5. It performs an upsert into the `subscriptions` table, making the user's account officially "active."

---

## 2. The Score Entry Flow (Subscriber Dashboard)

**1. The Input Form (Frontend UI)**
*   **File:** [src/app/dashboard/scores/page.tsx](file:///d:/golf_subscription/src/app/dashboard/scores/page.tsx)
*   **Action:** An active subscriber fills out their Stableford score, Date, and Notes, then clicks "Add Score".
*   **Validation:** Client-side HTML5 DOM constraints (`<input type="number" min={1} max={45} required />` and `<input type="date" max={...} />`) proactively prevent impossible golf outputs before network requests fire.

**2. Processing the Submission (API Route)**
*   **File:** [src/app/api/scores/route.ts](file:///d:/golf_subscription/src/app/api/scores/route.ts)
*   **Action:** The frontend makes a [POST](file:///d:/golf_subscription/src/app/api/emails/send/route.ts#4-30) fetch call.
*   **Logic:** The server extracts the body, securely identities the user via Supabase SSR auth cookies, and inserts the data row into the `scores` table.

**3. Database Interception (Supabase Triggers)**
*   **File:** [supabase/migrations/001_initial_schema.sql](file:///d:/golf_subscription/supabase/migrations/001_initial_schema.sql) (Line ~174)
*   **Action:** Built directly into the PostgreSQL engine, the `enforce_rolling_5_scores_trigger` fires implicitly `AFTER INSERT` on the `scores` table.
*   **Logic:** It executes `SELECT count(*) FROM scores WHERE user_id = NEW.user_id`. If the count is > 5, it identifies the excess scores ordering ascending by `played_on` and `created_at` (finding the oldest date physically played), and safely [DELETE](file:///d:/golf_subscription/src/app/api/scores/%5Bid%5D/route.ts#37-55)s them, ensuring the user only ever possesses 5 rows without complex frontend logic.

---

## 3. The Monthly Draw Flow (Admin Panel)

**1. The Trigger Button (Frontend UI)**
*   **File:** [src/app/admin/draws/page.tsx](file:///d:/golf_subscription/src/app/admin/draws/page.tsx)
*   **Action:** An authorized Admin clicks "Execute Draw".
*   **Component Handler:** A frontend client handler makes a secure [POST](file:///d:/golf_subscription/src/app/api/emails/send/route.ts#4-30) fetch to the execution route.

**2. The Execution Engine (API Route & Postgres RPCs)**
*   **File:** [src/app/api/admin/draws/execute/route.ts](file:///d:/golf_subscription/src/app/api/admin/draws/execute/route.ts)
*   **Logic Sequence:**
   *   **Step 1. Active Pool Math:** The engine aggregates the total `prize_pool_contribution_pence` across all rows in the `subscriptions` table where `status = 'active'`.
   *   **Step 2. Rollover Injection:** It queries the previous month's draw to extract and add any `pending_rollover_pence` directly into the current month's active pool.
   *   **Step 3. Number Generation:** It accesses the database to fire the `generate_algorithmic_draw_numbers()` RPC. This SQL function utilizes a frequency aggregation array (`array_agg(... ORDER BY freq DESC)`) analyzing all active subscribers' recorded points to guarantee the 5 drawn numbers accurately represent user activity weighting.
   *   **Step 4. User Matching:** The engine iterables over the `draw_entries` snapshot containing active user scores, isolating exact matches (Match 5, Match 4, Match 3).
   *   **Step 5. Tiered Splits:** Determines the 40% / 35% / 25% payouts exactly as documented, dispersing fractions to individual winners per tier and inserting those payloads into the `winners` table.
   *   **Step 6. Reversing Unclaimed Tiers:** If nobody matches a tier (e.g. Nobody hits Match 5), that specific tier's pence amount is re-injected back into a `thisMonthRollover` property attached to the new recorded Draw item, perpetuating the cycle.

**3. Dispatching Notifications (Internal API Route)**
*   **Files:** [src/app/api/emails/send/route.ts](file:///d:/golf_subscription/src/app/api/emails/send/route.ts) mapped to `src/emails/WinnerAlertEmail.tsx`
*   **Action:** Resolving the engine, the script fires a background asynchronous array of [fetch()](file:///d:/golf_subscription/src/app/admin/draws/page.tsx#18-24) calls internal to Next.js routes, instructing Resend to deliver beautifully rendered HTML React-email templates exclusively to the identified winning profiles.

---

## 4. The Charity Selection Flow

**1. The Selection Range (Frontend UI)**
*   **File:** [src/app/dashboard/charity/page.tsx](file:///d:/golf_subscription/src/app/dashboard/charity/page.tsx)
*   **Action:** The user utilizes a visual html range element ` <input type="range" min={10} max={100} step={5} /> ` to dial in their custom donation %.
*   **Logic:** The strict minimum (`10`) is statically enforced at the DOM level and the user clicks "Save Preferences". 

**2. Synchronizing Data (API Route)**
*   **File:** [src/app/api/subscription/route.ts](file:///d:/golf_subscription/src/app/api/subscription/route.ts)
*   **Action:** A [PATCH](file:///d:/golf_subscription/src/app/api/scores/%5Bid%5D/route.ts#5-36) request captures the `charity_id` and the raw integer `charity_percentage`.
*   **Logic:** The endpoint updates the singular `subscriptions` row mapped to the unique auth user with their newly modified parameters.

**3. Global Math Impact (Draws & Analytics)**
*   **Files:** [src/app/api/admin/draws/execute/route.ts](file:///d:/golf_subscription/src/app/api/admin/draws/execute/route.ts) and [src/app/admin/page.tsx](file:///d:/golf_subscription/src/app/admin/page.tsx)
*   **Logic:** Under the hood, changing the percentage dynamically alters how much of their base subscription (e.g. £9.99/mo) equates to `prize_pool_contribution_pence`. A user ramping up their charity slice to 100% mathematically throttles their distinct raw input against the global Prize Pool calculation without requiring any complex recalculations upon Draw Execution. The database fields dynamically represent exactly how the mathematical split resolves per subscriber.
