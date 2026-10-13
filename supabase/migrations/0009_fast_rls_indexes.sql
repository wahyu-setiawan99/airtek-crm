-- Faster read policies and missing indexes (AGENTS.md §15.7). Same rules as before, but the
-- membership check runs once per query instead of once per row:
--   is_member(organization_id)  ->  organization_id in (select public.my_org_ids())
--   exists(... deals ... is_member) on deal child tables  ->  deal_id in (select public.my_deal_ids())
-- Safe to run more than once.

create or replace function public.my_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select m.organization_id from public.memberships m where m.user_id = auth.uid();
$$;

create or replace function public.my_deal_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select d.id from public.deals d
  where d.organization_id in (select m.organization_id from public.memberships m where m.user_id = auth.uid());
$$;

grant execute on function public.my_org_ids() to authenticated;
grant execute on function public.my_deal_ids() to authenticated;

-- Tables readable by every member of the organization.
do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('activities', 'activities_read'),
      ('attachments', 'attachments_read'),
      ('audit_logs', 'audit_read'),
      ('companies', 'companies_read'),
      ('contacts', 'contacts_read'),
      ('custom_field_values', 'custom_field_values_read'),
      ('custom_fields', 'custom_fields_read'),
      ('deals', 'deals_read'),
      ('lost_reasons', 'lost_reasons_read'),
      ('memberships', 'member_read'),
      ('notes', 'notes_read'),
      ('pipelines', 'pipelines_read'),
      ('products', 'products_read'),
      ('sales_targets', 'sales_targets_read'),
      ('stages', 'stages_read'),
      ('tags', 'tags_read'),
      ('teams', 'team_read')
    ) as t(tbl, pol)
  loop
    execute format('drop policy if exists %I on public.%I', item.pol, item.tbl);
    execute format('create policy %I on public.%I for select using (organization_id in (select public.my_org_ids()))', item.pol, item.tbl);
  end loop;
end $$;

drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations for select using (id in (select public.my_org_ids()));

-- Deal child tables.
drop policy if exists deal_contacts_read on public.deal_contacts;
create policy deal_contacts_read on public.deal_contacts for select using (deal_id in (select public.my_deal_ids()));
drop policy if exists deal_products_read on public.deal_products;
create policy deal_products_read on public.deal_products for select using (deal_id in (select public.my_deal_ids()));
drop policy if exists deal_tags_read on public.deal_tags;
create policy deal_tags_read on public.deal_tags for select using (deal_id in (select public.my_deal_ids()));
drop policy if exists history_read on public.stage_history;
create policy history_read on public.stage_history for select using (deal_id in (select public.my_deal_ids()));

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select using (user_id = (select auth.uid()));

drop policy if exists views_read on public.saved_views;
create policy views_read on public.saved_views for select
  using (user_id = (select auth.uid()) or (is_shared and organization_id in (select public.my_org_ids())));

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (
  id = (select auth.uid())
  or id in (select theirs.user_id from public.memberships theirs where theirs.organization_id in (select public.my_org_ids()))
);

-- Indexes for the lookups above and the common filters.
create index if not exists memberships_user_org_idx on public.memberships (user_id, organization_id);
create index if not exists deals_owner_idx on public.deals (owner_id);
create index if not exists activities_org_due_idx on public.activities (organization_id, due_at);
create index if not exists activities_assigned_due_idx on public.activities (assigned_to, due_at);
create index if not exists notes_org_idx on public.notes (organization_id, created_at desc);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index if not exists companies_org_idx on public.companies (organization_id);
create index if not exists deal_contacts_deal_idx on public.deal_contacts (deal_id);
create index if not exists deal_products_deal_idx on public.deal_products (deal_id);
create index if not exists attachments_org_idx on public.attachments (organization_id);
create index if not exists custom_field_values_org_idx on public.custom_field_values (organization_id);
create index if not exists stages_pipeline_idx on public.stages (pipeline_id, position);
