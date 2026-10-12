-- Airtek CRM schema. RLS: members see their organization; viewers cannot write;
-- sales edit only records they own; manager+ can edit the organization.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  currency text not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  phone text,
  locale text not null default 'id',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  leader_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'sales', 'viewer')),
  team_id uuid references public.teams (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (organization_id, user_id)
);

create or replace function public.is_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.organization_id = org and m.user_id = auth.uid());
$$;

create or replace function public.has_role(org uuid, roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

create or replace function public.member_role(org uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role from public.memberships m where m.organization_id = org and m.user_id = auth.uid() limit 1;
$$;

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#0f766e',
  position integer not null default 0,
  is_default boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  probability integer not null default 0 check (probability between 0 and 100),
  rotting_days integer,
  type text not null default 'open' check (type in ('open', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  industry text, npwp text, address text, city text, province text,
  phone text, email text, website text,
  owner_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  company_id uuid references public.companies (id),
  job_title text, email text, phone text, whatsapp text, address text,
  owner_id uuid references public.profiles (id),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.lost_reasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  pipeline_id uuid not null references public.pipelines (id),
  stage_id uuid not null references public.stages (id),
  value numeric(18, 2) not null default 0,
  currency text not null default 'IDR',
  probability_override integer check (probability_override between 0 and 100),
  expected_close_date timestamptz,
  priority integer not null default 0 check (priority between 0 and 3),
  company_id uuid references public.companies (id),
  primary_contact_id uuid references public.contacts (id),
  owner_id uuid not null references public.profiles (id),
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  lost_reason_id uuid references public.lost_reasons (id),
  won_at timestamptz,
  lost_at timestamptz,
  position integer not null default 0,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  color text not null default '#0f766e',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.deal_tags (
  deal_id uuid not null references public.deals (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (deal_id, tag_id)
);

create table public.deal_contacts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  role text
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type text not null check (type in ('call', 'meeting', 'email', 'task', 'visit', 'whatsapp')),
  subject text not null,
  note text,
  due_at timestamptz not null,
  done_at timestamptz,
  result_note text,
  assigned_to uuid not null references public.profiles (id),
  deal_id uuid references public.deals (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  body text not null,
  deal_id uuid references public.deals (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sku text,
  unit text not null default 'unit',
  unit_price numeric(18, 2) not null default 0,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create table public.deal_products (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty numeric(18, 2) not null default 1,
  unit_price numeric(18, 2) not null default 0,
  discount_pct numeric(5, 2) not null default 0,
  subtotal numeric(18, 2) generated always as (qty * unit_price * (1 - discount_pct / 100)) stored
);

create table public.stage_history (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  from_stage_id uuid references public.stages (id),
  to_stage_id uuid not null references public.stages (id),
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  action text not null,
  diff jsonb not null default '{}',
  user_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pipeline_id uuid references public.pipelines (id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index deals_board_idx on public.deals (organization_id, pipeline_id, stage_id, position);
create index contacts_email_idx on public.contacts (organization_id, email);
create index activities_due_idx on public.activities (organization_id, assigned_to, due_at);

alter table public.deals add column search tsvector generated always as (to_tsvector('simple', coalesce(title, ''))) stored;
create index deals_search_idx on public.deals using gin (search);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare r record;
begin
  for r in select unnest(array[
    'organizations','profiles','teams','memberships','pipelines','stages','companies','contacts',
    'lost_reasons','deals','tags','activities','notes','products'
  ]) as tbl
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.touch_updated_at()', r.tbl);
  end loop;
end $$;

create or replace function public.log_stage_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
    insert into public.stage_history (deal_id, from_stage_id, to_stage_id, changed_by)
    values (new.id, old.stage_id, new.stage_id, auth.uid());
    if (select type from public.stages where id = new.stage_id) = 'won' then
      new.status = 'won';
      new.won_at = coalesce(new.won_at, now());
      new.lost_at = null;
    elsif (select type from public.stages where id = new.stage_id) = 'lost' then
      new.status = 'lost';
      new.lost_at = coalesce(new.lost_at, now());
      new.won_at = null;
    else
      new.status = 'open';
      new.won_at = null;
      new.lost_at = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger deals_stage_change before update on public.deals
for each row execute function public.log_stage_change();

create or replace function public.touch_deal_activity()
returns trigger language plpgsql as $$
begin
  if new.deal_id is not null then
    update public.deals set last_activity_at = now() where id = new.deal_id;
  end if;
  return new;
end;
$$;

create trigger activities_touch_deal after insert on public.activities
for each row execute function public.touch_deal_activity();
create trigger notes_touch_deal after insert on public.notes
for each row execute function public.touch_deal_activity();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.move_deal(p_deal uuid, p_stage uuid, p_position integer)
returns void language plpgsql security invoker as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.deals where id = p_deal;
  if not public.is_member(v_org) then
    raise exception 'forbidden';
  end if;
  update public.deals set stage_id = p_stage, position = p_position where id = p_deal;
end;
$$;

create or replace function public.pipeline_summary(p_pipeline uuid)
returns table (stage_id uuid, stage_name text, deal_count bigint, total_value numeric, weighted_value numeric)
language sql stable as $$
  select s.id, s.name, count(d.id),
    coalesce(sum(d.value) filter (where d.status = 'open'), 0),
    coalesce(sum(d.value * coalesce(d.probability_override, s.probability) / 100.0) filter (where d.status = 'open'), 0)
  from public.stages s
  left join public.deals d on d.stage_id = s.id
  where s.pipeline_id = p_pipeline and public.is_member(s.organization_id)
  group by s.id, s.name, s.position
  order by s.position;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.pipelines enable row level security;
alter table public.stages enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.lost_reasons enable row level security;
alter table public.deals enable row level security;
alter table public.tags enable row level security;
alter table public.deal_tags enable row level security;
alter table public.deal_contacts enable row level security;
alter table public.activities enable row level security;
alter table public.notes enable row level security;
alter table public.products enable row level security;
alter table public.deal_products enable row level security;
alter table public.stage_history enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_views enable row level security;
alter table public.invitations enable row level security;

create policy profiles_self on public.profiles for select using (id = auth.uid() or exists (
  select 1 from public.memberships mine
  join public.memberships theirs on theirs.organization_id = mine.organization_id
  where mine.user_id = auth.uid() and theirs.user_id = profiles.id
));
create policy profiles_update_self on public.profiles for update using (id = auth.uid());

create policy org_read on public.organizations for select using (public.is_member(id));
create policy org_update on public.organizations for update using (public.has_role(id, array['owner','admin']));

create policy member_read on public.memberships for select using (public.is_member(organization_id));
create policy member_write on public.memberships for all using (public.has_role(organization_id, array['owner','admin'])) with check (public.has_role(organization_id, array['owner','admin']));

create policy team_read on public.teams for select using (public.is_member(organization_id));
create policy team_write on public.teams for all using (public.has_role(organization_id, array['owner','admin','manager'])) with check (public.has_role(organization_id, array['owner','admin','manager']));

do $$
declare tbl text;
begin
  foreach tbl in array array['pipelines','stages','tags','lost_reasons','products','invitations']
  loop
    execute format('create policy %I_read on public.%I for select using (public.is_member(organization_id))', tbl, tbl);
    execute format('create policy %I_write on public.%I for all using (public.has_role(organization_id, array[''owner'',''admin'',''manager''])) with check (public.has_role(organization_id, array[''owner'',''admin'',''manager'']))', tbl, tbl);
  end loop;
end $$;

create policy companies_read on public.companies for select using (public.is_member(organization_id));
create policy companies_write on public.companies for all using (
  public.member_role(organization_id) <> 'viewer' and (public.has_role(organization_id, array['owner','admin','manager']) or owner_id = auth.uid())
) with check (
  public.member_role(organization_id) <> 'viewer' and (public.has_role(organization_id, array['owner','admin','manager']) or owner_id = auth.uid())
);

create policy contacts_read on public.contacts for select using (public.is_member(organization_id));
create policy contacts_write on public.contacts for all using (
  public.member_role(organization_id) <> 'viewer' and (public.has_role(organization_id, array['owner','admin','manager']) or owner_id = auth.uid())
) with check (
  public.member_role(organization_id) <> 'viewer' and (public.has_role(organization_id, array['owner','admin','manager']) or owner_id = auth.uid())
);

create policy deals_read on public.deals for select using (public.is_member(organization_id));
create policy deals_write on public.deals for all using (
  public.member_role(organization_id) <> 'viewer' and (public.has_role(organization_id, array['owner','admin','manager']) or owner_id = auth.uid())
) with check (
  public.member_role(organization_id) <> 'viewer' and (public.has_role(organization_id, array['owner','admin','manager']) or owner_id = auth.uid())
);

create policy activities_read on public.activities for select using (public.is_member(organization_id));
create policy activities_write on public.activities for insert with check (public.member_role(organization_id) <> 'viewer');
create policy activities_update on public.activities for update using (
  public.member_role(organization_id) <> 'viewer' and (public.has_role(organization_id, array['owner','admin','manager']) or assigned_to = auth.uid())
);

create policy notes_read on public.notes for select using (public.is_member(organization_id));
create policy notes_write on public.notes for insert with check (public.member_role(organization_id) <> 'viewer');

create policy deal_tags_read on public.deal_tags for select using (exists (select 1 from public.deals d where d.id = deal_id and public.is_member(d.organization_id)));
create policy deal_tags_write on public.deal_tags for all using (exists (select 1 from public.deals d where d.id = deal_id and public.is_member(d.organization_id) and public.member_role(d.organization_id) <> 'viewer')) with check (exists (select 1 from public.deals d where d.id = deal_id and public.is_member(d.organization_id)));

create policy deal_contacts_read on public.deal_contacts for select using (exists (select 1 from public.deals d where d.id = deal_id and public.is_member(d.organization_id)));
create policy deal_products_read on public.deal_products for select using (exists (select 1 from public.deals d where d.id = deal_id and public.is_member(d.organization_id)));
create policy deal_products_write on public.deal_products for all using (exists (select 1 from public.deals d where d.id = deal_id and public.member_role(d.organization_id) <> 'viewer')) with check (exists (select 1 from public.deals d where d.id = deal_id and public.member_role(d.organization_id) <> 'viewer'));
create policy history_read on public.stage_history for select using (exists (select 1 from public.deals d where d.id = deal_id and public.is_member(d.organization_id)));
create policy audit_read on public.audit_logs for select using (public.has_role(organization_id, array['owner','admin']));
create policy notifications_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update using (user_id = auth.uid());
create policy views_all on public.saved_views for all using (user_id = auth.uid() or (is_shared and public.is_member(organization_id))) with check (user_id = auth.uid());
