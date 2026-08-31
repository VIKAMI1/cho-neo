-- Quầy Xã Giao global discovery foundation.
-- Profiles remain private and introductions remain owner-assisted.

alter table public.cho_neo_matching_profiles
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists discovery_scope text not null default 'nearby';

alter table public.cho_neo_matching_profiles
  add constraint cho_neo_matching_profiles_country_length
    check (country is null or char_length(country) between 2 and 80),
  add constraint cho_neo_matching_profiles_region_length
    check (region is null or char_length(region) between 2 and 80),
  add constraint cho_neo_matching_profiles_discovery_scope
    check (discovery_scope in ('nearby', 'country', 'worldwide'));

create index if not exists cho_neo_matching_profiles_global_discovery_idx
  on public.cho_neo_matching_profiles (
    status,
    discovery_scope,
    lower(country),
    lower(region),
    lower(city)
  );

comment on column public.cho_neo_matching_profiles.country is
  'Member-supplied country for private discovery; never an exact address.';
comment on column public.cho_neo_matching_profiles.region is
  'Optional member-supplied province, state, or region.';
comment on column public.cho_neo_matching_profiles.discovery_scope is
  'Maximum discovery circle chosen by the member: nearby, country, or worldwide.';
