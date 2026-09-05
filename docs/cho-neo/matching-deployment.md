# Chợ Neo matching deployment

## Required configuration

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (used only to validate the bearer session)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose it to the browser)
- `CHO_NEO_INVITE_ADMIN_USER_IDS` (comma-separated UUIDs for verified, unsuspended administrators)

AI profile drafting is optional. If enabled, set `CHO_NEO_OPENAI_ENABLED=true` and
`OPENAI_API_KEY`; without them, members can still write their profile manually.

## Migration order and prerequisites

Apply the repository migrations once, in timestamp order. The matching migrations
are ordered as follows:

```text
20260830041414_cho_neo_matching_foundation_v1.sql
20260830193753_cho_neo_public_adult_trade_onboarding_v1.sql
20260831000529_fix_cho_neo_public_adult_trade_enrollment_conflict.sql
20260831003053_fix_cho_neo_public_adult_trade_enrollment_constraint.sql
20260831030000_cho_neo_global_discovery_v1.sql
20260831040000_cho_neo_matching_profile_context_v1.sql
20260831041000_cho_neo_contact_handoff_v1.sql
20260901040701_cho_neo_private_tables_v1.sql
20260903041004_cho_neo_contact_handoff_retention_v1.sql
```

The matching set expects the existing `cho_neo_member_profiles` table from the social-member migrations. On
legacy Guest Pass databases, the earlier migration must have renamed
`cho_neo_guest_profiles` to `cho_neo_member_profiles`; the follow-up constraint
migration canonicalizes its primary-key name before the enrollment RPC is used.

The private-table migration and the contact-retention migration require the
`pg_cron` extension and permission for the migration role to schedule jobs. The
contact cleanup job is uniquely named
`cho-neo-contact-handoff-retention-v1`; it deletes contact handoffs in bounded
batches of 500 whenever an introduction is closed, expired, passed, blocked, or
reported. Private messages and report evidence retain their existing 30-day
safety policy.

Run this read-only preflight query before release and after migration:

```sql
select jobname, schedule, active, command
from cron.job
where jobname = 'cho-neo-contact-handoff-retention-v1';
```

It must return exactly one active row with schedule `27 * * * *` and the exact
command stored in `20260903041004_cho_neo_contact_handoff_retention_v1.sql`.
The migration is rerun-safe for that identical definition and aborts if the
versioned name already has a different schedule, command, or active state.

Migrations are one-way and are not safe to blindly replay. Do not manually rerun a
partially applied migration or schedule duplicate jobs. Stop, inspect migration
history and database state, and recover with a reviewed corrective migration.

## Preflight and recovery

Before release, verify the three Supabase variables, the administrator UUID list,
the expected legacy schema state, `pg_cron` availability, and these two named
cron jobs: `cho-neo-private-table-retention` and
`cho-neo-contact-handoff-retention-v1`.
Run the focused matching tests, the relevant test suite, TypeScript, production
build, `git diff --check`, and migration contract checks.

If deployment must be reversed, roll back the application to the last known-good
deployment while preserving the applied database migrations. Do not remove tables,
drop policies, or replay migrations as an emergency rollback. Escalate any migration
failure for a reviewed SQL recovery plan.
