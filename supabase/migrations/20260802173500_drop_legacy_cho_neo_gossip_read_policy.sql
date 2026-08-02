-- Remove the legacy permissive read policy.
-- The canonical policy still allows only visible, non-removed messages.

drop policy if exists "Cho Neo gossip messages are readable"
  on public.cho_neo_gossip_messages;

select pg_notify('pgrst', 'reload schema');
