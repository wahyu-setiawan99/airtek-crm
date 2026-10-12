-- Fase 9: lampiran, custom fields, jejak impor Odoo, realtime kanban.

alter table public.companies add column if not exists external_ref text;
alter table public.companies add column if not exists import_batch_id uuid;
alter table public.contacts add column if not exists external_ref text;
alter table public.contacts add column if not exists import_batch_id uuid;
alter table public.deals add column if not exists external_ref text;
alter table public.deals add column if not exists import_batch_id uuid;
alter table public.products add column if not exists external_ref text;
alter table public.products add column if not exists import_batch_id uuid;
alter table public.activities add column if not exists external_ref text;
alter table public.activities add column if not exists import_batch_id uuid;

create unique index if not exists companies_external_ref_idx on public.companies (organization_id, external_ref) where external_ref is not null;
create unique index if not exists contacts_external_ref_idx on public.contacts (organization_id, external_ref) where external_ref is not null;
create unique index if not exists deals_external_ref_idx on public.deals (organization_id, external_ref) where external_ref is not null;
create unique index if not exists products_external_ref_idx on public.products (organization_id, external_ref) where external_ref is not null;
create unique index if not exists activities_external_ref_idx on public.activities (organization_id, external_ref) where external_ref is not null;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  storage_path text not null,
  file_name text not null,
  size bigint not null default 0,
  mime text not null default 'application/octet-stream',
  deal_id uuid references public.deals (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);
alter table public.attachments enable row level security;
drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select using (public.is_member(organization_id));

create table if not exists public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  entity text not null check (entity in ('deal', 'contact', 'company')),
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'date', 'select')),
  options text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);
alter table public.custom_fields enable row level security;
drop policy if exists custom_fields_read on public.custom_fields;
create policy custom_fields_read on public.custom_fields for select using (public.is_member(organization_id));

create table if not exists public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  field_id uuid not null references public.custom_fields (id) on delete cascade,
  entity_id uuid not null,
  value text not null default '',
  created_at timestamptz not null default now(),
  unique (field_id, entity_id)
);
alter table public.custom_field_values enable row level security;
drop policy if exists custom_field_values_read on public.custom_field_values;
create policy custom_field_values_read on public.custom_field_values for select using (public.is_member(organization_id));

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  source text not null,
  file_names text not null default '',
  counts jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.import_batches enable row level security;
drop policy if exists import_batches_read on public.import_batches;
create policy import_batches_read on public.import_batches for select using (public.has_role(organization_id, array['owner', 'admin']));

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists attachments_storage_read on storage.objects;
create policy attachments_storage_read on storage.objects for select
  using (
    bucket_id = 'attachments'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

do $$
begin
  alter publication supabase_realtime add table public.deals;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
