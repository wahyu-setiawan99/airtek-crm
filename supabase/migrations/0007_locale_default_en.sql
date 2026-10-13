-- New accounts default to English. Existing profile rows keep their chosen language.

alter table public.profiles alter column locale set default 'en';
