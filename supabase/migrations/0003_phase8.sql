-- Fase 8: presales, undangan, tema, kategori produk, organisasi demo.

alter table public.memberships drop constraint if exists memberships_role_check;
alter table public.memberships
  add constraint memberships_role_check
  check (role in ('owner', 'admin', 'manager', 'sales', 'presales', 'viewer'));

alter table public.memberships add column if not exists disabled_at timestamptz;

alter table public.invitations add column if not exists full_name text;
alter table public.invitations add column if not exists team_id uuid references public.teams (id);
alter table public.invitations add column if not exists cancelled_at timestamptz;

alter table public.profiles add column if not exists theme text not null default 'system';
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles
  add constraint profiles_theme_check check (theme in ('light', 'dark', 'system'));

alter table public.organizations add column if not exists demo boolean not null default false;

alter table public.products add column if not exists tag_id uuid references public.tags (id) on delete restrict;

update public.products p
set tag_id = t.id
from public.tags t
where p.tag_id is null
  and t.organization_id = p.organization_id
  and lower(t.name) = lower(p.category);

alter table public.products drop column if exists category;
