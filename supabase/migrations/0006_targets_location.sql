-- Lokasi proyek di deal, dan target won per salesperson per bulan.

alter table public.deals add column if not exists project_city text;
alter table public.deals add column if not exists project_province text;

create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  user_id uuid not null references public.profiles (id),
  month date not null,
  amount numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  unique (organization_id, user_id, month)
);

alter table public.sales_targets enable row level security;
drop policy if exists sales_targets_read on public.sales_targets;
create policy sales_targets_read on public.sales_targets for select using (public.is_member(organization_id));

create index if not exists deals_project_city_idx on public.deals (organization_id, project_city);
