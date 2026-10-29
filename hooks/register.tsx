import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Match } from '../types'
import { PingPong } from './components'
import { demoMatch, finish, finishAll, finishHost, isLive, NO_MATCH, openMatch, score, seat } from './game'

const PANE = 'puppet-ping-pong'
const GAME_OVER_MS = 8000

const match = atom({ plugin: 'puppet-ping-pong', key: 'match' } as const, NO_MATCH, { shape: 'match-2' })

let tick = 0
let timer: Timer | undefined

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

async function start($: EngineInterface, opened: Match) {
  await update($, match, () => opened)
  void $.ui.open({ id: PANE, title: 'Ping pong' })
  startClock($)
}

// Applies a move to a live match; the move that ends it stops the rally and closes the pane later.
async function play($: EngineInterface, move: (m: Match) => Match) {
  if (!isLive(await read($, match))) return

  const after = await update($, match, move)
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
    await $.command.register({ name: 'ping-pong-demo', description: 'Play a 20 second demo match in the ping pong pane' })

    return next(e)
  })

  on('skill.prompt', async ($, e, next) => {
    if (commands.has(e.skill) && !isLive(await read($, match))) await start($, openMatch(e.skill))

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const { agentId } = started
    if (agentId) await play($, m => seat(m, agentId, (e.description || e.subagentType).slice(0, 24)))

    return started
  })

  on('tool.call', async ($, e, next) => {
    await play($, m => score(m, e.agentId ?? m.players[tick % 2]?.id ?? ''))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const { agentId } = e
    await play($, m => (agentId ? finish(m, agentId) : finishHost(m)))

    return next(e)
  })

  on('command.run', { command: 'ping-pong-demo' }, async $ => {
    await start($, demoMatch())
    const rally = $.clock.every(400, () => void play($, m => score(m, Math.random() < 0.5 ? 'demo-ping' : 'demo-pong')))
    $.clock.after(12000, () => void play($, m => finish(m, 'demo-pong')))
    $.clock.after(20000, () => {
      rally.cancel()
      void play($, finishAll)
    })

    return { text: 'Demo match started in the ping pong pane.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => (
    <PingPong ui={$.ui.resolve(e)} match={await read($, match)} columns={e.props.bodyColumns} tick={tick} />
  ))
}
