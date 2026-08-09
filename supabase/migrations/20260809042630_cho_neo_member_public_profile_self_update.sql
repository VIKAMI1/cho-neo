revoke update on table public.cho_neo_member_profiles from authenticated;

grant update (
  display_name,
  normalized_display_name,
  avatar_key,
  updated_at
) on table public.cho_neo_member_profiles to authenticated;

drop policy if exists "Cho Neo verified members can update own public profile"
  on public.cho_neo_member_profiles;

create policy "Cho Neo verified members can update own public profile"
on public.cho_neo_member_profiles
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and membership_status = 'verified_nail_member'
)
with check (
  (select auth.uid()) = user_id
  and membership_status = 'verified_nail_member'
);

alter table public.cho_neo_member_profiles
  drop constraint if exists cho_neo_member_profiles_avatar_key_allowed;

alter table public.cho_neo_member_profiles
  add constraint cho_neo_member_profiles_avatar_key_allowed
  check (
    avatar_key is null
    or avatar_key = any (array[
      'nail-tech-female',
      'nail-tech-male',
      'salon-owner-female',
      'salon-owner-male',
      'gossip-cafe-regular',
      'style-lover',
      'bling-bling-girl',
      'color-queen',
      'auntie-owner',
      'bubble-tea-tech',
      'creative-soul',
      'female-salon-owner',
      'front-counter-pro',
      'golden-scissors',
      'gossip-auntie',
      'lucky-cat-friend',
      'male-salon-owner',
      'market-runner',
      'nail-tech',
      'nail-tech-guy',
      'new-village-guest',
      'ong-dia-buddy',
      'product-hunter',
      'quiet-listener',
      'salon-queen',
      'show-off-gay',
      'uncle-coffee',
      'weekend-warrior',
      'young-nail-tech'
    ]::text[])
  ) not valid;
