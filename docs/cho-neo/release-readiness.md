# Chợ Neo release-readiness gate

This checklist applies to the Tìm Bạn Trong Nghề feature. Passing the source
checks does not prove that the Supabase project or the live scheduler is ready.

## Required before private beta

- [ ] Apply migrations to a disposable Supabase project first.
- [ ] Confirm the service-role-only RPCs exist and client roles cannot execute
      them: `consume_cho_neo_enrollment_attempt` and
      `create_cho_neo_introduction`.
- [ ] Confirm `CHO_NEO_INVITE_ADMIN_USER_IDS` contains only the intended owner
      account IDs, and those accounts are verified and not suspended.
- [ ] Open `/cho-neo/admin/reports` with the owner account.
- [ ] Submit a test report and verify that the report appears in the queue with
      its reason, details, and temporary message evidence.
- [ ] Verify that marking a report resolved and suspending the reported member
      both work, and that a suspended member cannot reopen matching.
- [ ] Confirm Supabase PITR/backups are enabled for the actual project, record
      the retention window, and complete one restore test before launch.
- [ ] Keep the applied migration files immutable; use a new forward migration
      for every later database change.

## Required before public beta

- [ ] Obtain written compliance approval for self-attested adult access in the
      launch jurisdictions.
- [ ] Review the report queue at least daily and define who can suspend an
      account and how an appeal is handled.
- [ ] Decide whether to add live pending-state updates and any additional
      abuse-alerting channel.

## Automated gate

Every pull request targeting `main` must pass:

```text
npm run test:cho-neo
npm run typecheck
npm run build
```

The build requires the deployment environment's Supabase variables. A local
build with placeholder values only verifies compilation and page generation; it
does not verify a live database connection.

For GitHub Actions, configure these repository Actions secrets with the
non-production Cho Neo project values:

    CHO_NEO_SUPABASE_URL
    CHO_NEO_SUPABASE_ANON_KEY

Never add SUPABASE_SERVICE_ROLE_KEY to the workflow or expose it to the
browser.
