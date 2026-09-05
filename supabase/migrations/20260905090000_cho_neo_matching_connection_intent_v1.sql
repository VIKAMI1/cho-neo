-- Chợ Neo matching connection intention.
-- The profile remains private. A personal connection is only introduced when
-- both members explicitly choose the personal intention.

alter table public.cho_neo_matching_profiles
  add column if not exists connection_intent text not null default 'professional';

alter table public.cho_neo_matching_profiles
  drop constraint if exists cho_neo_matching_profiles_connection_intent;

alter table public.cho_neo_matching_profiles
  add constraint cho_neo_matching_profiles_connection_intent
  check (connection_intent in ('professional', 'friendship', 'personal'));

comment on column public.cho_neo_matching_profiles.connection_intent is
  'Private member intention: professional, friendship, or mutual personal connection.';

create index if not exists cho_neo_matching_profiles_connection_intent_idx
  on public.cho_neo_matching_profiles (connection_intent, status);
