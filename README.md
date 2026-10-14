# CandleX

CandleX is a responsive trading journal published with GitHub Pages:

https://dopexa.github.io/candlex-trading-journal/

The hosted site uses Supabase Auth and private, user-owned journal data. New users can register with email confirmation, create and archive personal, prop firm, or demo trading accounts, set balance and risk limits, and switch the dashboard, calendar, journal, and statistics between one account and all accounts. Daily P/L notes feed the monthly calendar summary and account balances. Existing account labels and trades remain supported. The current backend configuration and database safeguards are documented in [`SETUP.md`](SETUP.md); [`migration-20261014-daily-results.sql`](migration-20261014-daily-results.sql) adds daily results to an existing project, while [`schema.sql`](schema.sql) is the full setup reference for a new Supabase project.

The public **Prop firm deals** page links to Lucid Trading, Tradeify, and Apex Trader Funding. It reads verified, publicly shareable offers from [`prop-firm-deals.json`](prop-firm-deals.json); see [`PROP_FIRM_DEALS.md`](PROP_FIRM_DEALS.md) for the offer format and review rules. No automated deal feeds are configured yet.

Only the Supabase publishable key belongs in `hosted-backend.js`. Never publish a database password, `sb_secret_...` key, or `service_role` key.
