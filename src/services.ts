import type { Character } from './data'

export type Member = { id: string; name: string; characterId?: string; answers?: string[] }
export type Round = {
  phrase: string
  writer: string
  guesser: string
  original: string
  prediction: string
  points: number
  similarity: 'exacta' | 'aproximada' | 'distinta'
  createdAt: number
}
export type Activity = {
  game: 'common' | 'radar'
  prompt: string
  status: 'collecting' | 'revealed'
  responses: Record<string, string>
  votes: Record<string, string>
  round: number
  startedAt: number
}
export type Room = {
  code: string
  members: Member[]
  scores: Record<string, number>
  rounds: Round[]
  createdAt: number
  hostId?: string
  selectedGame?: 'common' | 'radar' | 'phrase' | 'character' | null
  startsAt?: number | null
  activity?: Activity | null
}
type ActiveSession = { code: string; memberId: string; hostToken?: string }
const KEY = 'duo.rooms.v1',
  ACTIVE = 'duo.active.v1'
const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
const configured = Boolean(url && anon && !url.includes('your-project-ref') && !anon.includes('your-publishable-or-anon-key'))
export const supabaseProject = (() => {
  try { return url ? new URL(url).host : null } catch { return null }
})()
const read = (): Room[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as Room[]
  } catch {
    return []
  }
}
const write = (rooms: Room[]) => localStorage.setItem(KEY, JSON.stringify(rooms))
const cache = (room: Room) => {
  const rooms = read().filter((r) => r.code !== room.code)
  rooms.push(room)
  write(rooms)
}
export const getActive = () => {
  try {
    const storage = typeof sessionStorage === 'undefined' ? localStorage : sessionStorage
    return JSON.parse(storage.getItem(ACTIVE) || 'null') as ActiveSession | null
  } catch {
    return null
  }
}
export const setActive = (a: ActiveSession | null) => {
  const storage = typeof sessionStorage === 'undefined' ? localStorage : sessionStorage
  if (a) storage.setItem(ACTIVE, JSON.stringify(a))
  else storage.removeItem(ACTIVE)
}
export const getRoom = (code: string) => read().find((r) => r.code === code.toUpperCase())
export const currentRoom = () => {
  const a = getActive()
  return a ? getRoom(a.code) : undefined
}
const headers = { apikey: anon || '', Authorization: `Bearer ${anon || ''}`, 'Content-Type': 'application/json' }

const ERRORS: Record<string, string> = {
  room_not_found: 'No encontramos esa sala en este proyecto. Comprueba el código, que el anfitrión siga conectado y que ambos equipos usen el mismo proyecto Supabase.',
  member_not_found: 'No encontramos a esa persona en la sala.',
  invalid_name: 'Escribe un nombre de entre 2 y 32 caracteres.',
  room_full: 'La sala ya está llena (máximo 50 personas).',
  too_many_rounds: 'Esta sala alcanzó el máximo de rondas guardadas.',
  host_only: 'Solo el anfitrión puede controlar la dinámica de la sala.',
  activity_closed: 'La ronda ya se cerró. Vuelve a la sala para ver el resultado.',
  activity_missing: 'El anfitrión todavía no ha iniciado una ronda.',
  invalid_response: 'Escribe una respuesta de hasta 280 caracteres.',
  activity_incomplete: 'Aún faltan compañeros por participar. La ronda se revela cuando todos hayan respondido.',
  invalid_prompt: 'La pregunta debe tener entre 8 y 240 caracteres.',
}

// Todas las lecturas y escrituras pasan por funciones de Postgres (ver supabase-setup.sql): cada cambio se aplica
// con la sala bloqueada, así que varias personas guardando a la vez no se pisan.
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!configured) throw Error('Falta configurar Supabase. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con los valores reales del mismo proyecto en todos los equipos.')
  let response: Response
  try {
    response = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) })
  } catch {
    throw Error('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.')
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    const message = ERRORS[body?.message ?? '']
    throw Error(
      (message && body?.message === 'room_not_found' && supabaseProject ? `${message} Proyecto conectado: ${supabaseProject}.` : message) ??
        'No se pudo completar la acción. Revisa que ejecutaste supabase-setup.sql en Supabase.',
    )
  }
  return (await response.json()) as T
}

export async function refreshActiveRoom() {
  const active = getActive()
  if (!active || !configured) return
  const room = active.hostToken
    ? await rpc<Room | null>('duo_host_heartbeat', { p_code: active.code, p_host_token: active.hostToken })
    : await rpc<Room | null>('duo_get_room', { p_code: active.code })
  if (room) cache(room)
  else {
    write(read().filter((r) => r.code !== active.code))
    setActive(null)
  }
}

// Alfabeto sin caracteres ambiguos (0/O, 1/I) y con aleatoriedad criptográfica.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const makeCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALPHABET[b % ALPHABET.length]).join('')

export const createRoom = async (name: string) => {
  const member: Member = { id: crypto.randomUUID(), name: name.trim() }
  const hostToken = crypto.randomUUID()
  for (let attempt = 0; attempt < 5; attempt++) {
    const room: Room = {
      code: makeCode(),
      members: [member],
      scores: { [member.id]: 0 },
      rounds: [],
      createdAt: Date.now(),
      hostId: member.id,
      selectedGame: null,
      startsAt: null,
      activity: null,
    }
    // false = el código ya existe; se prueba con otro en lugar de sobrescribir la sala de alguien más.
    if (await rpc<boolean>('duo_create_room', { p_room: { ...room, hostToken } })) {
      cache(room)
      setActive({ code: room.code, memberId: member.id, hostToken })
      return room
    }
  }
  throw Error('No se pudo generar un código de sala libre. Inténtalo de nuevo.')
}

const joinRemote = async (code: string, name: string) =>
  rpc<{ room: Room; member: Member }>('duo_join_room', {
    p_code: code.trim().toUpperCase(),
    p_member_id: crypto.randomUUID(),
    p_name: name.trim(),
  })

// Entrar a una sala: este dispositivo pasa a ser esa persona.
export const joinRoom = async (code: string, name: string) => {
  const { room, member } = await joinRemote(code, name)
  cache(room)
  setActive({ code: room.code, memberId: member.id })
  return room
}

// Agregar a alguien al equipo desde el panel: NO cambia quién eres en este dispositivo.
// Esa persona entra después desde su propio dispositivo con el código y su mismo nombre.
export const addMember = async (code: string, name: string) => {
  const { room } = await joinRemote(code, name)
  cache(room)
  return room
}

export const scheduleGame = async (game: 'common' | 'radar', startsAt: number | null, prompt: string) => {
  const a = getActive()
  if (!a?.hostToken) throw Error('Solo el anfitrión de esta pestaña puede controlar la sala.')
  cache(await rpc<Room>('duo_schedule_game', { p_code: a.code, p_host_token: a.hostToken, p_game: game, p_starts_at: startsAt, p_prompt: prompt }))
}

export const clearScheduledGame = async () => {
  const a = getActive()
  if (!a?.hostToken) throw Error('Solo el anfitrión de esta pestaña puede controlar la sala.')
  cache(await rpc<Room>('duo_schedule_game', { p_code: a.code, p_host_token: a.hostToken, p_game: null, p_starts_at: null, p_prompt: null }))
}

export const submitActivity = async (value: string) => {
  const a = getActive()
  if (!a) throw Error('Vuelve a entrar a la sala para participar.')
  cache(await rpc<Room>('duo_submit_activity', { p_code: a.code, p_member_id: a.memberId, p_value: value.trim() }))
}

export const revealActivity = async () => {
  const a = getActive()
  if (!a?.hostToken) throw Error('Solo el anfitrión puede revelar la ronda.')
  cache(await rpc<Room>('duo_reveal_activity', { p_code: a.code, p_host_token: a.hostToken }))
}

export const saveRound = async (round: Round) => {
  const a = getActive()
  if (!a) return
  cache(await rpc<Room>('duo_add_round', { p_code: a.code, p_round: round }))
}

export const saveCharacter = async (characterId: string, answers: string[]) => {
  const a = getActive()
  if (!a) return
  cache(
    await rpc<Room>('duo_set_character', {
      p_code: a.code,
      p_member_id: a.memberId,
      p_character: characterId,
      p_answers: answers,
    }),
  )
}

export const memberId = () => getActive()?.memberId
export const allRooms = read
export function compareAnswers(
  a: string,
  b: string,
): { points: number; similarity: 'exacta' | 'aproximada' | 'distinta' } {
  const norm = (s: string) =>
    s
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 &&
          !['que', 'con', 'para', 'por', 'una', 'uno', 'los', 'las', 'del', 'como', 'pero', 'cuando', 'seria'].includes(
            w,
          ),
      )
  const x = norm(a),
    y = norm(b)
  if (a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()) return { points: 3, similarity: 'exacta' }
  const common = new Set(x.filter((w) => y.includes(w))).size,
    ratio = common / Math.max(new Set(x.concat(y)).size, 1)
  return ratio >= 0.45 ? { points: 2, similarity: 'aproximada' } : { points: 0, similarity: 'distinta' }
}
export const characterById = (id: string | undefined, all: Character[]) => all.find((c) => c.id === id)
