-- ============================================================================
-- Migration: Member Progress Photos (Before / Progress / After)
--
-- Run this ONCE in the Supabase SQL Editor against the existing database.
-- It is NOT needed for a brand new database — schema.sql already has it.
--
-- What it does:
--   1. Adds the progress_photo_type enum and progress_photos table (only
--      metadata/path — the actual image bytes go to Supabase Storage).
--   2. Creates a PRIVATE "progress-photos" Storage bucket.
--   3. Enables RLS on progress_photos and denies anon/authenticated direct
--      access on both it and the storage bucket's objects — the only way
--      in is the Express API using the service role key, exactly like
--      every other table, so the backend can enforce "a member only sees
--      their own photos, a Gym Admin only sees their own gym's" before
--      ever handing out a (short-lived, signed) URL.
-- ============================================================================

do $$ begin
  create type progress_photo_type as enum ('before', 'progress', 'after');
exception when duplicate_object then null; end $$;

create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  storage_path text not null,
  photo_type progress_photo_type not null,
  taken_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_progress_photos_gym_id on progress_photos(gym_id);
create index if not exists idx_progress_photos_member_id on progress_photos(member_id);

alter table progress_photos enable row level security;
drop policy if exists deny_all_anon on progress_photos;
create policy deny_all_anon on progress_photos
  for all to anon, authenticated using (false) with check (false);

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists deny_all_anon_progress_photos on storage.objects;
create policy deny_all_anon_progress_photos on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'progress-photos' and false)
  with check (bucket_id = 'progress-photos' and false);
