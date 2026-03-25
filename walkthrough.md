# Golf Charity Subscription Platform - Final Walkthrough

The **Golf Charity Subscription Platform** has been fully developed using **Next.js 15 (App Router)**, **Supabase** (Auth & Database), and **Stripe** (Subscriptions & Billing). The application successfully merges a subscription-based golf score tracking system with a monthly charity prize draw.

This document serves as proof of work and a guide to the key components implemented.

---

## 🏗️ 1. Architecture & Tech Stack
- **Framework:** Next.js 15 (App Router) with full Server Components / Server Actions architecture.
- **Styling:** Custom Tailwind CSS (configured in [tailwind.config.js](file:///d:/golf_subscription/tailwind.config.js)) featuring a sleek, dark aesthetic (`#0f1117`, brand gradients, glassmorphism).
- **Database & Auth:** Supabase PostgreSQL. RLS (Row Level Security) is heavily enforced. We use multiple client abstractions (`browser`, `server`, and `admin`) across the app.
- **Payments:** Stripe (Checkout Sessions, Webhooks, Customer Portal).
- **Email:** Resend API for transactional email delivery.

---

## 💾 2. Database Schema & Supabase Logic
The backend relies on complex PostgreSQL triggers and generated columns to automate the business logic (completed in Phase 1):
1. **Rolling 5-Scores (`enforce_rolling_5_scores_trigger`)**: A trigger that acts on the `scores` table. When a user inserts a 6th score, the oldest is automatically deleted.
2. **Dynamic Prize Pools (`calculate_prize_pool`)**: Supabase functions calculate exactly how much money is sitting in the 40% (5-match), 35% (4-match), and 25% (3-match) pools based on active subscriptions.
3. **Number Generation**: Supabase RPC functions generate the 5 monthly drawn numbers:
   - `generate_random_draw_numbers()`: Pure SQL `random()`.
   - `generate_algorithmic_draw_numbers()`: Weighted algorithm based on the global frequency of user scores.

---

## 🔒 3. Authentication & Core API
- **Middleware Guard**: [src/middleware.ts](file:///d:/golf_subscription/src/middleware.ts) forces non-authenticated users out of `/dashboard` and non-admin users out of `/admin`.
- **Auth Flow**: Users can `register`, `login`, and reset their passwords securely. The `auth/callback` route ensures sessions are persisted across Server Components.
- **Stripe Webhook**: [src/app/api/stripe/webhook/route.ts](file:///d:/golf_subscription/src/app/api/stripe/webhook/route.ts) listens sequentially for `checkout.session.completed`, `customer.subscription.deleted`, and invoice payments, updating the `subscriptions` table directly via the Admin client (bypassing RLS).

---

## 🖥️ 4. User Dashboard
The core interface for golfers, built as a protected layout:
- **Overview Stats**: Features dynamic server-fetched data showing Rolling Scores count, Lifetime Wins, and Stripe Billing Contributions.
- **My Scores**: Full CRUD interface for inserting Stableford scores (capped at Date.now()).
- **Charity Selection**: Users can select from a radio list of active charities and use a custom range slider to configure their donation percentage (minimum 10% enforced).
- **Settings & Portal**: Directly links out to the Stripe Customer Portal for secure card updates and cancellations.

---

## 🌍 5. Public Pages
Designed to convert visitors with an emotion-driven UI:
- **Landing Page**: Features a custom dark-mode gradient hero, dynamic featured charities fetched from the database, and strong value propositions.
- **Charities Directory**: Users can browse and filter through available charities. Each slug (`/charities/[slug]`) dynamically renders a profile, linking directly back to Stripe checkout with that charity pre-selected.
- **Pricing Flow**: Monthly vs. Annual toggle UI firing server-side [POST](file:///d:/golf_subscription/src/app/api/auth/signout/route.ts#4-11) requests to Stripe to build dynamic checkout sessions on the fly.

---

## 👑 6. Admin Panel & Draw Engine
Only accessible to users with `is_admin = true` on their profile:
- **Analytics Overview**: Displays MRR (Monthly Recurring Revenue), total active subscriptions, and the actual £ splits between the global prize pool and charity allocations.
- **Charities/Users Management**: Full CRUD interface for adding and disabling charities, and viewing user histories.
- **The Draw Engine (`/api/admin/draws/execute`)**: This is the heart of the platform. When triggered:
  1. It calculates the active prize pool from Stripe subscriptions.
  2. Pulls in any Rollover funds from the previous month.
  3. Generates the 5 winning numbers via SQL.
  4. Scans all active user 5-scores.
  5. Splitting the prize pool 40/35/25 and assigning payouts. Unwon tiers are automatically merged into `rollover_amount_pence` string for next month.
  6. Sends asynchronous **Winner Alert Emails** via Resend.
- **Winners Verification**: Admins can review uploaded screenshots and mark payouts as 'Paid', completing the lifecycle.

---

## ✅ Final Validation
The application adheres strictly to Next.js 15 paradigms (all `params` and `searchParams` are awaited promises) and relies on best-in-class security (Supabase SSR + Stripe). The project is ready to be launched and scaled.
