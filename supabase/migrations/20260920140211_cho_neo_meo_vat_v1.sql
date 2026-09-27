-- Mẹo Vặt V1: member submitted salon and life tips with admin publication.

create table if not exists public.cho_neo_meo_vat_tips (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  category text not null,
  title text not null,
  body text not null,
  status text not null default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cho_neo_meo_vat_tips_category_check
    check (category in ('nail_tips', 'salon_business', 'products', 'vietnamese_life')),
  constraint cho_neo_meo_vat_tips_title_length_check
    check (char_length(title) between 1 and 100),
  constraint cho_neo_meo_vat_tips_body_length_check
    check (char_length(body) between 1 and 3000),
  constraint cho_neo_meo_vat_tips_status_check
    check (status in ('pending_review', 'published', 'rejected', 'hidden'))
);

create table if not exists public.cho_neo_meo_vat_reports (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.cho_neo_meo_vat_tips(id) on delete cascade,
  reporter_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  reason text not null,
  details text,
  review_status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint cho_neo_meo_vat_reports_reason_check
    check (reason in ('inappropriate', 'spam', 'unsafe', 'other')),
  constraint cho_neo_meo_vat_reports_details_length_check
    check (details is null or char_length(details) <= 500),
  constraint cho_neo_meo_vat_reports_review_status_check
    check (review_status in ('open', 'reviewing', 'resolved')),
  constraint cho_neo_meo_vat_reports_unique_tip_reporter
    unique (tip_id, reporter_user_id)
);

create index if not exists cho_neo_meo_vat_tips_public_feed_idx
  on public.cho_neo_meo_vat_tips (created_at desc)
  where status = 'published';
create index if not exists cho_neo_meo_vat_tips_category_feed_idx
  on public.cho_neo_meo_vat_tips (category, created_at desc)
  where status = 'published';
create index if not exists cho_neo_meo_vat_tips_author_idx
  on public.cho_neo_meo_vat_tips (author_user_id, created_at desc);
create index if not exists cho_neo_meo_vat_reports_review_idx
  on public.cho_neo_meo_vat_reports (review_status, created_at asc);

create or replace function public.set_cho_neo_meo_vat_tip_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cho_neo_meo_vat_tip_updated_at
  on public.cho_neo_meo_vat_tips;
create trigger set_cho_neo_meo_vat_tip_updated_at
  before update on public.cho_neo_meo_vat_tips
  for each row execute function public.set_cho_neo_meo_vat_tip_updated_at();

alter table public.cho_neo_meo_vat_tips enable row level security;
alter table public.cho_neo_meo_vat_reports enable row level security;

revoke all on public.cho_neo_meo_vat_tips from anon, authenticated;
revoke all on public.cho_neo_meo_vat_reports from anon, authenticated;

grant select (id, category, title, body, status, created_at, updated_at)
  on public.cho_neo_meo_vat_tips to anon, authenticated;
grant insert (author_user_id, category, title, body)
  on public.cho_neo_meo_vat_tips to authenticated;
grant update (category, title, body)
  on public.cho_neo_meo_vat_tips to authenticated;
grant delete on public.cho_neo_meo_vat_tips to authenticated;
grant insert (tip_id, reporter_user_id, reason, details)
  on public.cho_neo_meo_vat_reports to authenticated;

create policy cho_neo_meo_vat_tips_read_published
  on public.cho_neo_meo_vat_tips for select to anon, authenticated
  using (status = 'published');
create policy cho_neo_meo_vat_tips_read_own
  on public.cho_neo_meo_vat_tips for select to authenticated
  using (author_user_id = (select auth.uid()));
create policy cho_neo_meo_vat_tips_insert_verified_own
  on public.cho_neo_meo_vat_tips for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and status = 'pending_review'
    and exists (
      select 1 from public.cho_neo_member_profiles profile
      where profile.user_id = (select auth.uid())
        and profile.membership_status = 'verified_nail_member'
        and profile.suspended_at is null
    )
  );
create policy cho_neo_meo_vat_tips_update_own
  on public.cho_neo_meo_vat_tips for update to authenticated
  using (
    author_user_id = (select auth.uid())
    and exists (
      select 1 from public.cho_neo_member_profiles profile
      where profile.user_id = (select auth.uid())
        and profile.membership_status = 'verified_nail_member'
        and profile.suspended_at is null
    )
  )
  with check (author_user_id = (select auth.uid()));
create policy cho_neo_meo_vat_tips_delete_own
  on public.cho_neo_meo_vat_tips for delete to authenticated
  using (
    author_user_id = (select auth.uid())
    and exists (
      select 1 from public.cho_neo_member_profiles profile
      where profile.user_id = (select auth.uid())
        and profile.membership_status = 'verified_nail_member'
        and profile.suspended_at is null
    )
  );

create policy cho_neo_meo_vat_reports_insert_verified_non_author
  on public.cho_neo_meo_vat_reports for insert to authenticated
  with check (
    reporter_user_id = (select auth.uid())
    and exists (
      select 1 from public.cho_neo_member_profiles profile
      where profile.user_id = (select auth.uid())
        and profile.membership_status = 'verified_nail_member'
        and profile.suspended_at is null
    )
    and exists (
      select 1 from public.cho_neo_meo_vat_tips tip
      where tip.id = tip_id and tip.status = 'published'
        and tip.author_user_id <> (select auth.uid())
    )
  );

select pg_notify('pgrst', 'reload schema');
