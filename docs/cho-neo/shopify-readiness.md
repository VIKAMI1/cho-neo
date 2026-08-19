# Chợ Neo × VIKAMI Shopify readiness

This is the launch handoff for the first Chợ Neo → VIKAMI shop gate.

## Current implementation

- Chợ Neo route: `/cho-neo/pho-cho`
- Gate label: `Ghé Tiệm VIKAMI / VIKAMI Shop`
- Shopify destination: configured only by `NEXT_PUBLIC_VIKAMI_SHOP_URL`
- Pilot collection handle: `vikami-pilot-selected-products`
- Lộc issuance: OFF
- Shopify ↔ Lộc connection: DISCONNECTED
- Discount campaign: not created

The gate accepts only an HTTPS destination and opens it in a new tab. If the
environment variable is missing or invalid, the gate remains a safe preview
with no outbound commerce link.

## Read-only Shopify audit before enabling the link

Record the date, storefront domain, and reviewer, then verify:

1. The initial pilot collection contains only the selected active products.
2. Product names, prices, variants, inventory, images, descriptions, and
   availability are correct on mobile.
3. The journey works end to end: Chợ Neo → gate → collection → product → cart
   → checkout.
4. Checkout stays on the approved Shopify domain, with no unexpected popup,
   redirect, or branding mismatch.
5. Shopify is authoritative only for products, inventory, cart, checkout, and
   payment. It does not decide Chợ Neo reward eligibility.

Only after that audit passes should `NEXT_PUBLIC_VIKAMI_SHOP_URL` be set to the
canonical pilot collection URL. Do not add discount parameters or a Lộc token
to the URL.

## Phase-two values (reference only)

These values are recorded for the later server-authorized connection and are
not active in the gate:

- Campaign: `vikami-green-pilot-v1`
- Source: `xin-xam`
- Reward: `10%`
- Validity: `48 hours`
- Scope: `vikami-pilot-selected-products`
- Entitlement: one per member/campaign
- Redemption: one controlled redemption
