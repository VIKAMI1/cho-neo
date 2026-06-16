# Ong Dia / Xin Xam Sticky V1 Plan

## Decision

Freeze the existing Cloudflare Worker for now.

Do not deploy it. Do not reconnect Cho Neo to it as part of Sticky V1. Use the Worker only as a legacy backend reference until its API contract, data shape, generated types, CORS posture, visitor key strategy, and deployment mapping are cleaned up.

Build Cho Neo Sticky V1 frontend-local first.

Use the 96 existing sticks as the known seed corpus. V1 should focus on ritual UX, route clarity, localStorage comeback memory, and Vietnamese-first copy. Future expansion can grow from 96 to 120, 240, or 600 sticks only after the ritual spine works.

## Product Purpose

Ong Dia is the shrine.

Xin Xam is the ritual.

The feature should give people a warm reason to come back to Cho Neo: a daily or weekly cultural pause that feels familiar to a Vietnamese nail village, gently practical, and worth revisiting without becoming a slot-machine loop.

## Current Repo Findings

- Existing Xin Xam route: `src/app/xin-xam/page.tsx`
- Existing Cho Neo shrine route: `src/app/cho-neo/shrine/page.tsx`
- Village links to the shrine from `src/app/cho-neo/page.tsx`
- Existing reusable component: `src/components/XinXamButton.tsx`
- Existing canon docs:
  - `CHO_NEO_XIN_XAM_CANON_V0.md`
  - `CHO_NEO_ONG_DIA_CANON_V0.md`
- Current frontend calls `NEXT_PUBLIC_OD_BASE` or falls back to `https://api.vikami.ca`
- Known frontend-used endpoints:
  - `/xin-xam/draw`
  - `/xin-xam/refresh`
  - `/od/today`
  - `/od/refresh`
- Existing topic keys:
  - `tien`
  - `tiem`
  - `tinh`
  - `ban-than`
- Existing luck levels:
  - `DAI_CAT`
  - `CAT`
  - `BINH`
  - `HUNG`
- The confirmed existing corpus is a 96-stick seed corpus, not a 600-verse dataset.
- Cloudflare Worker source was not found inside the Cho Neo repo.
- Gossip Cafe is not functionally connected.

## Cloudflare Worker Reference

Known Worker folder: `ong-dia-worker`

Known Worker files:

- `src/index.ts`
- `src/quotes.ts`
- `src/xinxam.ts`
- `wrangler.jsonc`

Known Worker routes:

- `GET /health`
- `GET /od/today`
- `GET /ong-dia/today`
- `GET /ongdia/today`
- `POST /od/refresh`
- `POST /ong-dia/refresh`
- `POST /ongdia/refresh`
- `GET|POST /xin-xam/draw`
- `GET|POST /xinxam/draw`
- `POST /xin-xam/refresh`
- `POST /xinxam/refresh`

The Worker supports `/api/*` and `/v1/*` path normalization.

The Worker uses KV binding `OD_KV`.

It stores daily Ong Dia quotes by `visitor_id` and UTC date. It stores Xin Xam by `visitor_id`, period kind, period key, and category.

Known refresh limits:

- Ong Dia: 2 refreshes per UTC day
- Xin Xam: 1 refresh per period

Known content limits:

- 96 Xin Xam sticks total:
  - `TIEN`: 24
  - `TIEM`: 24
  - `TINH`: 24
  - `BAN_THAN`: 24
- 7 Ong Dia quotes
- 96-stick existing seed corpus only
- No wish rituals

Known Worker risks:

- Dirty local files
- Stale tests
- Stale generated Worker types
- Wide-open CORS
- Visitor IDs stored directly in KV keys
- UTC timing instead of user-local day
- Missing or invalid Xin Xam topic defaults to `TIEN`
- No abuse protection beyond KV state
- Worker repo config does not prove the `api.vikami.ca` production mapping

## Route Strategy

Preserve `/xin-xam` for old links.

Keep `/cho-neo/shrine` as the main Cho Neo shrine room.

Later, add `/cho-neo/xin-xam` as either:

- the Cho Neo-native ritual route, or
- a small helper redirect into the preserved root `/xin-xam` route.

Do not break old `/xin-xam`.

## Sticky Comeback V1

V1 should be local-first and small:

- Use `localStorage` only.
- Do not use Supabase.
- Do not add auth.
- Do not depend on the Cloudflare Worker.
- Do not add AI generation.
- Do not deploy the Worker.
- Allow one draw per topic and period per browser.
- Same-day or same-week return should show the saved result.
- Save the last 7 results locally.
- Avoid an infinite reroll feeling.

## Topic Order

Use this order in the Cho Neo UI:

1. Tiệm
2. Tiền
3. Tình
4. Bản thân

## Data Contract

Future Cho Neo-native Xin Xam records should use this shape:

```ts
type ChoNeoXinXamStick = {
  id: string;
  topic: "tiem" | "tien" | "tinh" | "ban-than";
  luck: "DAI_CAT" | "CAT" | "BINH" | "HUNG";
  title: string;
  lucBat: string;
  meaning: string;
  advice: string;
  comebackLine: string;
  periodKind: "day" | "week";
  periodKey: string;
};
```

Use `lucBat` in new Cho Neo data, even though the old Worker response uses `poem`.

## Guardrails

- Treat Xin Xam as cultural reflection, not guaranteed fortune.
- Do not present medical, legal, or financial certainty.
- Avoid gambling language.
- Avoid slot-machine reroll UX.
- Keep public copy Vietnamese-first.
- Use a warm Ong Dia voice.
- Keep advice practical for salon life.
- Keep the ritual calm, not addictive.

## Implementation Phases

### Phase 1: Shrine Polish And Local Samples

Polish the existing Cho Neo shrine route without changing Gossip Cafe. Add a small local sample set to prove the ritual shape and tone.

### Phase 2: Structured Data And Sticky Logic

Add a structured Xin Xam data file and localStorage sticky logic:

- one result per topic and period
- saved same-period result
- last 7 local results
- clear return copy
- no infinite reroll loop

### Phase 3: Future Expanded Luc Bat Corpus

Use the 96 existing sticks as the known seed corpus. After the ritual spine works, expand intentionally into a larger luc bat corpus. Future growth can move from 96 to 120, 240, or 600 sticks, but V1 should not chase or depend on a missing 600-verse dataset.

### Phase 4: Optional Worker Reconnection

Reconnect to the Worker only after:

- source of truth is clear
- `api.vikami.ca` mapping is verified
- CORS is narrowed
- visitor key storage is reviewed
- topic/luck contracts are aligned
- generated Worker types and tests are fresh

### Phase 5: Optional Sharing And Seasonal Shrine

Add share-card polish or seasonal shrine treatments after the core sticky ritual is stable.

## Risks

- The old Worker may not match `api.vikami.ca`.
- The known corpus is 96 sticks; do not chase or depend on a missing 600-verse dataset.
- Existing root `/xin-xam` and Cho Neo `/cho-neo/shrine` routes are split.
- Current Worker response uses `poem`, while future Cho Neo data should use `lucBat`.
- Topic casing differs between frontend and Worker.
- Refresh logic could feel like gambling if not handled carefully.
- LocalStorage-only V1 will not sync across browsers or devices.
- Browser clearing/private mode will reset the ritual state.

## Safest V1 Path

Start with Cho Neo-native, frontend-local Sticky V1:

1. Keep `/cho-neo/shrine` as the main shrine.
2. Preserve `/xin-xam`.
3. Use the 96 existing sticks as the known seed corpus.
4. Store one draw per topic and period in localStorage.
5. Show saved same-period results on return.
6. Keep the Worker frozen until a separate backend cleanup task.

This gives Cho Neo the comeback ritual quickly while avoiding stale Worker behavior, missing data assumptions, and accidental production API drift.
