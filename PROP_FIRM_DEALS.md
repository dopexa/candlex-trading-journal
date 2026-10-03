# Prop firm offers

CandleX reads `prop-firm-deals.json` on the public Prop firm deals page. The catalog links to the official offer pages for Lucid Trading, Tradeify, and Apex Trader Funding.

Only add an offer when its discount and code are publicly shareable under the firm's offer terms. The page hides offers that are expired, not marked publicly shareable, or were not verified in the last 72 hours. Visitors are linked to the firm's official page to check eligible account types and the final checkout price.

## Offer format

Add an item to the `offers` array:

```json
{
  "firmId": "tradeify",
  "discount": "35% off",
  "code": "EXAMPLE",
  "startsAt": "2026-10-04T00:00:00Z",
  "expiresAt": "2026-11-01T23:59:00-05:00",
  "verifiedAt": "2026-10-04T12:00:00Z",
  "publiclyShareable": true
}
```

`firmId` must be `lucid`, `tradeify`, or `apex`. `code`, `discount`, `description`, and `startsAt` can be omitted when they do not apply. Use an explicit timezone in dates. Update `verifiedAt` only after checking the official source and offer terms. No public feeds or API endpoints are configured yet; adding an item to this file is currently a manual review step.
