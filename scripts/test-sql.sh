#!/usr/bin/env bash
# Prueba supabase-setup.sql contra un Postgres local: permisos del rol anon y concurrencia real.
# Uso:
#   createdb duo_test
#   psql -d duo_test -c "create role anon nologin" -c "create role authenticated nologin"
#   PGDATABASE=duo_test ./scripts/test-sql.sh
set -uo pipefail
cd "$(dirname "$0")/.."
FAILS=0
run() { psql -q -tA -v ON_ERROR_STOP=1 -c "set role anon; $1" 2>&1 | tail -1; }
sql() { psql -q -tA -v ON_ERROR_STOP=1 -c "$1" 2>&1; }
expect() { if [[ "$3" == *"$2"* ]]; then echo "  ok   $1"; else echo "  FALLA $1 -> esperaba '$2', obtuve '$3'"; FAILS=$((FAILS+1)); fi; }

psql -q -v ON_ERROR_STOP=1 -f supabase-setup.sql >/dev/null 2>&1 || { echo "No se pudo aplicar supabase-setup.sql"; exit 1; }
sql "delete from public.duo_rooms" >/dev/null

echo "Permisos de anon"
expect "no puede leer la tabla"      "permission denied" "$(run 'select count(*) from public.duo_rooms')"
expect "no puede insertar"           "permission denied" "$(run "insert into public.duo_rooms values ('HACK1','{}')")"
expect "no puede actualizar"         "permission denied" "$(run "update public.duo_rooms set room='{}'")"

echo "Funciones"
ROOM='{"code":"abcd2","members":[{"id":"a","name":"Ana"}],"scores":{"a":0},"rounds":[],"createdAt":1,"hostToken":"token-a"}'
expect "crear sala"                  "t" "$(run "select public.duo_create_room('$ROOM')")"
expect "código repetido -> false"    "f" "$(run "select public.duo_create_room('$ROOM')")"
expect "código inválido"             "invalid_code" "$(psql -q -tA -c "set role anon; select public.duo_create_room('{\"code\":\"x\"}')" 2>&1)"
expect "unirse a sala inexistente"   "room_not_found" "$(psql -q -tA -c "set role anon; select public.duo_join_room('NOPE1','i','Ana')" 2>&1)"
expect "nombre muy corto"            "invalid_name" "$(psql -q -tA -c "set role anon; select public.duo_join_room('ABCD2','i','A')" 2>&1)"
expect "mismo nombre = misma persona" '"id": "a"' "$(run "select public.duo_join_room('ABCD2','z','ana')->'member'")"

echo "Concurrencia (30 joins + 30 rondas + 10 personajes a la vez)"
for i in $(seq 1 30); do run "select public.duo_join_room('ABCD2','id$i','Persona $i')" >/dev/null & done; wait
for i in $(seq 1 30); do
  run "select public.duo_add_round('ABCD2','{\"guesser\":\"id$(( (i % 30) + 1 ))\",\"points\":3,\"createdAt\":$i}')" >/dev/null &
done
for i in $(seq 1 10); do run "select public.duo_set_character('ABCD2','id$i','soñador','[\"a\"]')" >/dev/null & done; wait
expect "31 miembros"                 "31" "$(sql "select jsonb_array_length(room->'members') from public.duo_rooms where code='ABCD2'")"
expect "30 rondas"                   "30" "$(sql "select jsonb_array_length(room->'rounds') from public.duo_rooms where code='ABCD2'")"
expect "90 puntos en total"          "90" "$(sql "select sum(value::int) from public.duo_rooms, jsonb_each_text(room->'scores') where code='ABCD2'")"
expect "10 personajes guardados"     "10" "$(sql "select count(*) from public.duo_rooms, jsonb_array_elements(room->'members') x where code='ABCD2' and x ? 'characterId'")"
expect "puntos limitados a 3"        "3" "$(run "select public.duo_add_round('ABCD2','{\"guesser\":\"a\",\"points\":999}')->'scores'->>'a'")"
expect "ronda de persona inexistente" "member_not_found" "$(psql -q -tA -c "set role anon; select public.duo_add_round('ABCD2','{\"guesser\":\"x\",\"points\":3}')" 2>&1)"

sql "delete from public.duo_rooms where code='ABCD2'" >/dev/null
[[ $FAILS -eq 0 ]] && echo "Todo bien." || { echo "$FAILS prueba(s) fallaron."; exit 1; }
