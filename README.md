# CandleX

CandleX is a responsive trading journal published with GitHub Pages:

https://dopexa.github.io/candlex-trading-journal/

The site includes Sign In and Sign Up panels. To enable real account registration and persistent, user-owned trades and screenshots, configure `hosted-backend.js` with a Supabase Project URL and publishable key, then apply [`schema.sql`](schema.sql) as described in [`SETUP.md`](SETUP.md). Until then, the page explains that hosted accounts are being configured and offers the existing offline journal.

Only the Supabase publishable key belongs in `hosted-backend.js`. Never publish a database password, `sb_secret_...` key, or `service_role` key.
