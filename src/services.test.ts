import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = { code: string; room: any }

function installFakeBackend() {
  const store = new Map<string, any>()
  const data: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  })
  const stats = { conflicts: 0 }
  vi.stubGlobal('fetch', async (u: string, init: RequestInit = {}) => {
    const url = new URL(u)
    const code = url.searchParams.get('code')?.replace('eq.', '') ?? ''
    const res = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response
    await new Promise((r) => setTimeout(r, Math.random() * 5)) // latencia aleatoria para intercalar escrituras
    if (init.method === 'POST') {
      const row = JSON.parse(init.body as string) as Row
      if (store.has(row.code)) return res(409, {})
      store.set(row.code, row.room)
      return res(201, null)
    }
    if (init.method === 'PATCH') {
      const current = store.get(code)
      if (!current) return res(200, [])
      const eq = url.searchParams.get('room->>rev')
      const or = url.searchParams.get('or')
      const rev = current.rev ?? null
      const ok = eq !== null ? String(rev) === eq.replace('eq.', '') : or !== null ? rev === null || rev === 0 : true
      if (!ok) {
        stats.conflicts++
        return res(200, [])
      }
      store.set(code, (JSON.parse(init.body as string) as Row).room)
      return res(200, [{ code }])
    }
    const current = store.get(code)
    return res(200, current ? [{ room: structuredClone(current) }] : [])
  })
  return { store, stats }
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
  beforeEach(() => vi.unstubAllGlobals())

  it('crea salas con códigos de 5 caracteres sin letras ambiguas', async () => {
    installFakeBackend()
    const { createRoom } = await loadServices()
    const room = await createRoom('Ana')
    expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/)
  })

  it('no sobrescribe una sala existente si el código se repite', async () => {
    const { store } = installFakeBackend()
    store.set('33333', { code: '33333', members: [{ id: 'x', name: 'Otra' }] })
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
    expect(store.get('33333').members[0].name).toBe('Otra')
    vi.restoreAllMocks()
  })

  it('conserva a todos cuando varias personas se unen al mismo tiempo', async () => {
    const { store, stats } = installFakeBackend()
    const { createRoom, joinRoom } = await loadServices()
    const room = await createRoom('Ana')
    await Promise.all(['B', 'C', 'D', 'E', 'F', 'G'].map((n) => joinRoom(room.code, `Persona ${n}`)))
    expect(store.get(room.code).members).toHaveLength(7)
    expect(stats.conflicts).toBeGreaterThan(0)
  })

  it('migra salas antiguas sin campo rev', async () => {
    const { store } = installFakeBackend()
    store.set('OLD22', {
      code: 'OLD22',
      members: [{ id: 'm1', name: 'Vieja' }],
      scores: { m1: 0 },
      rounds: [],
      createdAt: 1,
    })
    const { joinRoom } = await loadServices()
    await joinRoom('OLD22', 'Nuevo')
    expect(store.get('OLD22').members).toHaveLength(2)
    expect(store.get('OLD22').rev).toBe(1)
  })

  it('avisa cuando la sala no existe', async () => {
    installFakeBackend()
    const { joinRoom } = await loadServices()
    await expect(joinRoom('NOPE1', 'Ana')).rejects.toThrow('No encontramos esa sala')
  })
})
