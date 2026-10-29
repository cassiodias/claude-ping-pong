import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Match, Player } from '../types'

const PANE = 'puppet-ping-pong'
const CLAY = '#D97757'
const PUPPET = [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  ']
const SIDE = PUPPET[1]!.length + 1
const GAME_OVER_MS = 8000
const STAND_IN = 'stand-in-'

const match = atom({ plugin: 'puppet-ping-pong', key: 'match' } as const, { players: [], isHostDone: true }, {
  shape: 'match-2',
})

let tick = 0
let timer: Timer | undefined

type Cell = { text: string; color?: string; dim?: boolean }

function player(id: string, label: string): Player {
  return { id, label, hits: 0, isDone: false }
}

function isLive(now: Match): boolean {
  return !now.isHostDone || now.players.some(one => !one.isDone)
}

// The ball's column and height (0 top, 2 paddle level) for the current tick.
function ball(width: number): { x: number; y: number } {
  const p = (tick * 2) % (2 * width)
  const x = p < width ? p : 2 * width - 1 - p
  const y = 2 - Math.round(2 * Math.sin((Math.PI * x) / Math.max(1, width - 1)))

  return { x, y }
}

function court(width: number, at: { x: number; y: number }, isRallying: boolean): string[] {
  const air = [0, 1, 2].map(row =>
    Array.from({ length: width }, (_, x) => (isRallying && row === at.y && x === at.x ? '●' : ' ')).join(''),
  )
  const net = Math.floor(width / 2)
  const table = Array.from({ length: width }, (_, x) => (x === net ? '╥' : '═')).join('')

  return [...air, table]
}

function puppetRow(seat: Player | undefined, row: number, side: 'left' | 'right'): Cell {
  const body = row === 0 ? ' '.repeat(PUPPET[0]!.length) : PUPPET[row - 1]!
  const paddle = row === 2 && seat && !seat.isDone ? '|' : ' '
  const text = side === 'left' ? body + paddle : paddle + body

  return { text, color: seat ? CLAY : undefined, dim: !seat || seat.isDone }
}

function scoreLabel(seat: Player | undefined): string {
  if (!seat) return 'waiting...'

  return `${seat.label} ${seat.hits}${seat.isDone ? ' ✓' : ''}`
}

// Steps the rally ten times a second; one clock however many matches start.
function startClock($: EngineInterface) {
  timer ??= $.clock.every(100, () => {
    tick++
    $.ui.invalidate('ui.render')
  })
}

function stopClock() {
  timer?.cancel()
  timer = undefined
}

// Opens a match: two stand-in puppets hold the table until subagents take their seats.
async function start($: EngineInterface, players: Player[], isHostDone: boolean) {
  await update($, match, () => ({ players, isHostDone }))
  void $.ui.open({ id: PANE, title: 'Ping pong' })
  startClock($)
}

async function hit($: EngineInterface, id: string) {
  await update($, match, m => ({
    ...m,
    players: m.players.map(one => (one.id === id && !one.isDone ? { ...one, hits: one.hits + 1 } : one)),
  }))
}

// Ends the match once the command's turn and every seated subagent are done.
async function settle($: EngineInterface, change: (m: Match) => Match) {
  const before = await read($, match)
  if (!isLive(before)) return

  const after = await update($, match, change)
  if (isLive(after)) return

  stopClock()
  $.ui.invalidate('ui.render')
  $.clock.after(GAME_OVER_MS, () => void $.ui.close({ id: PANE }))
}

export const register: Register = (on, options) => {
  const commands = new Set(
    String(options.commands ?? '')
      .split(/[\s,]+/)
      .map(name => name.replace(/^\//, ''))
      .filter(Boolean),
  )

  on('session.start', async ($, e, next) => {
    if (isLive(await read($, match))) startClock($)
    await $.command.register({
      name: 'ping-pong-demo',
      description: 'Play a 20 second demo match in the ping pong pane',
    })

    return next(e)
  })

  on('skill.prompt', async ($, e, next) => {
    if (commands.has(e.skill) && !isLive(await read($, match))) {
      await start($, [player(`${STAND_IN}1`, e.skill), player(`${STAND_IN}2`, 'claude')], false)
    }

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const { agentId } = started
    if (!agentId || !isLive(await read($, match))) return started

    const label = (e.description || e.subagentType).slice(0, 24)
    await update($, match, m => {
      const seat = m.players.findIndex(one => one.id.startsWith(STAND_IN))
      if (seat < 0) return m

      return { ...m, players: m.players.map((one, i) => (i === seat ? player(agentId, label) : one)) }
    })

    return started
  })

  on('tool.call', async ($, e, next) => {
    const now = await read($, match)
    if (isLive(now)) await hit($, e.agentId ?? `${STAND_IN}${(tick % 2) + 1}`)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const { agentId } = e
    await settle($, m =>
      agentId
        ? { ...m, players: m.players.map(one => (one.id === agentId ? { ...one, isDone: true } : one)) }
        : {
            isHostDone: true,
            players: m.players.map(one => (one.id.startsWith(STAND_IN) ? { ...one, isDone: true } : one)),
          },
    )

    return next(e)
  })

  on('command.run', { command: 'ping-pong-demo' }, async $ => {
    await start($, [player('demo-ping', 'ping'), player('demo-pong', 'pong')], true)
    const rally = $.clock.every(400, () => void hit($, Math.random() < 0.5 ? 'demo-ping' : 'demo-pong'))
    $.clock.after(12000, () => void settle($, m => ({ ...m, players: [m.players[0]!, { ...m.players[1]!, isDone: true }] })))
    $.clock.after(20000, () => {
      rally.cancel()
      void settle($, m => ({ ...m, players: m.players.map(one => ({ ...one, isDone: true })) }))
    })

    return { text: 'Demo match started in the ping pong pane.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const now = await read($, match)
    const [left, right] = now.players
    const isRallying = isLive(now)
    const width = Math.max(12, e.props.bodyColumns - 2 * SIDE - 1)
    const lines = court(width, ball(width), isRallying)
    const status = isRallying ? 'rally in progress' : now.players.length ? 'match over' : 'waiting for a match'

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text weight="bold">{scoreLabel(left)}</Text>
          <Text weight="bold">{scoreLabel(right)}</Text>
        </Box>
        {lines.map((middle, row) => {
          const l = puppetRow(left, row, 'left')
          const r = puppetRow(right, row, 'right')

          return (
            <Text wrap="truncate">
              <Text color={l.color} dimColor={l.dim}>{l.text}</Text>
              {middle}
              <Text color={r.color} dimColor={r.dim}>{r.text}</Text>
            </Text>
          )
        })}
        <Text dimColor>{status}</Text>
      </Box>
    )
  })
}
