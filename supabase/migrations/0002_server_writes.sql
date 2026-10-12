-- The Next.js server is the only writer: it validates permissions in server actions and
-- writes with the service-role key. Browser clients (anon key + user JWT) are read-only,
-- scoped by the RLS read policies from 0001.

-- Profiles carry the auth email so teammates can see it.
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

-- Free-form project description shown on the deal page.
alter table public.deals add column if not exists description text;

-- Stage history and won/lost status are maintained by the app.
drop trigger if exists deals_stage_change on public.deals;

-- Drop direct-write policies.
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists org_update on public.organizations;
drop policy if exists member_write on public.memberships;
drop policy if exists team_write on public.teams;
drop policy if exists pipelines_write on public.pipelines;
drop policy if exists stages_write on public.stages;
drop policy if exists tags_write on public.tags;
drop policy if exists lost_reasons_write on public.lost_reasons;
drop policy if exists products_write on public.products;
drop policy if exists invitations_write on public.invitations;
drop policy if exists companies_write on public.companies;
drop policy if exists contacts_write on public.contacts;
drop policy if exists deals_write on public.deals;
drop policy if exists activities_write on public.activities;
drop policy if exists activities_update on public.activities;
drop policy if exists notes_write on public.notes;
drop policy if exists deal_tags_write on public.deal_tags;
drop policy if exists deal_products_write on public.deal_products;
drop policy if exists notifications_update on public.notifications;
drop policy if exists views_all on public.saved_views;

create policy views_read on public.saved_views for select
  using (user_id = auth.uid() or (is_shared and public.is_member(organization_id)));

-- Deal change history (audit) is part of the deal timeline, so members can read it.
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select using (public.is_member(organization_id));
create index if not exists audit_entity_idx on public.audit_logs (entity, entity_id, created_at);

-- Invitation tokens are visible to admins only.
drop policy if exists invitations_read on public.invitations;
create policy invitations_read on public.invitations for select
  using (public.has_role(organization_id, array['owner','admin']));

-- Deleting a record clears references instead of failing.
alter table public.contacts
  drop constraint contacts_company_id_fkey,
  add constraint contacts_company_id_fkey foreign key (company_id) references public.companies (id) on delete set null,
  drop constraint contacts_owner_id_fkey,
  add constraint contacts_owner_id_fkey foreign key (owner_id) references public.profiles (id) on delete set null;

alter table public.companies
  drop constraint companies_owner_id_fkey,
  add constraint companies_owner_id_fkey foreign key (owner_id) references public.profiles (id) on delete set null;

alter table public.deals
  drop constraint deals_company_id_fkey,
  add constraint deals_company_id_fkey foreign key (company_id) references public.companies (id) on delete set null,
  drop constraint deals_primary_contact_id_fkey,
  add constraint deals_primary_contact_id_fkey foreign key (primary_contact_id) references public.contacts (id) on delete set null,
  drop constraint deals_lost_reason_id_fkey,
  add constraint deals_lost_reason_id_fkey foreign key (lost_reason_id) references public.lost_reasons (id) on delete set null;

alter table public.teams
  drop constraint teams_leader_id_fkey,
  add constraint teams_leader_id_fkey foreign key (leader_id) references public.profiles (id) on delete set null;

alter table public.memberships
  drop constraint memberships_team_id_fkey,
  add constraint memberships_team_id_fkey foreign key (team_id) references public.teams (id) on delete set null;

alter table public.stage_history
  drop constraint stage_history_from_stage_id_fkey,
  add constraint stage_history_from_stage_id_fkey foreign key (from_stage_id) references public.stages (id) on delete set null,
  drop constraint stage_history_to_stage_id_fkey,
  add constraint stage_history_to_stage_id_fkey foreign key (to_stage_id) references public.stages (id) on delete cascade,
  drop constraint stage_history_changed_by_fkey,
  add constraint stage_history_changed_by_fkey foreign key (changed_by) references public.profiles (id) on delete set null;

alter table public.audit_logs
  drop constraint audit_logs_user_id_fkey,
  add constraint audit_logs_user_id_fkey foreign key (user_id) references public.profiles (id) on delete set null;

create index if not exists notes_deal_idx on public.notes (deal_id);
create index if not exists activities_deal_idx on public.activities (deal_id);
create index if not exists stage_history_deal_idx on public.stage_history (deal_id);
create index if not exists notifications_user_idx on public.notifications (user_id, read_at);
