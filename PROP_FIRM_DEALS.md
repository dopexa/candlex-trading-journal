# Prop firm offers

CandleX reads `prop-firm-deals.json` on the public Prop firm deals page. Each offer card shows the discount, code (when published), restrictions, end date (when published), last checked date, and an official source link.

Only add an offer when its discount and code are publicly shareable under the firm's offer terms. The page hides offers that are expired, not marked publicly shareable, or were not verified in the last 72 hours. If a firm does not publish an end date, leave `expiresAt` out; the page labels the end date as unlisted and still hides the offer after 72 hours without a fresh check. Visitors are linked to an official source to check eligible account types and the final checkout price.

Lucid's terms prohibit sharing its promo codes and associated discounts publicly, so this catalog does not list Lucid codes or discounts. Its card links to Lucid's homepage for offers available directly to the visitor.

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
  "publiclyShareable": true,
  "sourceUrl": "https://tradeify.co/",
  "description": "Public offer details and any eligibility restrictions.",
  "confirmBeforePurchase": false
}
```

`firmId` must be `lucid`, `tradeify`, or `apex`. `code`, `discount`, `description`, `startsAt`, `expiresAt`, and `sourceUrl` can be omitted when they do not apply. Set `confirmBeforePurchase` to `true` if the official page is temporarily unavailable or current eligibility needs confirmation. Use an explicit timezone in dates. Update `verifiedAt` only after checking the official source and offer terms. No automated public offer feeds or API endpoints are configured; this file is updated after manual review.
