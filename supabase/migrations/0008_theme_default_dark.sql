-- New accounts start in dark mode (user decision 13 Oct 2026). Accounts still on the old
-- default ('system') move to dark too; anyone can pick Light or System afterwards.

alter table public.profiles alter column theme set default 'dark';
update public.profiles set theme = 'dark' where theme = 'system';
