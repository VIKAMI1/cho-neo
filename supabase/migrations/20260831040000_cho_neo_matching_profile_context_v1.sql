-- Optional personal context and required professional context for private introductions.
-- Age and gender are member-supplied, optional, and must not be treated as
-- compatibility scores. Profiles remain private and owner-assisted.

alter table public.cho_neo_matching_profiles
  add column if not exists experience_range text,
  add column if not exists age_range text,
  add column if not exists gender text,
  add column if not exists languages text[] not null default '{}';

alter table public.cho_neo_matching_profiles
  add constraint cho_neo_matching_profiles_experience_range
    check (experience_range is null or experience_range in (
      'Mới vào nghề', '1–3 năm', '4–7 năm', '8–12 năm', '13+ năm'
    )),
  add constraint cho_neo_matching_profiles_age_range
    check (age_range is null or age_range in (
      '18–24', '25–34', '35–44', '45–54', '55+'
    )),
  add constraint cho_neo_matching_profiles_gender
    check (gender is null or gender in (
      'Nữ', 'Nam', 'Khác', 'Không muốn nói'
    )),
  add constraint cho_neo_matching_profiles_languages
    check (
      cardinality(languages) between 1 and 4
      and languages <@ array['Việt', 'English', 'Vietlish', 'Español', 'Khác']::text[]
    );

comment on column public.cho_neo_matching_profiles.experience_range is
  'Member-supplied nail-industry experience band.';
comment on column public.cho_neo_matching_profiles.age_range is
  'Optional member-supplied age band; context only, never a compatibility score.';
comment on column public.cho_neo_matching_profiles.gender is
  'Optional member-supplied gender; context only, never a compatibility score.';
comment on column public.cho_neo_matching_profiles.languages is
  'Languages the member is comfortable using in an introduction.';
