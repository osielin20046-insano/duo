import type { Character } from './data'

export type Member = { id:string; name:string; characterId?:string; answers?:string[] }
export type Round = { phrase:string; writer:string; guesser:string; original:string; prediction:string; points:number; similarity:'exacta'|'aproximada'|'distinta'; createdAt:number }
export type Room = { code:string; members:Member[]; scores:Record<string,number>; rounds:Round[]; createdAt:number }
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
const headers={'apikey':anon||'','Authorization':`Bearer ${anon||''}`,'Content-Type':'application/json'}
async function fetchRoom(code:string):Promise<Room|undefined>{if(!configured)throw Error('La conexión con Supabase todavía no está configurada.');const response=await fetch(`${url}/rest/v1/duo_rooms?code=eq.${encodeURIComponent(code.toUpperCase())}&select=room`,{headers});if(!response.ok)throw Error('No se pudo consultar la sala. Revisa la configuración de Supabase.');const rows=await response.json() as {room:Room}[];return rows[0]?.room}
async function saveRemote(room:Room){if(!configured)throw Error('La conexión con Supabase todavía no está configurada.');const response=await fetch(`${url}/rest/v1/duo_rooms?on_conflict=code`,{method:'POST',headers:{...headers,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({code:room.code,room})});if(!response.ok)throw Error('No se pudo guardar la sala. Revisa la tabla y los permisos de Supabase.')}
export async function refreshActiveRoom(){const active=getActive();if(!active||!configured)return;const room=await fetchRoom(active.code);if(room)cache(room)}
const makeCode=()=>Math.random().toString(36).slice(2,7).toUpperCase()
export const createRoom=async(name:string)=>{const member={id:crypto.randomUUID(),name:name.trim()};const room:Room={code:makeCode(),members:[member],scores:{[member.id]:0},rounds:[],createdAt:Date.now()};await saveRemote(room);cache(room);setActive({code:room.code,memberId:member.id});return room}
export const joinRoom=async(code:string,name:string)=>{const normalized=code.trim().toUpperCase(),room=await fetchRoom(normalized);if(!room)throw Error('No encontramos esa sala. Revisa el código e inténtalo de nuevo.');let m=room.members.find(x=>x.name.toLowerCase()===name.trim().toLowerCase());if(!m){m={id:crypto.randomUUID(),name:name.trim()};room.members.push(m);room.scores[m.id]=0;await saveRemote(room)}cache(room);setActive({code:room.code,memberId:m.id});return room}
export const saveRound=async(round:Round)=>{const a=getActive();if(!a)return;const r=await fetchRoom(a.code);if(!r)return;r.rounds.push(round);if(round.points)r.scores[round.guesser]=(r.scores[round.guesser]||0)+round.points;await saveRemote(r);cache(r)}
export const saveCharacter=async(characterId:string,answers:string[])=>{const a=getActive();if(!a)return;const r=await fetchRoom(a.code),m=r?.members.find(x=>x.id===a.memberId);if(r&&m){m.characterId=characterId;m.answers=answers;await saveRemote(r);cache(r)}}
export const memberId=()=>getActive()?.memberId
export const allRooms=read
export function compareAnswers(a:string,b:string):{points:number;similarity:'exacta'|'aproximada'|'distinta'}{const norm=(s:string)=>s.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!['que','con','para','por','una','uno','los','las','del','como','pero','cuando','seria'].includes(w));const x=norm(a),y=norm(b);if(a.trim().toLocaleLowerCase()===b.trim().toLocaleLowerCase())return{points:3,similarity:'exacta'};const common=new Set(x.filter(w=>y.includes(w))).size,ratio=common/Math.max(new Set(x.concat(y)).size,1);return ratio>=.45?{points:2,similarity:'aproximada'}:{points:0,similarity:'distinta'}}
export const characterById=(id:string|undefined,all:Character[])=>all.find(c=>c.id===id)
