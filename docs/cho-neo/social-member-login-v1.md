# Chợ Neo Social Member Login V1

Public visitors can browse Chợ Neo, music, room previews and public visible
content without creating a Supabase user. Voting, posting, reporting and future
member-only actions require a Supabase OAuth session plus a verified Chợ Neo nail
member profile.

## Provider Setup Required Later

Google:

- Authorized JavaScript origins: local development origin and the approved Chợ
  Neo Preview/Production origins.
- Supabase OAuth callback URL: use the callback URL shown in Supabase Auth
  provider settings.
- Store the Google Client ID/secret only in Supabase provider settings.
- Consent screen branding should say Chợ Neo and request only basic identity:
  `openid`, `email`, `profile`.

Facebook:

- Valid OAuth redirect URI: use the callback URL shown in Supabase Auth provider
  settings.
- Request only basic profile/email permission.
- Use Meta test users while the app is in development mode.
- Move to live mode only after Bao approves provider review and production
  testing.
- Store the App ID/secret only in Supabase provider settings.

Feature flags:

- `NEXT_PUBLIC_CHO_NEO_GOOGLE_LOGIN_ENABLED`
- `NEXT_PUBLIC_CHO_NEO_FACEBOOK_LOGIN_ENABLED`

Do not expose provider secrets or provider access tokens in browser code.

## Invitation Operations

Invitation codes are stored only as hashes in `cho_neo_member_invitations`.
The reusable plain code is shown only at creation time by a future
server-controlled owner operation, then discarded.

Operational SQL can list pending members, verify or suspend members, reinstate
members and revoke unused invitations. Those writes must be run only through
trusted owner tooling or Supabase SQL access, never browser code.

PostgreSQL/Supabase runtime acceptance remains a pre-deployment gate:
migrations must apply/reset/reapply, invitation redemption must be atomic, and
pending, rejected or suspended OAuth users must not gain community write access.
