-- Jenis klien (hanya 3) dan tiga pihak proyek di setiap deal.

alter table public.companies add column if not exists client_type text;

update public.companies
set client_type = case
  when industry ilike '%konsultan%' or industry ilike '%consultant%' then 'konsultan'
  when industry ilike '%kontraktor%' or industry ilike '%contractor%' or industry ilike '%konstruksi%' or industry ilike '%mep%' then 'kontraktor'
  else 'owner'
end
where client_type is null;

alter table public.companies alter column client_type set not null;
alter table public.companies drop constraint if exists companies_client_type_check;
alter table public.companies
  add constraint companies_client_type_check check (client_type in ('konsultan', 'kontraktor', 'owner'));

alter table public.companies drop column if exists industry;

alter table public.deals add column if not exists owner_company_id uuid references public.companies (id) on delete set null;
alter table public.deals add column if not exists consultant_company_id uuid references public.companies (id) on delete set null;
alter table public.deals add column if not exists contractor_company_id uuid references public.companies (id) on delete set null;

update public.deals d
set
  contractor_company_id = case when c.client_type = 'kontraktor' then d.company_id else d.contractor_company_id end,
  owner_company_id = case when c.client_type = 'owner' then d.company_id else d.owner_company_id end,
  consultant_company_id = case when c.client_type = 'konsultan' then d.company_id else d.consultant_company_id end
from public.companies c
where d.company_id = c.id;

create index if not exists deals_owner_company_idx on public.deals (owner_company_id);
create index if not exists deals_consultant_company_idx on public.deals (consultant_company_id);
create index if not exists deals_contractor_company_idx on public.deals (contractor_company_id);

update public.deal_contacts
set role = case
  when role ilike '%konsultan%' or role ilike '%consultant%' then 'konsultan'
  when role ilike '%kontraktor%' or role ilike '%contractor%' then 'kontraktor'
  when role ilike '%owner%' or role ilike '%pemilik%' then 'owner'
  else null
end
where role is not null
  and role not in ('konsultan', 'kontraktor', 'owner');

alter table public.deal_contacts drop constraint if exists deal_contacts_role_check;
alter table public.deal_contacts
  add constraint deal_contacts_role_check check (role is null or role in ('konsultan', 'kontraktor', 'owner'));
