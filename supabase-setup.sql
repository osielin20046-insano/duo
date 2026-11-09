-- DÚO · configuración de Supabase
-- Ejecuta este archivo completo en el SQL Editor. Es idempotente: puedes correrlo de nuevo sin perder salas.
--
-- Modelo de seguridad: el navegador (rol anon) YA NO accede a la tabla directamente. Solo puede llamar
-- a las funciones de abajo, que exigen conocer el código de sala. Así nadie puede listar todas las salas
-- ni sobrescribir una sala ajena, y cada cambio se aplica con la fila bloqueada (sin pisarse entre jugadores).

create table if not exists public.duo_rooms (
  code text primary key check (code = upper(code)),
  room jsonb not null,
  host_token text,
  host_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.duo_rooms add column if not exists host_token text;
alter table public.duo_rooms add column if not exists host_seen_at timestamptz not null default now();

-- Retira las RPC antiguas que confiaban en un ID de anfitrión visible para todos.
drop function if exists public.duo_schedule_game(text, text, text, bigint);
drop function if exists public.duo_end_room(text, text);

alter table public.duo_rooms enable row level security;

-- Políticas abiertas de la versión anterior (cualquiera podía leer y modificar todas las salas).
drop policy if exists "Anyone can read DÚO rooms" on public.duo_rooms;
drop policy if exists "Anyone can create DÚO rooms" on public.duo_rooms;
drop policy if exists "Anyone can update DÚO rooms" on public.duo_rooms;
revoke all on table public.duo_rooms from anon, authenticated;

-- Lee una sala por código.
create or replace function public.duo_get_room(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  delete from public.duo_rooms
   where code = upper(p_code) and host_seen_at < now() - interval '5 minutes';
  select room into r from public.duo_rooms where code = upper(p_code);
  return r;
end
$$;

-- Crea una sala. Devuelve false si el código ya existe (no sobrescribe nada).
create or replace function public.duo_create_room(p_room jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_code text := upper(coalesce(p_room->>'code', ''));
begin
  if v_code !~ '^[A-Z0-9]{4,8}$' then
    raise exception 'invalid_code' using errcode = 'PT400';
  end if;
  if octet_length(p_room::text) > 50000 then
    raise exception 'room_too_large' using errcode = 'PT400';
  end if;
  if coalesce(p_room->>'hostToken', '') = '' then
    raise exception 'missing_host_token' using errcode = 'PT400';
  end if;
  insert into public.duo_rooms (code, room, host_token, host_seen_at)
  values (v_code, (p_room - 'hostToken') || jsonb_build_object('code', v_code), p_room->>'hostToken', now())
  on conflict (code) do nothing;
  return found;
end
$$;

-- Une a alguien a la sala (o devuelve a la persona si ya existe un nombre igual). Devuelve {room, member}.
create or replace function public.duo_join_room(p_code text, p_member_id text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(p_code);
  v_name text := btrim(coalesce(p_name, ''));
  r jsonb;
  m jsonb;
begin
  if char_length(v_name) not between 2 and 32 then
    raise exception 'invalid_name' using errcode = 'PT400';
  end if;
  perform public.duo_get_room(v_code);
  select room into r from public.duo_rooms where code = v_code for update;
  if r is null then
    raise exception 'room_not_found' using errcode = 'PT404';
  end if;
  select x into m from jsonb_array_elements(coalesce(r->'members', '[]'::jsonb)) x
   where lower(x->>'name') = lower(v_name) limit 1;
  if m is null then
    if jsonb_array_length(coalesce(r->'members', '[]'::jsonb)) >= 50 then
      raise exception 'room_full' using errcode = 'PT400';
    end if;
    m := jsonb_build_object('id', p_member_id, 'name', v_name);
    r := jsonb_set(r, '{members}', coalesce(r->'members', '[]'::jsonb) || m);
    r := jsonb_set(r, '{scores}', coalesce(r->'scores', '{}'::jsonb) || jsonb_build_object(p_member_id, 0));
    update public.duo_rooms set room = r where code = v_code;
  end if;
  return jsonb_build_object('room', r, 'member', m);
end
$$;

-- Registra una ronda de "Completa la frase" y suma los puntos (0 a 3) a quien adivinó.
create or replace function public.duo_add_round(p_code text, p_round jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(p_code);
  v_guesser text := p_round->>'guesser';
  v_points int := least(greatest(coalesce((p_round->>'points')::int, 0), 0), 3);
  r jsonb;
begin
  select room into r from public.duo_rooms where code = v_code for update;
  if r is null then
    raise exception 'room_not_found' using errcode = 'PT404';
  end if;
  if not (coalesce(r->'scores', '{}'::jsonb) ? coalesce(v_guesser, '')) then
    raise exception 'member_not_found' using errcode = 'PT404';
  end if;
  if jsonb_array_length(coalesce(r->'rounds', '[]'::jsonb)) >= 1000 then
    raise exception 'too_many_rounds' using errcode = 'PT400';
  end if;
  r := jsonb_set(r, '{rounds}', coalesce(r->'rounds', '[]'::jsonb) || (p_round || jsonb_build_object('points', v_points)));
  if v_points > 0 then
    r := jsonb_set(r, array['scores', v_guesser], to_jsonb(coalesce((r->'scores'->>v_guesser)::int, 0) + v_points));
  end if;
  update public.duo_rooms set room = r where code = v_code;
  return r;
end
$$;

-- Guarda el personaje (y respuestas) de una persona de la sala.
create or replace function public.duo_set_character(p_code text, p_member_id text, p_character text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(p_code);
  r jsonb;
begin
  select room into r from public.duo_rooms where code = v_code for update;
  if r is null then
    raise exception 'room_not_found' using errcode = 'PT404';
  end if;
  if not exists (select 1 from jsonb_array_elements(coalesce(r->'members', '[]'::jsonb)) x where x->>'id' = p_member_id) then
    raise exception 'member_not_found' using errcode = 'PT404';
  end if;
  r := jsonb_set(r, '{members}', (
    select jsonb_agg(
      case when x->>'id' = p_member_id
           then x || jsonb_build_object('characterId', p_character, 'answers', coalesce(p_answers, '[]'::jsonb))
           else x end
      order by ord)
    from jsonb_array_elements(r->'members') with ordinality as t(x, ord)));
  update public.duo_rooms set room = r where code = v_code;
  return r;
end
$$;

-- La clave privada del anfitrión no forma parte del JSON de sala que leen los participantes.
create or replace function public.duo_schedule_game(p_code text, p_host_token text, p_game text, p_starts_at bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  select room into r from public.duo_rooms where code = upper(p_code) for update;
  if r is null then raise exception 'room_not_found' using errcode = 'PT404'; end if;
  if not exists (select 1 from public.duo_rooms where code = upper(p_code) and host_token = p_host_token) then
    raise exception 'host_only' using errcode = 'PT403';
  end if;
  if p_game is not null and p_game not in ('phrase', 'character') then raise exception 'invalid_game' using errcode = 'PT400'; end if;
  r := r || jsonb_build_object('selectedGame', p_game, 'startsAt', p_starts_at);
  update public.duo_rooms set room = r where code = upper(p_code);
  return r;
end
$$;

-- La presencia del anfitrión renueva la sesión. Al cerrar el navegador deja de renovarse.
create or replace function public.duo_host_heartbeat(p_code text, p_host_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform public.duo_get_room(p_code);
  update public.duo_rooms set host_seen_at = now()
   where code = upper(p_code) and host_token = p_host_token
     and host_seen_at >= now() - interval '5 minutes'
   returning room into r;
  return r;
end
$$;

revoke all on function public.duo_get_room(text), public.duo_create_room(jsonb), public.duo_join_room(text, text, text),
  public.duo_add_round(text, jsonb), public.duo_set_character(text, text, text, jsonb),
  public.duo_schedule_game(text, text, text, bigint), public.duo_host_heartbeat(text, text) from public;
grant execute on function public.duo_get_room(text), public.duo_create_room(jsonb), public.duo_join_room(text, text, text),
  public.duo_add_round(text, jsonb), public.duo_set_character(text, text, text, jsonb),
  public.duo_schedule_game(text, text, text, bigint), public.duo_host_heartbeat(text, text) to anon, authenticated;
