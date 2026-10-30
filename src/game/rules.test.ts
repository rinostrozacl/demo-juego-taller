import { describe, expect, it } from 'vitest'
import {
  JUMP_VELOCITY,
  MAX_SPEED,
  START_SPEED,
  STORAGE_KEY,
  accelerate,
  commitScore,
  createRunner,
  hitsAny,
  jumpHeight,
  makeBug,
  readBest,
  rectsOverlap,
  requestJump,
  scoreFromDistance,
  spawnGap,
  startRun,
  tick,
} from './rules.ts'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

function runner(best = 0) {
  return createRunner({ worldW: 900, worldH: 600, best })
}

describe('colisión', () => {
  it('detecta solape y ignora el contacto exacto de bordes', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 0, w: 10, h: 10 })).toBe(true)
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false)
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 10, w: 10, h: 10 })).toBe(false)
  })

  it('termina la partida si un bug alcanza al robot en el suelo', () => {
    const state = runner(100)
    startRun(state)
    state.obstacles = [makeBug(state.playerX, 0)]
    state.spawnCursor = 99_999
    tick(state, 1 / 60, () => 0)
    expect(state.phase).toBe('over')
    expect(state.best).toBe(100)
    const frozen = state.score
    tick(state, 1 / 60, () => 0)
    expect(state.score).toBe(frozen)
  })

  it('no choca si el robot ya está por encima del bug', () => {
    const state = runner()
    startRun(state)
    const bug = makeBug(state.playerX, 0)
    state.y = state.groundY - state.playerH - 160
    expect(
      hitsAny(
        { x: state.playerX, y: state.y, w: state.playerW, h: state.playerH },
        [bug],
        state.groundY,
      ),
    ).toBe(false)
  })

  it('salta un glitch alto y sobrevive', () => {
    const state = runner()
    startRun(state)
    const bug = makeBug(state.playerX + 130, 0.4)
    expect(bug.kind).toBe('glitch')
    expect(bug.h).toBeLessThan(jumpHeight() - 8)
    state.obstacles = [bug]
    state.spawnCursor = 99_999
    requestJump(state)
    for (let frame = 0; frame < 80 && state.phase === 'running'; frame += 1) {
      tick(state, 1 / 60, () => 0)
    }
    expect(state.phase).toBe('running')
  })

  it('pierde si no salta el bug que tiene delante', () => {
    const state = runner()
    startRun(state)
    state.obstacles = [makeBug(state.playerX + 80, 0)]
    state.spawnCursor = 99_999
    for (let frame = 0; frame < 60 && state.phase === 'running'; frame += 1) {
      tick(state, 1 / 60, () => 0)
    }
    expect(state.phase).toBe('over')
  })
})

describe('salto', () => {
  it('ignora el salto fuera de la carrera', () => {
    const state = runner()
    requestJump(state)
    expect(state.jumpBuffer).toBe(0)
    expect(state.phase).toBe('ready')
  })

  it('permite coyote time justo después de dejar el suelo', () => {
    const state = runner()
    startRun(state)
    state.grounded = false
    state.coyote = 0.08
    state.y = state.groundY - state.playerH - 30
    requestJump(state)
    tick(state, 1 / 60, () => 0)
    expect(state.jumped).toBe(true)
    expect(state.vy).toBeLessThan(0)
    expect(state.vy).toBeGreaterThan(JUMP_VELOCITY - 1)
  })

  it('no salta en el aire cuando el coyote ya expiró', () => {
    const state = runner()
    startRun(state)
    state.grounded = false
    state.coyote = 0
    state.vy = 0
    state.y = state.groundY - state.playerH - 80
    requestJump(state)
    tick(state, 1 / 60, () => 0)
    expect(state.jumped).toBe(false)
    expect(state.grounded).toBe(false)
  })

  it('guarda el salto si se pulsa un instante antes de aterrizar', () => {
    const state = runner()
    startRun(state)
    state.grounded = false
    state.coyote = 0
    state.vy = 400
    state.y = state.groundY - state.playerH - 5
    requestJump(state)
    tick(state, 1 / 60, () => 0)
    expect(state.jumped).toBe(true)
  })
})

describe('puntuación y récord', () => {
  it('sube con la distancia y acelera hasta un tope', () => {
    const state = runner()
    startRun(state)
    state.spawnCursor = 99_999
    const initial = state.speed
    for (let frame = 0; frame < 180; frame += 1) tick(state, 1 / 60, () => 0)
    expect(state.speed).toBeGreaterThan(initial)
    expect(state.speed).toBeLessThanOrEqual(MAX_SPEED)
    expect(state.score).toBe(scoreFromDistance(state.distance))
    expect(state.score).toBeGreaterThan(0)
  })

  it('no pasa de la velocidad máxima', () => {
    expect(accelerate(MAX_SPEED, 2)).toBe(MAX_SPEED)
    expect(accelerate(START_SPEED, 0.5)).toBeGreaterThan(START_SPEED)
  })

  it('guarda el récord solo cuando la puntuación lo supera', () => {
    const storage = memory()
    expect(readBest(storage)).toBe(0)
    expect(commitScore(storage, 40)).toBe(40)
    expect(storage.getItem(STORAGE_KEY)).toBe('40')
    expect(commitScore(storage, 12)).toBe(40)
    expect(commitScore(storage, 41.8)).toBe(41)
    expect(readBest({ getItem: () => 'no-es-numero' })).toBe(0)
    expect(readBest({ getItem: () => '-8' })).toBe(0)
  })

  it('conserva el récord si localStorage rechaza la escritura', () => {
    const storage = {
      getItem: () => '15',
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(commitScore(storage, 3)).toBe(15)
  })
})

describe('aparicion de bugs', () => {
  it('elige tipo segun la tirada y deja un hueco jugable', () => {
    expect(makeBug(10, 0).kind).toBe('beetle')
    expect(makeBug(10, 0.4).kind).toBe('glitch')
    expect(makeBug(10, 0.8).kind).toBe('worm')
    expect(spawnGap(0)).toBeGreaterThanOrEqual(240)
    expect(spawnGap(10_000)).toBe(520)
  })

  it('crea un bug cuando se agota el cursor de aparición', () => {
    const state = runner()
    startRun(state)
    state.spawnCursor = 0
    tick(state, 1 / 60, () => 0)
    expect(state.obstacles).toHaveLength(1)
    expect(state.obstacles[0]?.kind).toBe('beetle')
    expect(state.spawnCursor).toBeGreaterThan(240)
  })
})
