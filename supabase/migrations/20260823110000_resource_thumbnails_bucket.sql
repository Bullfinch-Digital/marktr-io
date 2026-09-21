-- Public thumbnail images for /downloads cards.
-- Admin workflow:
--   1. Upload image in Storage → bucket `resource-thumbnails`.
--   2. Copy the public object URL into resources.thumbnail_url, e.g.
--      https://<project>.supabase.co/storage/v1/object/public/resource-thumbnails/guides/my-guide.jpg
-- PDFs remain in the private resource-downloads bucket (email-gated).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resource-thumbnails',
  'resource-thumbnails',
  true,
  5242880, -- 5 MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read so thumbnail_url works in <img> without signed URLs.
drop policy if exists "Public can read resource thumbnails" on storage.objects;
create policy "Public can read resource thumbnails"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'resource-thumbnails');

comment on column public.resources.thumbnail_url is
  'Optional public image URL. Prefer uploads in Storage bucket resource-thumbnails (public object URL).';
