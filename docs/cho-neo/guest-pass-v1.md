# Thẻ Chợ Neo V1

Thẻ Chợ Neo V1 keeps Chợ Neo public for browsing. A visitor receives an
anonymous Supabase session only when they attempt an identity-requiring action,
starting with Góc Bình Chọn.

## Runtime Settings

Manual settings still required before deployment:

- Enable Supabase anonymous sign-ins.
- Enable Supabase Auth CAPTCHA protection with Cloudflare Turnstile.
- Add the Turnstile site key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Keep the Turnstile secret only in Supabase Bot and Abuse Protection settings.

Do not put the Turnstile secret in browser code, Git, Vercel public variables, or
documentation examples.

## Profile Schema

`docs/cho-neo/room-vote-v1.sql` creates `public.cho_neo_guest_profiles`.

The stable identity is `auth.users.id`, not localStorage. Display names are not
globally unique. Avatar keys must come from the approved Chợ Neo avatar allowlist.

## RLS Audit

Current repository SQL files that grant broad access:

- `public.cho_neo_room_votes` had insert and update policies without an explicit
  role or `auth.uid()` ownership check. Once anonymous Supabase users are
  enabled, this could let anonymous authenticated users insert or update rows not
  tied to their user ID. V1 revises this to require `voter_user_id = auth.uid()`
  and an active guest profile.
- `public.cho_neo_room_votes` public read policy remains intentional because the
  application only exposes aggregate-safe results and hides totals below 10.
- `docs/cho-neo/shared-gossip-memory-v1.sql` includes public/anonymous-style
  front-counter memory policies. Posting rules must be audited again before Thẻ
  Chợ Neo is connected to posting.

No admin or moderator permission may be inferred from the `authenticated` role.
Anonymous Supabase users also use `authenticated`, so policy checks must use
ownership, profile status, and the JWT `is_anonymous` claim where anonymous and
permanent users diverge.

## Cleanup Boundary

Anonymous auth records are not automatically cleaned up.

Future cleanup should be a manual, reviewed operation that finds old anonymous
users with no votes, posts, comments, reactions, saves, or other owned content.
V1 provides no automatic deletion.

Read-only audit query sketch:

```sql
select profile.user_id, profile.display_name, profile.created_at, profile.last_seen_at
from public.cho_neo_guest_profiles profile
left join public.cho_neo_room_votes vote
  on vote.voter_user_id = profile.user_id
where vote.id is null
  and profile.last_seen_at < now() - interval '180 days'
order by profile.last_seen_at asc;
```

## QR Transfer V2 Boundary

QR transfer is explicitly out of V1.

A future design must use a server-issued one-time token with short expiry,
single redemption, explicit approval on the existing device, no session or
refresh token inside the QR, and immediate invalidation after transfer.
