-- ============================================================
-- BASE DE DATOS PARA MI LISTA DE PELÍCULAS Y SERIES
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  type text not null check (type in ('movie','tv')),
  title text not null,
  year text,
  poster_path text,
  overview text,
  watched boolean not null default false,
  rating text not null default 'unrated'
    check (rating in ('unrated','liked','disliked')),
  created_at timestamptz not null default now(),
  unique(user_id, tmdb_id, type)
);

-- ============================================================
-- CATEGORÍAS / GÉNEROS
-- ============================================================

alter table public.media
add column if not exists genres text[] not null default '{}';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.media enable row level security;

drop policy if exists "media_select_own" on public.media;

create policy "media_select_own"
on public.media
for select
using (auth.uid() = user_id);

drop policy if exists "media_insert_own" on public.media;

create policy "media_insert_own"
on public.media
for insert
with check (auth.uid() = user_id);

drop policy if exists "media_update_own" on public.media;

create policy "media_update_own"
on public.media
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "media_delete_own" on public.media;

create policy "media_delete_own"
on public.media
for delete
using (auth.uid() = user_id);
