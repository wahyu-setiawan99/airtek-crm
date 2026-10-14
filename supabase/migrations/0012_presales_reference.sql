-- A Sales deal can point to the Presales project it came from (user decision 14 Oct 2026).
-- The app only allows a reference when both deals share a product tag.

alter table public.deals
  add column if not exists presales_deal_id uuid references public.deals (id) on delete set null;

create index if not exists deals_presales_ref_idx on public.deals (presales_deal_id) where presales_deal_id is not null;

notify pgrst, 'reload schema';
