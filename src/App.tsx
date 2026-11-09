import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Crown,
  Gamepad2,
  Heart,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Star,
  Users,
  WandSparkles,
} from 'lucide-react'
import { characters, phrases, questions } from './data'
import type { Character } from './data'
import {
  compareAnswers,
  characterById,
  createRoom,
  getActive,
  getRoom,
  addMember,
  joinRoom,
  refreshActiveRoom,
  saveCharacter,
  saveRound,
  scheduleGame,
  clearScheduledGame,
  submitActivity,
  revealActivity,
} from './services'
import type { Round } from './services'

const variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
}
const commonPrompts = [
  '¿Qué pequeño detalle puede mejorarle el día a alguien del equipo?',
  '¿Qué habilidad te gustaría aprender este año?',
  '¿Cuál sería un plan perfecto para celebrar un logro del equipo?',
  '¿Qué canción pondrías para levantar el ánimo en un día pesado?',
  '¿Qué cosa disfrutas hacer fuera del trabajo y casi nadie sabe?',
  '¿Qué consejo te habría servido mucho cuando empezaste tu carrera?',
  '¿Qué lugar te gustaría conocer con tus compañeros?',
  '¿Qué talento inesperado tienes?',
]
const radarPrompts = [
  '¿Quién del equipo encontraría el mejor plan para una aventura improvisada?',
  '¿A quién le pedirías ayuda para aprender algo nuevo?',
  '¿Quién tiene el talento de hacer sentir bienvenida a la gente?',
  '¿Quién propondría la idea más creativa para celebrar un logro?',
  '¿Quién mantendría la calma si el plan cambia a última hora?',
  '¿Quién descubriría el mejor café o lugar para comer cerca?',
  '¿Quién te enseñaría algo que no sabías que necesitabas aprender?',
  '¿Quién contagia más entusiasmo cuando el equipo logra algo?',
]
function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link className={`brand ${small ? 'brand-small' : ''}`} to="/">
      <span>DÚO</span>
      <i />
    </Link>
  )
}
function Header() {
  const active = getActive(),
    room = active ? getRoom(active.code) : null
  return (
    <header className="topbar">
      <Brand />
      <nav>
        <Link to="/sala">Sala</Link>
        {room && <Link to="/juegos">Juegos</Link>}
        {room && <Link to="/equipo">Equipo</Link>}
      </nav>
      <div className="top-actions">
        {room && (
          <span className="room-pill">
            <span className="online-dot" />
            Sala {room.code}
          </span>
        )}
        <Link className="avatar" to={room ? '/equipo' : '/sala'}>
          {room?.members
            .find((m) => m.id === active?.memberId)
            ?.name.slice(0, 1)
            .toUpperCase() || '↗'}
        </Link>
      </div>
    </header>
  )
}
function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <main>{children}</main>
      <footer>
        <span>Hecho para acercar equipos.</span>
        <span>
          DÚO <i>·</i> Salas compartidas
        </span>
      </footer>
    </div>
  )
}
function Home() {
  return (
    <Page>
      <motion.section className="hero" initial="initial" animate="animate" variants={variants}>
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> UNA NUEVA FORMA DE CONECTAR
          </div>
          <h1>
            El equipo se
            <br />
            conoce <em>jugando.</em>
          </h1>
          <p>
            Pequeñas dinámicas. Grandes descubrimientos. Un espacio para reír, sorprenderse y conocer a las personas
            detrás del equipo.
          </p>
          <div className="hero-buttons">
            <Link to="/sala" className="button button-primary">
              Comenzar <ArrowRight size={17} />
            </Link>
            <a href="#como-funciona" className="button button-quiet">
              Descubrir DÚO <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="social-proof">
            <div className="avatar-stack">
              <span>V</span>
              <span>M</span>
              <span>A</span>
              <span>+</span>
            </div>
            <span>
              Mejores conversaciones,
              <br />
              <strong>un juego a la vez.</strong>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-glow" />
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />
          <div className="game-card card-back">
            <span className="mini-label">EL EQUIPO DICE</span>
            <div className="quote-mark">“</div>
            <div className="line wide" />
            <div className="line" />
            <div className="card-footer">
              <span>Una frase, dos versiones.</span>
              <span className="tiny-dot" />
            </div>
          </div>
          <div className="game-card card-front">
            <div className="card-top">
              <span className="live-label">
                <i /> EN JUEGO
              </span>
              <span className="card-counter">01 / 08</span>
            </div>
            <div className="prompt">
              Si mañana me volviera millonario,
              <br />
              lo primero que haría sería…
            </div>
            <div className="answer-chip">
              <span className="answer-avatar">M</span>
              <span>
                <small>MATEO RESPONDIÓ</small>
                <strong>Comprar una casa en la playa</strong>
              </span>
              <Check size={16} />
            </div>
            <div className="reveal-chip">
              <Sparkles size={15} /> ¡Casi le atinas!
            </div>
            <div className="card-decoration">
              D<span>Ú</span>O
            </div>
          </div>
          <div className="floating-note">
            <div className="note-icon">
              <Heart size={15} />
            </div>
            <span>
              <strong>Más conexión</strong>
              <small>en cada ronda</small>
            </span>
          </div>
          <div className="floating-stars">
            <Sparkles size={20} />
          </div>
        </div>
      </motion.section>
      <section className="home-games">
        <div className="section-heading">
          <div>
            <div className="eyebrow">DINÁMICAS PARA TODO EL EQUIPO</div>
            <h2>¿A qué jugamos?</h2>
          </div>
          <Link to="/sala" className="text-link">
            Ver dinámicas <ArrowRight size={15} />
          </Link>
        </div>
        <div className="game-grid">
          <Link to="/sala" className="game-tile tile-lavender">
            <div className="tile-top">
              <span className="tile-index">01 / TODOS RESPONDEN</span>
              <ArrowUpRight size={18} />
            </div>
            <div className="tile-illustration phrase-illustration">
              <span className="bubble bubble-a">¿Qué diría?</span>
              <span className="bubble bubble-b">¡Yo sé!</span>
              <span className="bubble bubble-c">…</span>
              <div className="scribble" />
            </div>
            <h3>
              Encuentren lo que
              <br />
              tienen en común.
            </h3>
            <p>Una pregunta, una respuesta de cada persona y una revelación para conversar.</p>
            <span className="tile-link">
              Descubrir dinámica <ArrowRight size={15} />
            </span>
          </Link>
          <Link to="/sala" className="game-tile tile-peach">
            <div className="tile-top">
              <span className="tile-index">02 / TODOS VOTAN</span>
              <ArrowUpRight size={18} />
            </div>
            <div className="tile-illustration personality-illustration">
              <div className="sunburst" />
              <div className="person p-one">L</div>
              <div className="person p-two">C</div>
              <div className="person p-three">E</div>
              <div className="person p-four">S</div>
              <div className="orbit-label">
                TU EQUIPO
                <br />
                EN PERSONAJES
              </div>
            </div>
            <h3>
              Descubran los talentos
              <br />
              del equipo.
            </h3>
            <p>Una consigna divertida, un voto de cada quien y un resultado para celebrar.</p>
            <span className="tile-link">
              Descubrir dinámica <ArrowRight size={15} />
            </span>
          </Link>
        </div>
      </section>
      <section className="how-section" id="como-funciona">
        <div>
          <div className="eyebrow">SENCILLO, COMO DEBERÍA SER</div>
          <h2>Juntos, pero más cerca.</h2>
        </div>
        <div className="steps">
          <div>
            <span>01</span>
            <h4>Arma tu sala</h4>
            <p>Invita al equipo con un código único.</p>
          </div>
          <div>
            <span>02</span>
            <h4>Elijan una dinámica</h4>
            <p>Una ronda rápida o un perfil sorpresa.</p>
          </div>
          <div>
            <span>03</span>
            <h4>Descúbranse</h4>
            <p>Las mejores respuestas se cuentan juntas.</p>
          </div>
        </div>
      </section>
      <div className="local-note">
        <LockKeyhole size={15} />
        <span>Las salas se comparten entre dispositivos mediante Supabase.</span>
      </div>
    </Page>
  )
}
function RoomPage() {
  const nav = useNavigate(),
    [name, setName] = useState(''),
    [code, setCode] = useState(''),
    [tab, setTab] = useState<'create' | 'join'>('create'),
    [error, setError] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (name.trim().length < 2) {
      setError('Escribe un nombre de al menos 2 caracteres.')
      return
    }
    try {
      const r = tab === 'create' ? await createRoom(name) : await joinRoom(code, name)
      nav('/juegos', { state: { code: r.code } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar a la sala.')
    }
  }
  return (
    <Page>
      <motion.section className="room-layout" initial="initial" animate="animate" variants={variants}>
        <div className="room-intro">
          <Link to="/" className="back-link">
            <ArrowLeft size={15} /> Volver al inicio
          </Link>
          <div className="eyebrow">TU EQUIPO, TU ESPACIO</div>
          <h1>
            Todo empieza
            <br />
            con un <em>nombre.</em>
          </h1>
          <p>Crea una sala para tu equipo o entra a una con el código que te compartieron.</p>
          <div className="room-visual">
            <div className="visual-circle vc-one" />
            <div className="visual-circle vc-two" />
            <div className="visual-circle vc-three" />
            <Users size={31} />
            <span>
              UN LUGAR PARA
              <br />
              ENCONTRARSE
            </span>
          </div>
        </div>
        <form className="room-form" onSubmit={submit}>
          <div className="tabs">
            <button type="button" className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>
              Crear sala
            </button>
            <button type="button" className={tab === 'join' ? 'active' : ''} onClick={() => setTab('join')}>
              Unirme a una
            </button>
          </div>
          <div className="form-body">
            <div className="form-kicker">{tab === 'create' ? 'EMPIEZA ALGO NUEVO' : 'YA TIENES UNA INVITACIÓN'}</div>
            <h2>{tab === 'create' ? 'Crea tu espacio' : 'Qué bueno que llegaste'}</h2>
            <label htmlFor="name">¿Cómo te llamas?</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={32}
              autoComplete="name"
            />
            <AnimatePresence>
              {tab === 'join' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label htmlFor="code">Código de sala</label>
                  <input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="Ej. ABCD1234"
                    maxLength={8}
                    className="code-input"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {error && <p className="form-error">{error}</p>}
            <button className="button button-primary form-submit">
              {tab === 'create' ? 'Crear mi sala' : 'Entrar a la sala'} <ArrowRight size={16} />
            </button>
            <p className="form-privacy">
              <LockKeyhole size={13} /> Tu nombre y las partidas se guardan en la sala compartida.
            </p>
          </div>
        </form>
      </motion.section>
    </Page>
  )
}
function Dashboard() {
  const nav = useNavigate(),
    active = getActive(),
    room = active ? getRoom(active.code) : null,
    [name, setName] = useState(''),
    [toast, setToast] = useState(''),
    [startsAt, setStartsAt] = useState(''),
    [busy, setBusy] = useState(false)
  const self = room?.members.find((m) => m.id === active?.memberId)
  const isHost = Boolean(active?.hostToken)
  const gamePath = room?.selectedGame === 'common' ? '/coincidencias' : '/radar'
  const startTime = room?.startsAt ?? null
  if (!room) return <Navigate to="/sala" replace />
  async function chooseGame(game: 'common' | 'radar') {
    setBusy(true)
    try {
      const when = startsAt ? new Date(startsAt).getTime() : null
      if (when !== null && (!Number.isFinite(when) || when < Date.now())) throw Error('Elige una hora futura.')
      const prompts = game === 'common' ? commonPrompts : radarPrompts
      const prompt = prompts[Math.floor(Math.random() * prompts.length)]
      await scheduleGame(game, when, prompt)
      setToast(when ? 'Dinámica programada para toda la sala.' : 'La dinámica comienza para toda la sala.')
    } catch (err) { setToast(err instanceof Error ? err.message : 'No se pudo actualizar la sala.') }
    finally { setBusy(false); setTimeout(() => setToast(''), 3000) }
  }
  async function stopGame() {
    setBusy(true)
    try { await clearScheduledGame() } catch (err) { setToast(err instanceof Error ? err.message : 'No se pudo detener.') }
    finally { setBusy(false) }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) return
    try {
      await addMember(room!.code, name)
      setName('')
      setToast(`${name.trim()} ya está en el equipo.`)
      setTimeout(() => setToast(''), 2800)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo agregar a la persona.')
      setTimeout(() => setToast(''), 3000)
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(room!.code)
      setToast('Código copiado. ¡Compártelo con tu equipo!')
    } catch {
      setToast(`Código de sala: ${room!.code}`)
    }
    setTimeout(() => setToast(''), 3000)
  }
  return (
    <Page>
      <motion.section className="dashboard" initial="initial" animate="animate" variants={variants}>
        <div className="dash-head">
          <div>
            <div className="eyebrow">BIENVENIDA, {self?.name.toUpperCase() || 'AL EQUIPO'}</div>
            <h1>
              Un equipo.
              <br />
              <em>Muchas historias.</em>
            </h1>
          </div>
          <div className="room-code-card">
            <span>CÓDIGO DE TU SALA</span>
            <strong>{room.code}</strong>
            <button className="copy-button" onClick={copy}>
              <Copy size={14} /> Copiar invitación
            </button>
          </div>
        </div>
        <div className="dash-content">
          <section className="dash-main">
            <div className="section-heading">
              <div>
                <div className="eyebrow">ELIGE CÓMO JUGAR</div>
                <h2>La diversión empieza aquí.</h2>
              </div>
            </div>
            <section className="host-controls">
              <div className="host-controls-head">
                <div className="eyebrow">SALA EN VIVO {isHost ? '· ERES ANFITRIÓN' : '· ESPERANDO AL ANFITRIÓN'}</div>
                <p>{room.selectedGame ? (startTime && startTime > Date.now() ? `La dinámica inicia ${new Date(startTime).toLocaleString()}` : 'La dinámica está iniciando en todos los dispositivos.') : 'El anfitrión elige qué jugar y cuándo empezar.'}</p>
              </div>
              {(room.selectedGame === 'common' || room.selectedGame === 'radar') && (!startTime || startTime <= Date.now()) && <button className="button button-primary" onClick={() => nav(gamePath)}>{isHost ? 'Entrar a la dinámica' : 'Entrar al juego de la sala'} <ArrowRight size={15} /></button>}
              {isHost && <div className="host-controls-actions">
                <label className="schedule-label">Hora de inicio (opcional)<input aria-label="Hora de inicio, opcional" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
                <button className="button button-primary" disabled={busy} onClick={() => void chooseGame('common')}>{startsAt ? 'Programar Coincidencias' : 'Jugar Coincidencias ahora'} <ArrowRight size={15} /></button>
                <button className="button button-dark" disabled={busy} onClick={() => void chooseGame('radar')}>{startsAt ? 'Programar Radar' : 'Jugar Radar ahora'} <ArrowRight size={15} /></button>
                {room.selectedGame && <button className="host-stop" disabled={busy} onClick={() => void stopGame()}>Cancelar dinámica</button>}
              </div>}
            </section>
            <div className="dash-game-list">
              <article className="dash-game dash-g1">
                <div className="dash-icon">
                  <Lightbulb size={22} />
                </div>
                <div className="dash-game-copy">
                  <div className="game-meta">
                    TODOS PARTICIPAN <span>·</span> 3 MIN
                  </div>
                  <h3>Coincidencias</h3>
                  <p>Todos responden la misma pregunta. Después revelamos y descubrimos qué tienen en común.</p>
                  <span className="game-meta">1. Responde · 2. Revelamos · 3. Platicamos</span>
                </div>
                <div className="dash-number">01</div>
              </article>
              <article className="dash-game dash-g2">
                <div className="dash-icon">
                  <WandSparkles size={22} />
                </div>
                <div className="dash-game-copy">
                  <div className="game-meta">
                    VOTACIÓN GRUPAL <span>·</span> 2 MIN
                  </div>
                  <h3>Radar del equipo</h3>
                  <p>Voten por quien mejor encaja con una consigna positiva y descubran los talentos que ve el equipo.</p>
                  <span className="game-meta">1. Elige · 2. Todos votan · 3. Descubrimos</span>
                </div>
                <div className="dash-number">02</div>
              </article>
            </div>
          </section>
          <aside className="team-panel">
            <div className="team-head">
              <div>
                <div className="eyebrow">LAS PERSONAS</div>
                <h3>
                  Tu equipo <span>{room.members.length.toString().padStart(2, '0')}</span>
                </h3>
              </div>
              <Link to="/equipo" className="icon-link" aria-label="Ver equipo">
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="member-list">
              {room.members.map((m, i) => {
                const ch = characterById(m.characterId, characters)
                return (
                  <div className="member-row" key={m.id}>
                    <div
                      className="member-avatar"
                      style={
                        {
                          '--member-color': ch?.color || ['#b4a0ff', '#f2a28f', '#92c8b4'][i % 3],
                        } as React.CSSProperties
                      }
                    >
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <strong>
                        {m.name}
                        {m.id === active?.memberId && <small> TÚ</small>}
                      </strong>
                      <span>{ch?.name || 'Por descubrir'}</span>
                    </div>
                    {ch && (
                      <span className="member-mark" style={{ color: ch.color }}>
                        ✳
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <form className="add-member" onSubmit={add}>
              <label htmlFor="add-name">¿Alguien más se suma?</label>
              <div>
                <input
                  id="add-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre de tu compañero"
                  maxLength={32}
                />
                <button aria-label="Agregar participante" disabled={name.trim().length < 2}>
                  <ArrowRight size={16} />
                </button>
              </div>
              <small>También puedes invitar a tu equipo con el código de sala.</small>
            </form>
            <Link className="team-results-link" to="/equipo">
              Ver resultados del equipo <ArrowRight size={15} />
            </Link>
          </aside>
        </div>
        {toast && (
          <div className="toast">
            <Check size={16} />
            {toast}
          </div>
        )}
      </motion.section>
    </Page>
  )
}
function SharedActivity({ kind }: { kind: 'common' | 'radar' }) {
  const nav = useNavigate(),
    active = getActive(),
    room = active ? getRoom(active.code) : null,
    activity = room?.activity,
    [value, setValue] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const isHost = Boolean(active?.hostToken)
  const isCommon = kind === 'common'
  const field = isCommon ? activity?.responses : activity?.votes
  const submitted = Boolean(active && field?.[active.memberId])
  const totalSubmitted = Object.keys(field || {}).length
  const promptPool = isCommon ? commonPrompts : radarPrompts
  if (!room) return <Navigate to="/sala" replace />
  if (room.selectedGame !== kind || (room.startsAt != null && room.startsAt > Date.now()) || !activity)
    return <Navigate to="/juegos" replace />
  const currentActivity = activity!
  const voteCounts = room.members.map((member) => ({
    member,
    votes: Object.values(currentActivity.votes || {}).filter((id) => id === member.id).length,
  }))
  const highScore = Math.max(0, ...voteCounts.map((row) => row.votes))
  const winners = voteCounts.filter((row) => row.votes === highScore && highScore > 0)
  async function send() {
    if (!value.trim()) return
    setBusy(true)
    setError('')
    try { await submitActivity(value) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar tu participación.') }
    finally { setBusy(false) }
  }
  async function reveal() {
    setBusy(true)
    setError('')
    try { await revealActivity() }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo revelar la ronda.') }
    finally { setBusy(false) }
  }
  async function nextRound() {
    const options = promptPool.filter((prompt) => prompt !== currentActivity.prompt)
    const prompt = options[Math.floor(Math.random() * options.length)] || promptPool[0]
    setBusy(true)
    setError('')
    try { await scheduleGame(kind, null, prompt) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo iniciar otra ronda.') }
    finally { setBusy(false) }
  }
  async function finish() {
    setBusy(true)
    try { await clearScheduledGame(); nav('/juegos') }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cerrar la dinámica.') }
    finally { setBusy(false) }
  }
  return (
    <Page>
      <motion.section className="activity-page" initial="initial" animate="animate" variants={variants}>
        <div className="game-page-head">
          <Link to="/juegos" className="back-link"><ArrowLeft size={15} /> Sala del equipo</Link>
          <span className="game-label"><Sparkles size={15} /> {isCommon ? 'COINCIDENCIAS' : 'RADAR DEL EQUIPO'}</span>
          <span className="round-count">RONDA {String(currentActivity.round).padStart(2, '0')}</span>
        </div>
        <div className="activity-progress"><span style={{ width: `${Math.min(100, totalSubmitted / room.members.length * 100)}%` }} /></div>
        <div className="activity-shell">
          <div className="activity-step"><span>LA PREGUNTA DEL EQUIPO</span><b>{totalSubmitted}/{room.members.length} PARTICIPANDO</b></div>
          <h1>{currentActivity.prompt}</h1>
          <p className="activity-intro">{isCommon
            ? 'Cada quien escribe su respuesta. Cuando estén listos, el anfitrión las revela todas juntas.'
            : 'Piensa en alguien del equipo que encaje con la consigna. Todos votan y el resultado se revela al mismo tiempo.'}</p>
          {currentActivity.status === 'collecting' ? (
            <div className="activity-participate">
              {isCommon ? (
                <>
                  <label htmlFor="activity-answer">Tu respuesta</label>
                  <textarea id="activity-answer" maxLength={280} value={value || (active ? currentActivity.responses[active.memberId] || '' : '')} onChange={(event) => setValue(event.target.value)} placeholder="Escribe algo breve y auténtico…" />
                </>
              ) : (
                <>
                  <p className="activity-pick-label">¿Quién te viene a la mente?</p>
                  <div className="activity-vote-grid">
                    {room.members.map((member, index) => (
                      <button key={member.id} type="button" className={`activity-person ${value === member.id || (!value && active && currentActivity.votes[active.memberId] === member.id) ? 'selected' : ''}`} onClick={() => setValue(member.id)}>
                        <span className="activity-person-avatar" style={{ '--member-color': ['#b4a0ff', '#f2a28f', '#92c8b4', '#ecc978'][index % 4] } as React.CSSProperties}>{member.name.slice(0, 1).toUpperCase()}</span>
                        {member.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {submitted && <div className="activity-confirm"><Check size={16} /> Ya participaste. Puedes cambiar tu respuesta mientras esperan.</div>}
              <button className="button button-primary activity-submit" disabled={busy || !value.trim()} onClick={() => void send()}>{busy ? 'Guardando…' : submitted ? 'Actualizar mi respuesta' : 'Listo, enviar mi respuesta'} <ArrowRight size={16} /></button>
              <div className="activity-roster"><strong>En la sala</strong>{room.members.map((member) => <span key={member.id} className={field?.[member.id] ? 'done' : ''}>{field?.[member.id] ? <Check size={13} /> : <span className="roster-dot" />}{member.name}{member.id === active?.memberId ? ' (tú)' : ''}</span>)}</div>
              {isHost && totalSubmitted < room.members.length && <p className="activity-host-note">Faltan {room.members.length - totalSubmitted} por participar. Al completar el equipo podrás revelar.</p>}
              {isHost && <button className="button button-dark activity-reveal" disabled={busy || totalSubmitted < room.members.length} onClick={() => void reveal()}>Revelar respuestas de todos <Sparkles size={15} /></button>}
              {!isHost && <p className="activity-host-note">El anfitrión revelará la ronda cuando el equipo esté listo.</p>}
            </div>
          ) : (
            <div className="activity-results">
              {isCommon ? (
                <>
                  <div className="activity-result-heading"><Sparkles size={18} /><div><strong>Esto compartimos</strong><span>Lean las respuestas y encuentren sus coincidencias.</span></div></div>
                  <div className="activity-answer-grid">{room.members.filter((member) => currentActivity.responses[member.id]).map((member, index) => <article className="activity-answer" key={member.id}><span>{member.name}</span><p>{currentActivity.responses[member.id]}</p><small>{index === 0 ? '¡Alguien tenía que empezar!' : 'Una mirada del equipo'}</small></article>)}</div>
                </>
              ) : (
                <>
                  <div className="activity-result-heading"><Sparkles size={18} /><div><strong>{winners.length === 1 ? `El equipo eligió a ${winners[0].member.name}` : '¡El equipo ve talento por todas partes!'}</strong><span>{totalSubmitted} votos · cada elección suma una voz</span></div></div>
                  <div className="activity-vote-results">{voteCounts.map(({ member, votes }) => <div className="activity-vote-result" key={member.id}><span>{member.name}</span><div className="activity-vote-track"><i style={{ width: `${totalSubmitted ? votes / totalSubmitted * 100 : 0}%` }} /></div><b>{votes}</b></div>)}</div>
                </>
              )}
              {isHost ? <div className="activity-host-actions"><button className="button button-primary" disabled={busy} onClick={() => void nextRound()}>Otra pregunta <ArrowRight size={15} /></button><button className="button button-dark" disabled={busy} onClick={() => void finish()}>Volver a elegir dinámica</button></div> : <p className="activity-host-note">El anfitrión puede lanzar otra ronda o volver a la sala.</p>}
            </div>
          )}
          {error && <p className="form-error activity-error">{error}</p>}
        </div>
      </motion.section>
    </Page>
  )
}
function SentenceGame() {
  const nav = useNavigate(),
    active = getActive(),
    room = active ? getRoom(active.code) : null,
    [writer, setWriter] = useState(''),
    [guesser, setGuesser] = useState(''),
    [phraseIndex, setPhraseIndex] = useState(() => Math.floor(Math.random() * phrases.length)),
    [original, setOriginal] = useState(''),
    [prediction, setPrediction] = useState(''),
    [phase, setPhase] = useState<'setup' | 'write' | 'guess' | 'reveal'>('setup'),
    [roundNo, setRoundNo] = useState((room?.rounds.length || 0) + 1),
    [error, setError] = useState('')
  if (!room) return <Navigate to="/sala" replace />
  if (room.selectedGame !== 'phrase' || (room.startsAt != null && room.startsAt > Date.now()))
    return <Navigate to="/juegos" replace />
  const available = room.members
  if (available.length < 2)
    return (
      <Page>
        <Empty
          title="Falta alguien para empezar"
          text="Invita a otra persona al equipo con el código de sala. La entrada de participantes está en el menú principal."
          action="Volver al menú"
          go={() => nav('/juegos')}
        />
      </Page>
    )
  const phrase = phrases[phraseIndex],
    writerMember = room.members.find((m) => m.id === writer),
    guesserMember = room.members.find((m) => m.id === guesser),
    result = compareAnswers(original, prediction)
  function start() {
    if (!writer || !guesser || writer === guesser) {
      setError('Elige dos personas diferentes para jugar.')
      return
    }
    setError('')
    setPhase('write')
  }
  async function reveal() {
    if (!prediction.trim()) {
      setError('Escribe una predicción antes de revelar.')
      return
    }
    const r: Round = {
      phrase: phrase.text,
      writer,
      guesser,
      original: original.trim(),
      prediction: prediction.trim(),
      points: result.points,
      similarity: result.similarity,
      createdAt: Date.now(),
    }
    try {
      await saveRound(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la ronda.')
      return
    }
    setPhase('reveal')
  }
  function next() {
    setRoundNo((n) => n + 1)
    setPhraseIndex((i) => (i + 1 + Math.floor(Math.random() * (phrases.length - 1))) % phrases.length)
    setOriginal('')
    setPrediction('')
    setError('')
    setPhase('setup')
  }
  return (
    <Page>
      <motion.section className="game-page" initial="initial" animate="animate" variants={variants}>
        <div className="game-page-head">
          <Link to="/juegos" className="back-link">
            <ArrowLeft size={15} /> Menú de juegos
          </Link>
          <span className="game-label">
            <Lightbulb size={15} /> COMPLETA LA FRASE
          </span>
          <span className="round-count">RONDA {String(roundNo).padStart(2, '0')}</span>
        </div>
        <div className="progress-track">
          <i style={{ width: `${phase === 'setup' ? 15 : phase === 'write' ? 38 : phase === 'guess' ? 68 : 100}%` }} />
        </div>
        <div className="sentence-layout">
          <div className="sentence-main">
            <div className="eyebrow">
              {phase === 'setup'
                ? 'ANTES DE EMPEZAR'
                : phase === 'write'
                  ? 'TURNO DE QUIEN RESPONDE'
                  : phase === 'guess'
                    ? 'TURNO DE QUIEN ADIVINA'
                    : 'MOMENTO DE LA VERDAD'}
            </div>
            <h1>
              {phase === 'setup'
                ? '¿Quién conoce mejor\na quién?'
                : phase === 'write'
                  ? `Tu turno, ${writerMember?.name}.`
                  : phase === 'guess'
                    ? `Ahora tú, ${guesserMember?.name}.`
                    : '¡Hora de revelar!'}
            </h1>
            <p className="game-subtitle">
              {phase === 'setup'
                ? 'Elijan quién responde primero y quién intenta adivinar.'
                : phase === 'write'
                  ? 'Escribe lo primero que te venga a la mente. Tu compañero no podrá verlo.'
                  : phase === 'guess'
                    ? 'Lee la frase y trata de adivinar exactamente qué escribió tu compañero.'
                    : 'Descubramos qué tan cerca estuvieron.'}
            </p>
            <div className="phrase-card">
              <span className="phrase-category">{phrase.category.toUpperCase()}</span>
              <p>{phrase.text}</p>
              {phase === 'write' && (
                <textarea
                  autoFocus
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                  maxLength={160}
                  placeholder="Tu respuesta espontánea…"
                />
              )}
              {phase === 'guess' && (
                <textarea
                  autoFocus
                  value={prediction}
                  onChange={(e) => setPrediction(e.target.value)}
                  maxLength={160}
                  placeholder="¿Qué crees que respondió?…"
                />
              )}
              {phase === 'reveal' && (
                <div className="answer-reveal">
                  <div>
                    <span>RESPUESTA DE {writerMember?.name.toUpperCase()}</span>
                    <strong>{original}</strong>
                  </div>
                  <div>
                    <span>PREDICCIÓN DE {guesserMember?.name.toUpperCase()}</span>
                    <strong>{prediction}</strong>
                  </div>
                </div>
              )}
            </div>
            {error && <p className="form-error">{error}</p>}
            {phase === 'setup' && (
              <div className="player-selects">
                <label>
                  ¿Quién responde?
                  <select value={writer} onChange={(e) => setWriter(e.target.value)}>
                    <option value="">Elige a alguien</option>
                    {available.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  ¿Quién adivina?
                  <select value={guesser} onChange={(e) => setGuesser(e.target.value)}>
                    <option value="">Elige a alguien</option>
                    {available
                      .filter((m) => m.id !== writer)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            )}
            {phase === 'write' && (
              <div className="turn-handoff">
                <LockKeyhole size={14} /> Pasa el dispositivo a {guesserMember?.name} después de guardar.
              </div>
            )}
            {phase === 'reveal' && (
              <div className={`score-result ${result.points ? 'score-hit' : 'score-miss'}`}>
                <div className="result-icon">{result.points ? <Star size={19} /> : <Heart size={19} />}</div>
                <div>
                  <strong>
                    {result.points === 3
                      ? '¡Coincidencia exacta!'
                      : result.points === 2
                        ? '¡Muy cerca!'
                        : '¡Cada quien tiene su estilo!'}
                  </strong>
                  <span>
                    {result.points === 3
                      ? 'Se conocen demasiado bien.'
                      : result.points === 2
                        ? 'Respuestas parecidas, buena conexión.'
                        : 'Esta respuesta se queda para la anécdota.'}
                  </span>
                </div>
                <b>+{result.points}</b>
              </div>
            )}
            <div className="game-actions">
              {phase === 'setup' && (
                <button className="button button-primary" onClick={start}>
                  Comenzar ronda <ArrowRight size={16} />
                </button>
              )}
              {phase === 'write' && (
                <button
                  className="button button-primary"
                  onClick={() =>
                    original.trim() ? setPhase('guess') : setError('Escribe tu respuesta antes de continuar.')
                  }
                >
                  Guardar y pasar turno <ArrowRight size={16} />
                </button>
              )}
              {phase === 'guess' && (
                <button className="button button-primary" onClick={reveal}>
                  Revelar respuestas <Sparkles size={16} />
                </button>
              )}
              {phase === 'reveal' && (
                <>
                  <button className="button button-primary" onClick={next}>
                    Siguiente ronda <ArrowRight size={16} />
                  </button>
                  <button className="button button-quiet" onClick={() => nav('/equipo')}>
                    Ver marcador <Crown size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          <aside className="score-sidebar">
            <div className="score-header">
              <span>MARCADOR</span>
              <span>{room.members.length} JUGADORES</span>
            </div>
            {[...room.members]
              .sort((a, b) => (room.scores[b.id] || 0) - (room.scores[a.id] || 0))
              .map((m, i) => (
                <div className="score-player" key={m.id}>
                  <span className="score-rank">{i === 0 ? <Crown size={15} /> : String(i + 1).padStart(2, '0')}</span>
                  <span className="score-player-name">{m.name}</span>
                  <strong>
                    {room.scores[m.id] || 0}
                    <small> pts</small>
                  </strong>
                </div>
              ))}
            <div className="score-history">
              <div className="history-title">
                ÚLTIMAS RONDAS <span>{room.rounds.length}</span>
              </div>
              {room.rounds
                .slice(-4)
                .reverse()
                .map((r, i) => (
                  <div className="history-item" key={`${r.createdAt}-${i}`}>
                    <span>
                      {room.members.find((m) => m.id === r.writer)?.name} <i>→</i>{' '}
                      {room.members.find((m) => m.id === r.guesser)?.name}
                    </span>
                    <small>{r.points} pts</small>
                  </div>
                ))}
              {!room.rounds.length && <p className="history-empty">Las respuestas y el marcador aparecerán aquí.</p>}
            </div>
          </aside>
        </div>
      </motion.section>
    </Page>
  )
}
function Quiz() {
  const nav = useNavigate(),
    active = getActive(),
    room = active ? getRoom(active.code) : null,
    [step, setStep] = useState(0),
    [answers, setAnswers] = useState<string[]>([]),
    [result, setResult] = useState<Character | null>(null),
    [flipped, setFlipped] = useState(false)
  if (!room) return <Navigate to="/sala" replace />
  async function choose(id: string) {
    const next = [...answers.slice(0, step), id]
    setAnswers(next)
    if (step === questions.length - 1) {
      const counts = new Map<string, number>()
      next.forEach((x) => counts.set(x, (counts.get(x) || 0) + 1))
      const max = Math.max(...counts.values())
      const winners = next.filter((x) => counts.get(x) === max)
      const winner = winners[Math.floor(Math.random() * winners.length)]
      const character = characters.find((c) => c.id === winner)!
      setResult(character)
      try {
        await saveCharacter(winner, next)
      } finally {
        setTimeout(() => setFlipped(true), 300)
      }
    } else setTimeout(() => setStep((s) => s + 1), 170)
  }
  function restart() {
    if (!window.confirm('¿Quieres volver a empezar el cuestionario?')) return
    setStep(0)
    setAnswers([])
    setResult(null)
    setFlipped(false)
  }
  return (
    <Page>
      <motion.section className="quiz-page" initial="initial" animate="animate" variants={variants}>
        <div className="game-page-head">
          <Link to="/juegos" className="back-link">
            <ArrowLeft size={15} /> Menú de juegos
          </Link>
          <span className="game-label">
            <WandSparkles size={15} /> ¿QUÉ PERSONAJE ERES?
          </span>
          <span className="round-count">{result ? 'RESULTADO' : `${String(step + 1).padStart(2, '0')} / 08`}</span>
        </div>
        <div className="progress-track">
          <i style={{ width: result ? '100%' : `${((step + 1) / questions.length) * 100}%` }} />
        </div>
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              className="quiz-result"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
            >
              <div
                className={`character-card ${flipped ? 'revealed' : ''}`}
                style={{ '--character-color': result.color } as React.CSSProperties}
              >
                <div className="character-orbit orbit-a" />
                <div className="character-orbit orbit-b" />
                <div className="character-symbol">{result.initials}</div>
                <div className="character-topline">
                  TU PERSONAJE DÚO <Sparkles size={14} />
                </div>
                <div className="character-tagline">{result.tagline}</div>
                <h1>¡Eres {result.name}!</h1>
                <p>{result.description}</p>
                <div className="character-quote">{result.quote}</div>
              </div>
              <div className="character-details">
                <div>
                  <span>TU SUPERPODER</span>
                  <strong>{result.strength}</strong>
                </div>
                <div>
                  <span>TU DEBILIDAD DIVERTIDA</span>
                  <strong>{result.weakness}</strong>
                </div>
              </div>
              <div className="quiz-result-actions">
                <button className="button button-primary" onClick={restart}>
                  <RotateCcw size={15} /> Repetir cuestionario
                </button>
                <button className="button button-quiet" onClick={() => nav('/equipo')}>
                  Ver equipo <ArrowRight size={15} />
                </button>
              </div>
              <p className="quiz-disclaimer">
                Este resultado es solo para divertirse. No es una evaluación psicológica.
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="question-card"
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
            >
              <div className="question-number">
                PREGUNTA <span>{String(step + 1).padStart(2, '0')}</span>
              </div>
              <h1>{questions[step].text}</h1>
              <p>Elige lo que más se parece a ti. No hay respuestas equivocadas.</p>
              <div className="answer-options">
                {questions[step].options.map((o, i) => (
                  <button key={o.character} className="answer-option" onClick={() => choose(o.character)}>
                    <span className={`option-index option-${i}`}>
                      <span>{String.fromCharCode(65 + i)}</span>
                    </span>
                    <span>{o.label}</span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
              <div className="question-foot">
                <span>RESPONDE A TU RITMO</span>
                <span>
                  {8 - step} {step === 7 ? 'pregunta' : 'preguntas'} {step === 7 ? 'para' : 'más'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </Page>
  )
}
function TeamResults() {
  const nav = useNavigate(),
    active = getActive(),
    room = active ? getRoom(active.code) : null
  if (!room) return <Navigate to="/sala" replace />
  const total = room.members.length,
    withResult = room.members.filter((m) => m.characterId),
    counts = characters
      .map((c) => ({ c, n: withResult.filter((m) => m.characterId === c.id).length }))
      .filter((x) => x.n)
      .sort((a, b) => b.n - a.n)
  const max = Math.max(...counts.map((x) => x.n), 1),
    topScore = Math.max(...Object.values(room.scores), 0),
    leaders = room.members.filter((m) => (room.scores[m.id] || 0) === topScore)
  return (
    <Page>
      <motion.section className="results-page" initial="initial" animate="animate" variants={variants}>
        <Link to="/juegos" className="back-link">
          <ArrowLeft size={15} /> Menú de juegos
        </Link>
        <div className="results-head">
          <div>
            <div className="eyebrow">
              SALA {room.code} <span>·</span> RESULTADOS
            </div>
            <h1>
              Así se ve
              <br />
              <em>tu equipo.</em>
            </h1>
          </div>
          <div className="results-summary">
            <span>PERSONAJES DESCUBIERTOS</span>
            <strong>
              {withResult.length}
              <i> / {total}</i>
            </strong>
          </div>
        </div>
        {room.rounds.length > 0 && (
          <div className="winner-ribbon">
            <div className="winner-crown">
              <Crown size={18} />
            </div>
            <div>
              <span>MARCADOR FINAL · {room.rounds.length} RONDAS</span>
              <strong>
                {leaders.length > 1 ? '¡Empate de equipo!' : '¡' + leaders[0]?.name + ' se lleva la partida!'}
              </strong>
              <small>
                {leaders.map((m) => m.name).join(' · ')} · {topScore} puntos
              </small>
            </div>
          </div>
        )}
        <div className="results-grid">
          <section className="people-results">
            <div className="section-heading">
              <div>
                <div className="eyebrow">CADA QUIEN, A SU MANERA</div>
                <h2>El elenco del equipo.</h2>
              </div>
            </div>
            {withResult.length ? (
              withResult.map((m) => {
                const c = characterById(m.characterId, characters)!
                return (
                  <div className="result-person" key={m.id}>
                    <div className="result-avatar" style={{ '--character-color': c.color } as React.CSSProperties}>
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="result-person-info">
                      <strong>
                        {m.name}
                        {m.id === active?.memberId && <small> TÚ</small>}
                      </strong>
                      <span>{c.tagline}</span>
                      <p>{c.description}</p>
                    </div>
                    <span className="character-badge" style={{ '--character-color': c.color } as React.CSSProperties}>
                      {c.name}
                    </span>
                  </div>
                )
              })
            ) : (
              <Empty
                title="El elenco está por descubrirse"
                text="Cada persona puede responder el cuestionario desde su propio perfil en este dispositivo."
                action="Hacer mi cuestionario"
                go={() => nav('/test-personaje')}
              />
            )}
          </section>
          <aside className="distribution-panel">
            <div className="eyebrow">PANORAMA DEL EQUIPO</div>
            <h3>La mezcla perfecta.</h3>
            <p>Un buen equipo tiene muchas formas de ver las cosas.</p>
            {counts.length ? (
              counts.map(({ c, n }) => (
                <div className="distribution-row" key={c.id}>
                  <div>
                    <span className="dist-dot" style={{ background: c.color }} />
                    <strong>{c.name}</strong>
                    <small>
                      {n} {n === 1 ? 'persona' : 'personas'}
                    </small>
                  </div>
                  <div className="bar-track">
                    <i style={{ width: `${(n / max) * 100}%`, background: c.color }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="no-distribution">
                <Users size={22} />
                <span>Cuando respondan el cuestionario, aparecerá aquí la distribución de personajes.</span>
                <button className="button button-dark" onClick={() => nav('/test-personaje')}>
                  Empezar cuestionario <ArrowRight size={15} />
                </button>
              </div>
            )}
            <div className="distribution-foot">
              <Sparkles size={14} /> Ningún personaje define a una persona. ¡Es solo un juego!
            </div>
          </aside>
        </div>
        <div className="history-panel">
          <div className="history-panel-heading">
            <div>
              <div className="eyebrow">MEMORIAS DEL EQUIPO</div>
              <h2>Rondas para recordar.</h2>
            </div>
            <span>
              {room.rounds.length} {room.rounds.length === 1 ? 'RONDA' : 'RONDAS'}
            </span>
          </div>
          {room.rounds.length ? (
            room.rounds
              .slice()
              .reverse()
              .map((r, i) => (
                <div className="memory-row" key={`${r.createdAt}-${i}`}>
                  <span className="memory-index">{String(room.rounds.length - i).padStart(2, '0')}</span>
                  <div className="memory-phrase">{r.phrase}</div>
                  <div className="memory-answer">
                    <span>{room.members.find((m) => m.id === r.writer)?.name}: </span>
                    {r.original}
                    <br />
                    <span>{room.members.find((m) => m.id === r.guesser)?.name}: </span>
                    {r.prediction}
                  </div>
                  <div className="memory-score">
                    {r.similarity === 'exacta' ? 'Exacta' : r.similarity === 'aproximada' ? 'Muy cerca' : 'Distinta'}{' '}
                    <strong>{r.points} pts</strong>
                  </div>
                </div>
              ))
          ) : (
            <div className="empty-history">
              <Gamepad2 size={18} />
              Todavía no hay rondas guardadas. Una partida hará que este espacio cobre vida.
            </div>
          )}
        </div>
      </motion.section>
    </Page>
  )
}
function Empty({ title, text, action, go }: { title: string; text: string; action: string; go: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Users size={22} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button button-primary" onClick={go}>
        {action} <ArrowRight size={15} />
      </button>
    </div>
  )
}
function Games() {
  return <Dashboard />
}
export default function App() {
  const [, refresh] = useState(0)
  useEffect(() => {
    const onSync = () => refresh((x) => x + 1)
    window.addEventListener('duo:sync', onSync)
    const sync = () =>
      refreshActiveRoom()
        .then(() => window.dispatchEvent(new Event('duo:sync')))
        .catch(() => {})
    void sync()
    const timer = window.setInterval(sync, 3000)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('duo:sync', onSync)
    }
  }, [])
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sala" element={<RoomPage />} />
      <Route path="/juegos" element={<Games />} />
      <Route path="/coincidencias" element={<SharedActivity kind="common" />} />
      <Route path="/radar" element={<SharedActivity kind="radar" />} />
      <Route path="/jugar-frase" element={<SentenceGame />} />
      <Route path="/test-personaje" element={<Quiz />} />
      <Route path="/equipo" element={<TeamResults />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
