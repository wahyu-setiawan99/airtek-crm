-- Profile photos (user request 14 Oct 2026). Public bucket: photos show up on kanban cards and
-- lists without signed URLs. Only the server (service role) uploads; files are 256 px WebP.
-- The app also creates this bucket on first upload, so running this file is optional.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 614400, array['image/webp'])
on conflict (id) do nothing;
