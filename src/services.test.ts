import { beforeEach, describe, expect, it, vi } from 'vitest'

// Servidor falso con la misma interfaz que las funciones de supabase-setup.sql.
// La garantía de concurrencia vive en Postgres y se prueba con scripts/test-sql.sh.
function installFakeBackend() {
  const rooms = new Map<string, any>()
  const data: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  })
  const calls: { fn: string; args: any }[] = []
  const fail = (message: string) => ({ ok: false, status: 400, json: async () => ({ message }) }) as Response
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response
  vi.stubGlobal('fetch', async (u: string, init: RequestInit) => {
    const fn = u.split('/rpc/')[1]
    const args = JSON.parse(init.body as string)
    calls.push({ fn, args })
    const room = rooms.get((args.p_code ?? args.p_room?.code ?? '').toUpperCase())
    if (fn === 'duo_create_room') {
      if (room) return ok(false)
      rooms.set(args.p_room.code, args.p_room)
      return ok(true)
    }
    if (!room) return fn === 'duo_get_room' ? ok(null) : fail('room_not_found')
    if (fn === 'duo_get_room') return ok(room)
    if (fn === 'duo_join_room') {
      let member = room.members.find((m: any) => m.name.toLowerCase() === args.p_name.toLowerCase())
      if (!member) {
        member = { id: args.p_member_id, name: args.p_name }
        room.members.push(member)
        room.scores[member.id] = 0
      }
      return ok({ room, member })
    }
    if (fn === 'duo_add_round') {
      room.rounds.push(args.p_round)
      room.scores[args.p_round.guesser] += args.p_round.points
      return ok(room)
    }
    if (fn === 'duo_set_character') {
      Object.assign(
        room.members.find((m: any) => m.id === args.p_member_id),
        { characterId: args.p_character, answers: args.p_answers },
      )
      return ok(room)
    }
    return fail('desconocida')
  })
  return { rooms, calls }
}

async function loadServices() {
  vi.resetModules()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
  return import('./services')
}

describe('compareAnswers', () => {
  it('da 3 puntos a una coincidencia exacta sin importar mayúsculas ni espacios', async () => {
    const { compareAnswers } = await loadServices()
    expect(compareAnswers('  Comprar una casa ', 'comprar una casa')).toEqual({ points: 3, similarity: 'exacta' })
  })
  it('da 2 puntos cuando coinciden suficientes palabras (ignora acentos)', async () => {
    const { compareAnswers } = await loadServices()
    expect(compareAnswers('Comprar una casa en la playa', 'una casa en la playa, comprar').points).toBe(2)
    expect(compareAnswers('Viajaría a París', 'viajaria a paris').similarity).toBe('aproximada')
  })
  it('da 0 puntos cuando las respuestas no se parecen', async () => {
    const { compareAnswers } = await loadServices()
    expect(compareAnswers('Dormir todo el día', 'Correr un maratón')).toEqual({ points: 0, similarity: 'distinta' })
  })
})

describe('salas compartidas', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('crea salas con códigos de 5 caracteres sin letras ambiguas y deja activa a la persona', async () => {
    const { rooms } = installFakeBackend()
    const { createRoom, getActive } = await loadServices()
    const room = await createRoom(' Ana ')
    expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/)
    expect(rooms.get(room.code).members[0].name).toBe('Ana')
    expect(getActive()).toEqual({ code: room.code, memberId: room.members[0].id })
  })

  it('prueba otro código si el generado ya existe, sin tocar la sala ajena', async () => {
    const { rooms } = installFakeBackend()
    rooms.set('33333', { code: '33333', members: [{ id: 'x', name: 'Otra' }] })
    const real = crypto.getRandomValues.bind(crypto)
    let first = true
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(((a: Uint8Array) => {
      if (first) {
        first = false
        return a.fill(25) // todos los bytes -> "3"
      }
      return real(a as Uint8Array<ArrayBuffer>)
    }) as typeof crypto.getRandomValues)
    const { createRoom } = await loadServices()
    const room = await createRoom('Zoe')
    expect(room.code).not.toBe('33333')
    expect(rooms.get('33333').members[0].name).toBe('Otra')
  })

  it('une a alguien nuevo y reconoce a quien ya estaba por su nombre', async () => {
    installFakeBackend()
    const { createRoom, joinRoom, getActive } = await loadServices()
    const room = await createRoom('Ana')
    const joined = await joinRoom(room.code.toLowerCase(), 'Beto')
    expect(joined.members.map((m) => m.name)).toEqual(['Ana', 'Beto'])
    const again = await joinRoom(room.code, 'ana')
    expect(again.members).toHaveLength(2)
    expect(getActive()?.memberId).toBe(room.members[0].id)
  })

  it('agregar a alguien desde el panel no cambia quién eres en este dispositivo', async () => {
    installFakeBackend()
    const { createRoom, addMember, getActive, getRoom } = await loadServices()
    const room = await createRoom('Ana')
    await addMember(room.code, 'Beto')
    expect(getActive()?.memberId).toBe(room.members[0].id)
    expect(getRoom(room.code)?.members.map((m) => m.name)).toEqual(['Ana', 'Beto'])
  })

  it('guarda rondas y personajes en la sala activa', async () => {
    const { rooms } = installFakeBackend()
    const { createRoom, joinRoom, saveRound, saveCharacter, getRoom } = await loadServices()
    const a = await createRoom('Ana')
    const b = await joinRoom(a.code, 'Beto')
    const beto = b.members[1]
    await saveRound({
      phrase: 'p',
      writer: a.members[0].id,
      guesser: beto.id,
      original: 'x',
      prediction: 'x',
      points: 3,
      similarity: 'exacta',
      createdAt: 1,
    })
    await saveCharacter('soñador', ['a'])
    expect(rooms.get(a.code).scores[beto.id]).toBe(3)
    expect(getRoom(a.code)?.rounds).toHaveLength(1)
    expect(getRoom(a.code)?.members.find((m) => m.id === beto.id)?.characterId).toBe('soñador')
  })

  it('traduce los errores del servidor a mensajes en español', async () => {
    installFakeBackend()
    const { joinRoom } = await loadServices()
    await expect(joinRoom('NOPE1', 'Ana')).rejects.toThrow('No encontramos esa sala')
  })

  it('avisa si no hay conexión', async () => {
    installFakeBackend()
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    const { joinRoom } = await loadServices()
    await expect(joinRoom('ABCDE', 'Ana')).rejects.toThrow('No hay conexión')
  })
})
