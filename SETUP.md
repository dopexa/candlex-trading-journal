# CandleX Supabase setup

The GitHub Pages site is static, so it cannot host its own password or session database. CandleX needs a backend before hosted Sign Up and Sign In can be enabled. This setup uses Supabase Auth, row-level security, and a private image bucket.

## Create the project

The CandleX organization is already set up on the free plan. Supabase now needs a database password before it can create the project. Enter that password directly in the Supabase form and submit **Create new project**. Keep the password private; CandleX's browser app will use the publishable key and authenticated sessions, not the database password.

After the project is ready:

1. Open **SQL Editor**, create a query, paste the contents of [`schema.sql`](schema.sql), and run it. This creates user-owned trade/preferences tables, restrictive row-level security policies, and a private screenshot bucket capped at 5 MB per image.
2. Set Supabase Auth's **Site URL** and **Redirect URLs** to `https://dopexa.github.io/candlex-trading-journal/`.
3. CandleX's hosted adapter needs the **Project URL** and **publishable key**. These are public browser configuration values; never use an `sb_secret_...` key or `service_role` key in the app.

Email confirmation can remain enabled; new users will need to confirm their address before their first sign-in. No credentials or real user data belong in this setup file.
