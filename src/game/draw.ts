import type { Bug, RunnerState } from './rules.ts'
import { MAX_SPEED } from './rules.ts'

export interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  ttl: number
  color: string
  r: number
}

export interface FrameFx {
  sparks: Spark[]
  shake: number
  flash: number
  reduceMotion: boolean
}

export function spawnSparks(
  sparks: Spark[],
  x: number,
  y: number,
  color: string,
  count: number,
): void {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = 40 + Math.random() * 180
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.35 + Math.random() * 0.35,
      ttl: 0.7,
      color,
      r: 1.5 + Math.random() * 2,
    })
  }
  if (sparks.length > 80) sparks.splice(0, sparks.length - 80)
}

export function stepSparks(sparks: Spark[], dt: number): void {
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const spark = sparks[i]
    if (!spark) continue
    spark.life -= dt
    if (spark.life <= 0) {
      sparks.splice(i, 1)
      continue
    }
    spark.x += spark.vx * dt
    spark.y += spark.vy * dt
    spark.vy += 520 * dt
  }
}

function mod(value: number, size: number): number {
  if (size <= 0) return 0
  return ((value % size) + size) % size
}

function traceRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  state: RunnerState,
  time: number,
): void {
  const { worldW: w, worldH: h } = state
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#020617')
  sky.addColorStop(0.55, '#0f172a')
  sky.addColorStop(1, '#111827')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  const drift = state.phase === 'running' ? state.speed : 36
  ctx.fillStyle = '#e0f2fe'
  for (let i = 0; i < 42; i += 1) {
    const depth = 10 + (i % 5) * 8
    const x = mod(i * 137 - time * depth * (drift / 280), w)
    const y = (i * 53) % Math.max(1, h * 0.62)
    ctx.globalAlpha = 0.22 + (i % 4) * 0.12
    const size = i % 3 === 0 ? 2 : 1.4
    ctx.fillRect(x, y, size, size)
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = 'rgba(251, 113, 133, 0.8)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(w * 0.82, Math.min(150, h * 0.22), 26, 0, Math.PI * 2)
  ctx.stroke()

  const skyline = mod(time * drift * 0.12, 140)
  for (let i = 0; i < 14; i += 1) {
    const bw = 46 + (i % 4) * 16
    const bh = 36 + (i % 6) * 22
    const x = mod(i * 110 - skyline, w + bw) - bw
    ctx.fillStyle = i % 2 === 0 ? '#111827' : '#172033'
    ctx.fillRect(x, state.groundY - bh, bw, bh)
    ctx.fillStyle = 'rgba(34, 211, 238, 0.28)'
    for (let row = 8; row < bh - 8; row += 12) {
      for (let col = 6; col < bw - 6; col += 12) {
        if ((row + col + i) % 24 !== 0) ctx.fillRect(x + col, state.groundY - bh + row, 4, 4)
      }
    }
  }

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.16)'
  ctx.lineWidth = 1
  const scroll = mod(time * drift * 0.35, 48)
  for (let x = -scroll; x < w + 48; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x, state.groundY)
    ctx.lineTo(x - 90, h)
    ctx.stroke()
  }

  ctx.fillStyle = '#020617'
  ctx.fillRect(0, state.groundY, w, h - state.groundY)
  ctx.strokeStyle = '#22d3ee'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, state.groundY)
  ctx.lineTo(w, state.groundY)
  ctx.stroke()

  ctx.fillStyle = 'rgba(34, 211, 238, 0.45)'
  const dots = mod(time * drift * 0.45, 22)
  for (let x = -dots; x < w; x += 22) ctx.fillRect(x, state.groundY + 14, 3, 3)
}

function drawBeetle(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const leg = Math.sin(time * 14) * 3
  ctx.strokeStyle = '#86efac'
  ctx.lineWidth = 2
  for (let i = 0; i < 3; i += 1) {
    const y = h * (0.4 + i * 0.16)
    ctx.beginPath()
    ctx.moveTo(w * 0.2, y)
    ctx.lineTo(-4, y + 8 + leg)
    ctx.moveTo(w * 0.8, y)
    ctx.lineTo(w + 4, y + 8 - leg)
    ctx.stroke()
  }
  ctx.fillStyle = '#052e16'
  ctx.strokeStyle = '#22c55e'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(w / 2, h * 0.58, w * 0.42, h * 0.36, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(w / 2, h * 0.28, w * 0.24, h * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.arc(w * 0.4, h * 0.26, 2.2, 0, Math.PI * 2)
  ctx.arc(w * 0.6, h * 0.26, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#bbf7d0'
  ctx.beginPath()
  ctx.moveTo(w * 0.38, h * 0.12)
  ctx.lineTo(w * 0.22, -4 + Math.sin(time * 6) * 2)
  ctx.moveTo(w * 0.62, h * 0.12)
  ctx.lineTo(w * 0.78, -4 + Math.cos(time * 6) * 2)
  ctx.stroke()
}

function drawGlitch(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const slices = 5
  for (let i = 0; i < slices; i += 1) {
    const slice = h / slices
    const shift = Math.sin(time * 9 + i) * 3
    ctx.fillStyle = i % 2 === 0 ? '#4c0519' : '#881337'
    ctx.fillRect(shift, i * slice, w, slice - 1)
  }
  ctx.strokeStyle = '#fb7185'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, w - 2, h - 2)
  ctx.fillStyle = '#ffe4e6'
  ctx.font = `700 ${Math.max(13, Math.floor(w * 0.32))}px ui-monospace, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('NULL', w / 2, h / 2)
}

function drawWorm(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const bob = Math.sin(time * 10) * 2
  ctx.fillStyle = '#082f49'
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i += 1) {
    const cx = w * (0.16 + i * 0.22)
    const cy = h * 0.55 + (i % 2 === 0 ? bob : -bob)
    ctx.beginPath()
    ctx.ellipse(cx, cy, w * 0.14, h * 0.38, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.fillStyle = '#e0f2fe'
  ctx.beginPath()
  ctx.arc(w * 0.78, h * 0.42, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawBug(ctx: CanvasRenderingContext2D, bug: Bug, groundY: number, time: number): void {
  ctx.save()
  ctx.translate(bug.x, groundY - bug.h)
  if (bug.kind === 'glitch') drawGlitch(ctx, bug.w, bug.h, time)
  else if (bug.kind === 'worm') drawWorm(ctx, bug.w, bug.h, time)
  else drawBeetle(ctx, bug.w, bug.h, time)
  ctx.restore()
}

function drawRobot(ctx: CanvasRenderingContext2D, state: RunnerState, time: number, reduceMotion: boolean): void {
  const { playerX: x, y, playerW: w, playerH: h, phase, grounded, groundY } = state
  ctx.save()
  ctx.fillStyle = 'rgba(34, 211, 238, 0.16)'
  ctx.beginPath()
  ctx.ellipse(x + w / 2, groundY, w * 0.42, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const running = phase === 'running'
  const bob = reduceMotion ? 0 : running && grounded ? Math.sin(time * 12) * 2 : Math.sin(time * 2) * 2
  const stride = running && !reduceMotion ? Math.sin(time * 12) : 0

  ctx.save()
  ctx.translate(x + w / 2, y + h + bob)
  if (phase === 'over') ctx.rotate(-0.55)
  ctx.translate(-w / 2, -h)

  const leg = stride * w * 0.16
  ctx.fillStyle = '#67e8f9'
  ctx.fillRect(w * 0.18 + leg, h * 0.64, w * 0.2, h * 0.36)
  ctx.fillRect(w * 0.62 - leg, h * 0.64, w * 0.2, h * 0.36)

  ctx.fillStyle = '#0f172a'
  ctx.strokeStyle = '#22d3ee'
  ctx.lineWidth = 2
  traceRoundRect(ctx, w * 0.1, h * 0.36, w * 0.8, h * 0.34, 6)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.arc(w * 0.5, h * 0.52, 3, 0, Math.PI * 2)
  ctx.fill()

  traceRoundRect(ctx, w * 0.14, h * 0.04, w * 0.72, h * 0.32, 8)
  ctx.fillStyle = '#0f172a'
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fb7185'
  ctx.fillRect(w * 0.26, h * 0.15, w * 0.48, h * 0.1)

  ctx.strokeStyle = '#22c55e'
  ctx.beginPath()
  ctx.moveTo(w * 0.5, h * 0.04)
  ctx.lineTo(w * 0.5 + Math.sin(time * 4) * 2, -h * 0.08)
  ctx.stroke()
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.arc(w * 0.5 + Math.sin(time * 4) * 2, -h * 0.1, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawHud(ctx: CanvasRenderingContext2D, state: RunnerState): void {
  const scrim = ctx.createLinearGradient(0, 0, 0, 104)
  scrim.addColorStop(0, 'rgba(2, 6, 23, 0.72)')
  scrim.addColorStop(1, 'rgba(2, 6, 23, 0)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, 0, state.worldW, 104)

  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 22px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillStyle = '#f8fafc'
  ctx.textAlign = 'left'
  ctx.fillText(`PUNTOS ${state.score}`, 20, 34)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#22c55e'
  ctx.fillText(`RÉCORD ${state.best}`, state.worldW - 20, 34)

  const ratio = state.speed / MAX_SPEED
  const width = Math.max(0, Math.min(1, ratio)) * 128
  ctx.textAlign = 'left'
  ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText('RITMO', 20, 58)
  ctx.fillStyle = 'rgba(148, 163, 184, 0.35)'
  ctx.fillRect(20, 66, 128, 7)
  ctx.fillStyle = '#22c55e'
  ctx.fillRect(20, 66, width, 7)
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: RunnerState,
  fx: FrameFx,
  nowMs: number,
): void {
  const time = nowMs / 1000
  ctx.save()
  if (fx.shake > 0) {
    ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake)
  }
  drawBackground(ctx, state, time)
  for (const bug of state.obstacles) drawBug(ctx, bug, state.groundY, time)
  for (const spark of fx.sparks) {
    ctx.globalAlpha = Math.max(0, spark.life / spark.ttl)
    ctx.fillStyle = spark.color
    ctx.beginPath()
    ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  drawRobot(ctx, state, time, fx.reduceMotion)
  drawHud(ctx, state)
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(220, 38, 38, ${Math.min(0.45, fx.flash)})`
    ctx.fillRect(0, 0, state.worldW, state.worldH)
  }
  ctx.restore()
}
