# CandleX

CandleX is a responsive trading journal published with GitHub Pages:

https://dopexa.github.io/candlex-trading-journal/

The site includes Sign In and Sign Up panels. To enable real account registration and persistent, user-owned trades and screenshots, configure `hosted-backend.js` with a Supabase Project URL and publishable key, then apply [`schema.sql`](schema.sql) as described in [`SETUP.md`](SETUP.md). Until then, the page explains that hosted accounts are being configured and offers the existing offline journal.

The public **Prop firm deals** page links to Lucid Trading, Tradeify, and Apex Trader Funding. It reads verified, publicly shareable offers from [`prop-firm-deals.json`](prop-firm-deals.json); see [`PROP_FIRM_DEALS.md`](PROP_FIRM_DEALS.md) for the offer format and review rules. No automated deal feeds are configured yet.

Only the Supabase publishable key belongs in `hosted-backend.js`. Never publish a database password, `sb_secret_...` key, or `service_role` key.
