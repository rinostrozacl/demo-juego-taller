import './style.css'
import { drawFrame, spawnSparks, stepSparks, type Spark } from './game/draw.ts'
import {
  commitScore,
  createRunner,
  layout,
  readBest,
  requestJump,
  startRun,
  tick,
} from './game/rules.ts'

function mustQuery<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`No se encontró ${selector}`)
  return element
}

function requiredContext(target: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = target.getContext('2d')
  if (!context) throw new Error('Canvas no disponible')
  return context
}

const canvas = mustQuery<HTMLCanvasElement>('#game')
const overlay = mustQuery<HTMLElement>('#overlay')
const message = mustQuery<HTMLElement>('#message')
const summary = mustQuery<HTMLElement>('#summary')
const playButton = mustQuery<HTMLButtonElement>('#play')
const status = mustQuery<HTMLElement>('#status')
const ctx = requiredContext(canvas)

const storage = openScoreStorage()
const state = createRunner({
  worldW: window.innerWidth,
  worldH: window.innerHeight,
  best: readBest(storage),
})
const sparks: Spark[] = []
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

let audio: AudioContext | undefined
let shake = 0
let flash = 0
let dust = 0
let bestAtStart = state.best
let last = performance.now()

function openScoreStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  try {
    const probe = 'demo-juego-taller:probe'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (key) => mem.get(key) ?? null,
      setItem: (key, value) => {
        mem.set(key, value)
      },
    }
  }
}

const camera = { scale: 1, x: 0, y: 0, viewW: 1, viewH: 1, dpr: 1 }

function resize(): void {
  const viewW = Math.max(1, window.innerWidth)
  const viewH = Math.max(1, window.innerHeight)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(viewW * dpr)
  canvas.height = Math.floor(viewH * dpr)
  const logicalW = viewW < 700 ? 480 : 960
  let logicalH = (viewH * logicalW) / viewW
  let scale = viewW / logicalW
  if (logicalH < 520) {
    logicalH = 520
    scale = Math.min(viewW / logicalW, viewH / logicalH)
  }
  camera.scale = scale
  camera.x = (viewW - logicalW * scale) / 2
  camera.y = (viewH - logicalH * scale) / 2
  camera.viewW = viewW
  camera.viewH = viewH
  camera.dpr = dpr
  layout(state, logicalW, logicalH)
}

function applyCamera(): void {
  ctx.setTransform(camera.dpr, 0, 0, camera.dpr, 0, 0)
  ctx.fillStyle = '#020617'
  ctx.fillRect(0, 0, camera.viewW, camera.viewH)
  ctx.setTransform(
    camera.dpr * camera.scale,
    0,
    0,
    camera.dpr * camera.scale,
    camera.dpr * camera.x,
    camera.dpr * camera.y,
  )
}

function unlockAudio(): void {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = undefined
  }
}

function tone(freq: number, duration: number, type: OscillatorType): void {
  if (!audio) return
  const osc = audio.createOscillator()
  const amp = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, audio.currentTime)
  amp.gain.setValueAtTime(0.045, audio.currentTime)
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration)
  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + duration)
}

function showReady(): void {
  overlay.hidden = false
  message.textContent = 'El robot corre solo. Salta los bugs y aguanta el ritmo.'
  summary.textContent = state.best > 0 ? `Récord ${state.best}` : 'Todavía no hay récord en este navegador.'
  playButton.textContent = 'Jugar'
  status.textContent = 'Listo para jugar'
}

function showEnd(): void {
  const stored = commitScore(storage, state.score)
  state.best = stored
  const record = state.score > bestAtStart && state.score > 0
  overlay.hidden = false
  message.textContent = record
    ? 'Nuevo récord. Los bugs no pudieron contigo.'
    : 'Un bug te alcanzó. ¿Otra carrera?'
  summary.textContent = `Puntos ${state.score} · Récord ${state.best}`
  playButton.textContent = 'Reintentar'
  status.textContent = record
    ? `Nuevo récord. ${state.score} puntos.`
    : `Fin de la partida. ${state.score} puntos. Récord ${state.best}.`
  shake = reduceMotion.matches ? 0 : 14
  flash = 0.4
  tone(110, 0.28, 'sawtooth')
  if (!reduceMotion.matches) {
    spawnSparks(sparks, state.playerX + state.playerW / 2, state.y + state.playerH / 2, '#fb7185', 22)
  }
}

function isRunning(): boolean {
  return state.phase === 'running'
}

function act(): void {
  unlockAudio()
  if (state.phase === 'running') {
    requestJump(state)
    return
  }
  bestAtStart = state.best
  startRun(state)
  sparks.length = 0
  shake = 0
  flash = 0
  overlay.hidden = true
  playButton.blur()
  status.textContent = 'En juego'
}

function onKey(event: KeyboardEvent): void {
  if (event.repeat) return
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault()
    act()
  } else if (event.code === 'KeyR' && state.phase === 'over') {
    event.preventDefault()
    act()
  }
}

function onPointer(event: PointerEvent): void {
  const target = event.target
  if (target instanceof Element && target.closest('button')) return
  event.preventDefault()
  act()
}

function frame(now: number): void {
  const dt = Math.min(0.033, (now - last) / 1000)
  last = now
  if (isRunning()) {
    tick(state, dt, Math.random)
    if (state.jumped) {
      tone(540, 0.07, 'square')
      if (!reduceMotion.matches) {
        spawnSparks(sparks, state.playerX + 8, state.groundY, '#22d3ee', 8)
      }
    }
    if (!reduceMotion.matches && state.grounded) {
      dust += dt
      if (dust > 0.08) {
        dust = 0
        spawnSparks(sparks, state.playerX + 4, state.groundY - 1, '#67e8f9', 1)
      }
    }
    if (state.phase === 'over') showEnd()
  }
  stepSparks(sparks, dt)
  shake = Math.max(0, shake - dt * 28)
  flash = Math.max(0, flash - dt * 1.1)
  applyCamera()
  drawFrame(ctx, state, { sparks, shake, flash, reduceMotion: reduceMotion.matches }, now)
  canvas.dataset.score = String(state.score)
  canvas.dataset.best = String(state.best)
  canvas.dataset.phase = state.phase
  canvas.dataset.y = String(Math.round(state.y))
  requestAnimationFrame(frame)
}

window.addEventListener('keydown', onKey)
window.addEventListener('pointerdown', onPointer, { passive: false })
window.addEventListener('resize', resize)
window.visualViewport?.addEventListener('resize', resize)
playButton.addEventListener('click', () => {
  act()
})
resize()
showReady()
requestAnimationFrame(frame)
