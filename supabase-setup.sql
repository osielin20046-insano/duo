create table if not exists public.duo_rooms (
  code text primary key check (code = upper(code)),
  room jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.duo_rooms enable row level security;

drop policy if exists "Anyone can read DÚO rooms" on public.duo_rooms;
drop policy if exists "Anyone can create DÚO rooms" on public.duo_rooms;
drop policy if exists "Anyone can update DÚO rooms" on public.duo_rooms;

create policy "Anyone can read DÚO rooms"
  on public.duo_rooms for select to anon using (true);
create policy "Anyone can create DÚO rooms"
  on public.duo_rooms for insert to anon with check (true);
create policy "Anyone can update DÚO rooms"
  on public.duo_rooms for update to anon using (true) with check (true);

grant select, insert, update on public.duo_rooms to anon;
