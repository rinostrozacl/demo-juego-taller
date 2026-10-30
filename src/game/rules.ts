/** Reglas puras del endless runner. Sin DOM ni Canvas, para poder probarlas. */

export const STORAGE_KEY = 'demo-juego-taller:best'
export const GRAVITY = 3400
export const JUMP_VELOCITY = -1160
export const START_SPEED = 340
export const MAX_SPEED = 860
export const SPEED_ACCEL = 16
export const PLAYER_W = 72
export const PLAYER_H = 96
export const GROUND_RATIO = 0.78
export const COYOTE_TIME = 0.12
export const JUMP_BUFFER = 0.14

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type BugKind = 'beetle' | 'glitch' | 'worm'

export interface Bug {
  x: number
  w: number
  h: number
  kind: BugKind
}

export type Phase = 'ready' | 'running' | 'over'

export interface RunnerState {
  phase: Phase
  y: number
  vy: number
  grounded: boolean
  coyote: number
  jumpBuffer: number
  speed: number
  distance: number
  score: number
  best: number
  spawnCursor: number
  obstacles: Bug[]
  worldW: number
  worldH: number
  groundY: number
  playerX: number
  playerW: number
  playerH: number
  jumped: boolean
}

export interface RunnerConfig {
  worldW: number
  worldH: number
  best: number
}

type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function normalizeScore(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0
  return Math.floor(score)
}

export function readBest(storage: Pick<Storage, 'getItem'>): number {
  try {
    return normalizeScore(Number(storage.getItem(STORAGE_KEY)))
  } catch {
    return 0
  }
}

export function commitScore(storage: ScoreStorage, score: number): number {
  const best = Math.max(readBest(storage), normalizeScore(score))
  try {
    storage.setItem(STORAGE_KEY, String(best))
  } catch {
    // La partida conserva el récord aunque el navegador rechace localStorage.
  }
  return best
}

export function scoreFromDistance(distance: number): number {
  if (!Number.isFinite(distance) || distance <= 0) return 0
  return Math.floor(distance / 10)
}

export function accelerate(speed: number, dt: number): number {
  const base = Number.isFinite(speed) ? speed : START_SPEED
  const delta = Number.isFinite(dt) && dt > 0 ? dt : 0
  return Math.min(MAX_SPEED, base + SPEED_ACCEL * delta)
}

export function spawnGap(speed: number): number {
  const safe = Number.isFinite(speed) ? speed : START_SPEED
  return Math.min(520, Math.max(240, 320 + safe * 0.22))
}

export function jumpHeight(): number {
  return (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY)
}

export function makeBug(x: number, roll: number): Bug {
  const safe = Number.isFinite(roll) ? Math.min(0.999999, Math.max(0, roll)) : 0
  const bucket = Math.floor(safe * 3)
  if (bucket === 1) return { x, w: 58, h: 108, kind: 'glitch' }
  if (bucket === 2) return { x, w: 124, h: 52, kind: 'worm' }
  return { x, w: 70, h: 76, kind: 'beetle' }
}

export function playerHitbox(body: Rect): Rect {
  return {
    x: body.x + 8,
    y: body.y + 6,
    w: Math.max(8, body.w - 16),
    h: Math.max(8, body.h - 10),
  }
}

export function obstacleHitbox(bug: Pick<Bug, 'x' | 'w' | 'h'>, groundY: number): Rect {
  return {
    x: bug.x + 5,
    y: groundY - bug.h + 6,
    w: Math.max(8, bug.w - 10),
    h: Math.max(8, bug.h - 8),
  }
}

export function hitsAny(player: Rect, bugs: Pick<Bug, 'x' | 'w' | 'h'>[], groundY: number): boolean {
  const body = playerHitbox(player)
  return bugs.some((bug) => rectsOverlap(body, obstacleHitbox(bug, groundY)))
}

export function layout(state: RunnerState, worldW: number, worldH: number): void {
  state.worldW = Math.max(1, worldW)
  state.worldH = Math.max(1, worldH)
  state.groundY = Math.round(state.worldH * GROUND_RATIO)
  const maxX = Math.max(24, state.worldW - state.playerW - 24)
  state.playerX = Math.round(Math.min(Math.max(24, state.worldW * 0.16), maxX))
  const floorY = state.groundY - state.playerH
  if (state.grounded || state.y > floorY) {
    state.y = floorY
    state.vy = 0
    state.grounded = true
  }
}

export function createRunner(config: RunnerConfig): RunnerState {
  const state: RunnerState = {
    phase: 'ready',
    y: 0,
    vy: 0,
    grounded: true,
    coyote: COYOTE_TIME,
    jumpBuffer: 0,
    speed: START_SPEED,
    distance: 0,
    score: 0,
    best: normalizeScore(config.best),
    spawnCursor: 640,
    obstacles: [],
    worldW: 1,
    worldH: 1,
    groundY: 1,
    playerX: 24,
    playerW: PLAYER_W,
    playerH: PLAYER_H,
    jumped: false,
  }
  layout(state, config.worldW, config.worldH)
  return state
}

export function startRun(state: RunnerState): void {
  const best = state.best
  const worldW = state.worldW
  const worldH = state.worldH
  const fresh = createRunner({ worldW, worldH, best })
  state.phase = 'running'
  state.y = fresh.y
  state.vy = 0
  state.grounded = true
  state.coyote = COYOTE_TIME
  state.jumpBuffer = 0
  state.speed = START_SPEED
  state.distance = 0
  state.score = 0
  state.best = best
  state.spawnCursor = fresh.spawnCursor
  state.obstacles = []
  state.jumped = false
  layout(state, worldW, worldH)
}

export function requestJump(state: RunnerState): void {
  if (state.phase !== 'running') return
  state.jumpBuffer = JUMP_BUFFER
}

function collides(state: RunnerState): boolean {
  return hitsAny(
    { x: state.playerX, y: state.y, w: state.playerW, h: state.playerH },
    state.obstacles,
    state.groundY,
  )
}

function stepOnce(state: RunnerState, dt: number, rng: () => number): void {
  state.speed = accelerate(state.speed, dt)
  state.distance += state.speed * dt
  state.score = scoreFromDistance(state.distance)

  state.vy += GRAVITY * dt
  state.y += state.vy * dt
  const floorY = state.groundY - state.playerH
  if (state.y >= floorY) {
    state.y = floorY
    state.vy = 0
    state.grounded = true
    state.coyote = COYOTE_TIME
  } else {
    state.grounded = false
    state.coyote = Math.max(0, state.coyote - dt)
  }

  if (state.jumpBuffer > 0 && (state.grounded || state.coyote > 0)) {
    state.vy = JUMP_VELOCITY
    state.grounded = false
    state.coyote = 0
    state.jumpBuffer = 0
    state.jumped = true
    state.y += state.vy * dt
  } else {
    state.jumpBuffer = Math.max(0, state.jumpBuffer - dt)
  }

  for (const bug of state.obstacles) bug.x -= state.speed * dt
  state.obstacles = state.obstacles.filter((bug) => bug.x + bug.w > -48)

  state.spawnCursor -= state.speed * dt
  if (state.spawnCursor <= 0) {
    state.obstacles.push(makeBug(state.worldW + 36, rng()))
    state.spawnCursor = spawnGap(state.speed)
  }

  if (collides(state)) {
    state.phase = 'over'
    state.best = Math.max(state.best, state.score)
    state.vy = 0
  }
}

export function tick(state: RunnerState, dt: number, rng: () => number): void {
  if (state.phase !== 'running') return
  if (!Number.isFinite(dt) || dt <= 0) return
  state.jumped = false
  let left = Math.min(dt, 0.05)
  while (left > 0 && state.phase === 'running') {
    const step = Math.min(left, 1 / 60)
    stepOnce(state, step, rng)
    left -= step
  }
}
