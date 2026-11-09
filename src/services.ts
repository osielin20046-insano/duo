import type { Character } from './data'

export type Member = { id:string; name:string; characterId?:string; answers?:string[] }
export type Round = { phrase:string; writer:string; guesser:string; original:string; prediction:string; points:number; similarity:'exacta'|'aproximada'|'distinta'; createdAt:number }
export type Room = { code:string; members:Member[]; scores:Record<string,number>; rounds:Round[]; createdAt:number; rev?:number }
const KEY='duo.rooms.v1', ACTIVE='duo.active.v1'
const url=import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anon=import.meta.env.VITE_SUPABASE_ANON_KEY
const configured=Boolean(url&&anon)
const read=():Room[]=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]') as Room[]}catch{return []}}
const write=(rooms:Room[])=>localStorage.setItem(KEY,JSON.stringify(rooms))
const cache=(room:Room)=>{const rooms=read().filter(r=>r.code!==room.code);rooms.push(room);write(rooms)}
export const getActive=()=>{try{const a=JSON.parse(localStorage.getItem(ACTIVE)||'null');return a as {code:string;memberId:string}|null}catch{return null}}
export const setActive=(a:{code:string;memberId:string}|null)=>a?localStorage.setItem(ACTIVE,JSON.stringify(a)):localStorage.removeItem(ACTIVE)
export const getRoom=(code:string)=>read().find(r=>r.code===code.toUpperCase())
export const currentRoom=()=>{const a=getActive();return a?getRoom(a.code):undefined}
const API = `${url}/rest/v1/duo_rooms`
const headers = { apikey: anon || '', Authorization: `Bearer ${anon || ''}`, 'Content-Type': 'application/json' }
const requireConfig = () => {
  if (!configured) throw Error('La conexión con Supabase todavía no está configurada.')
}

async function fetchRoom(code: string): Promise<Room | undefined> {
  requireConfig()
  const response = await fetch(`${API}?code=eq.${encodeURIComponent(code.toUpperCase())}&select=room`, { headers })
  if (!response.ok) throw Error('No se pudo consultar la sala. Revisa la configuración de Supabase.')
  const rows = (await response.json()) as { room: Room }[]
  return rows[0]?.room
}

// Inserta una sala nueva. Devuelve false si el código ya existe (en vez de sobrescribir la sala de otro equipo).
async function insertRoom(room: Room): Promise<boolean> {
  requireConfig()
  const response = await fetch(API, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ code: room.code, room }),
  })
  if (response.status === 409) return false
  if (!response.ok) throw Error('No se pudo guardar la sala. Revisa la tabla y los permisos de Supabase.')
  return true
}

// Lee la sala, aplica el cambio y la guarda solo si nadie más la modificó entre medio (campo `rev`).
// Si hubo un choque, vuelve a leer y a aplicar el cambio. `change` devuelve false cuando no hay nada que guardar.
async function mutateRoom(code: string, change: (room: Room) => boolean | void): Promise<Room | undefined> {
  requireConfig()
  const encoded = encodeURIComponent(code.toUpperCase())
  for (let attempt = 0; attempt < 5; attempt++) {
    const room = await fetchRoom(code)
    if (!room) return undefined
    if (change(room) === false) return room
    const rev = room.rev ?? 0
    room.rev = rev + 1
    const guard = rev === 0 ? 'or=(room->>rev.is.null,room->>rev.eq.0)' : `room->>rev=eq.${rev}`
    const response = await fetch(`${API}?code=eq.${encoded}&${guard}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ room }),
    })
    if (!response.ok) throw Error('No se pudo guardar la sala. Revisa la tabla y los permisos de Supabase.')
    if (((await response.json()) as unknown[]).length === 1) return room
  }
  throw Error('La sala está muy concurrida en este momento. Inténtalo de nuevo.')
}

export async function refreshActiveRoom() {
  const active = getActive()
  if (!active || !configured) return
  const room = await fetchRoom(active.code)
  if (room) cache(room)
}

// Alfabeto sin caracteres ambiguos (0/O, 1/I) y con aleatoriedad criptográfica.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const makeCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => ALPHABET[b % ALPHABET.length]).join('')

export const createRoom = async (name: string) => {
  const member: Member = { id: crypto.randomUUID(), name: name.trim() }
  for (let attempt = 0; attempt < 5; attempt++) {
    const room: Room = { code: makeCode(), members: [member], scores: { [member.id]: 0 }, rounds: [], createdAt: Date.now(), rev: 0 }
    if (await insertRoom(room)) {
      cache(room)
      setActive({ code: room.code, memberId: member.id })
      return room
    }
  }
  throw Error('No se pudo generar un código de sala libre. Inténtalo de nuevo.')
}

export const joinRoom = async (code: string, name: string) => {
  const normalized = code.trim().toUpperCase()
  const clean = name.trim()
  const found: { member?: Member } = {}
  const room = await mutateRoom(normalized, (r) => {
    found.member = r.members.find((x) => x.name.toLowerCase() === clean.toLowerCase())
    if (found.member) return false
    found.member = { id: crypto.randomUUID(), name: clean }
    r.members.push(found.member)
    r.scores[found.member.id] = 0
  })
  if (!room || !found.member) throw Error('No encontramos esa sala. Revisa el código e inténtalo de nuevo.')
  cache(room)
  setActive({ code: room.code, memberId: found.member.id })
  return room
}

export const saveRound = async (round: Round) => {
  const a = getActive()
  if (!a) return
  const room = await mutateRoom(a.code, (r) => {
    r.rounds.push(round)
    if (round.points) r.scores[round.guesser] = (r.scores[round.guesser] || 0) + round.points
  })
  if (room) cache(room)
}

export const saveCharacter = async (characterId: string, answers: string[]) => {
  const a = getActive()
  if (!a) return
  const room = await mutateRoom(a.code, (r) => {
    const m = r.members.find((x) => x.id === a.memberId)
    if (!m) return false
    m.characterId = characterId
    m.answers = answers
  })
  if (room) cache(room)
}
export const memberId=()=>getActive()?.memberId
export const allRooms=read
export function compareAnswers(a:string,b:string):{points:number;similarity:'exacta'|'aproximada'|'distinta'}{const norm=(s:string)=>s.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!['que','con','para','por','una','uno','los','las','del','como','pero','cuando','seria'].includes(w));const x=norm(a),y=norm(b);if(a.trim().toLocaleLowerCase()===b.trim().toLocaleLowerCase())return{points:3,similarity:'exacta'};const common=new Set(x.filter(w=>y.includes(w))).size,ratio=common/Math.max(new Set(x.concat(y)).size,1);return ratio>=.45?{points:2,similarity:'aproximada'}:{points:0,similarity:'distinta'}}
export const characterById=(id:string|undefined,all:Character[])=>all.find(c=>c.id===id)
