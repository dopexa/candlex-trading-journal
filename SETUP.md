# CandleX Supabase configuration

CandleX's hosted site is connected to its existing Supabase project. Sign Up and Sign In use Supabase Auth; journal settings, trading accounts, trades, daily results, and screenshots are stored for the signed-in user.

## Current configuration

- `hosted-backend.js` contains the project URL and browser-safe publishable key. It must never contain a database password, `sb_secret_...` key, or `service_role` key.
- Supabase Auth's **Site URL** and **Redirect URLs** are set to `https://dopexa.github.io/candlex-trading-journal/`.
- Email registration is enabled. Users must confirm their email address before their first sign-in.
- Trading accounts remain in the `user_preferences.accounts` JSONB array, preserving the existing account and trade IDs.
- The `user_preferences`, `trades`, `daily_results`, and `trade_images` tables have row-level security enabled and per-user policies.
- The `trade-screenshots` Storage bucket is private and limits each image to 5 MB.

## Recreate the backend in another project

1. Create a Supabase project and keep its database password private.
2. Run [`schema.sql`](schema.sql) in the new project's SQL Editor. It creates the tables, policies, signup trigger, screenshot limits, monthly daily-result view, and private Storage bucket used by CandleX.
3. Set Auth's **Site URL** and **Redirect URLs** to the deployed CandleX URL.
4. Set the new project's URL and publishable key in `hosted-backend.js`. Use only the publishable key in browser code.

No database password or real user data belongs in this repository. Do not run the recreation steps against the existing project unless repairing a missing resource.

## Add daily results to an existing project

Run [`migration-20261014-daily-results.sql`](migration-20261014-daily-results.sql) in the existing project's SQL Editor. It only adds the `daily_results` table, its owner-only RLS policy, update trigger, and monthly summary view. It does not replace existing accounts or trade records. The browser API checks that a result references one of the signed-in user's saved accounts.

## CandleX v2 client update

The account and calendar experience uses the existing `user_preferences.accounts` JSONB array and `daily_results` table. The animation preference is stored in the existing `user_preferences.settings` JSONB object. This update does not require a database migration, new account table, or account ID conversion.

The starter `migration.sql` from the v2 specification is not compatible with this project's existing account model: it creates a separate UUID-based `prop_accounts` table and expects `daily_results.account_id` to reference it. Do not run that starter migration against this project. Legacy trade review fields remain in existing `trade_data` JSONB records and are preserved during trade edits, while the updated UI no longer shows them.
