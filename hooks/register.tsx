import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Display, Match } from '../types'
import { PingPong } from './components'
import { demoMatch, finish, finishAll, finishHost, isLive, NO_MATCH, openMatch, score, seat } from './game'

const PANE = 'puppet-ping-pong'
const GAME_OVER_MS = 8000
const PANE_COLUMNS = 50

const match = atom({ plugin: 'puppet-ping-pong', key: 'match' } as const, NO_MATCH, { shape: 'match-3' })

let tick = 0
let timer: Timer | undefined
let demo: Timer[] = []

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

// A pane match opens a narrow dock; a band match draws above the prompt and needs no opening.
async function start($: EngineInterface, opened: Match) {
  await update($, match, () => opened)
  if (opened.display === 'pane') void $.ui.open({ id: PANE, title: 'Ping pong', columns: PANE_COLUMNS })
  else void $.ui.close({ id: PANE })
  startClock($)
}

function clear($: EngineInterface, display: Display) {
  if (display === 'pane') return void $.ui.close({ id: PANE })

  void update($, match, () => NO_MATCH)
}

// Applies a move to a live match; the move that ends it stops the rally and closes the pane later.
async function play($: EngineInterface, move: (m: Match) => Match) {
  if (!isLive(await read($, match))) return

  const after = await update($, match, move)
  if (isLive(after)) return

  stopClock()
  $.ui.invalidate('ui.render')
  $.clock.after(GAME_OVER_MS, () => clear($, after.display))
}

export const register: Register = (on, options) => {
  const commands = new Set(
    String(options.commands ?? '')
      .split(/[\s,]+/)
      .map(name => name.replace(/^\//, ''))
      .filter(Boolean),
  )
  const display: Display = options.display === 'band' ? 'band' : 'pane'

  on('session.start', async ($, e, next) => {
    if (isLive(await read($, match))) startClock($)
    await $.command.register({
      name: 'ping-pong-demo',
      description: 'Play a 20 second demo match; add pane or band to try one display',
    })

    return next(e)
  })

  on('skill.prompt', async ($, e, next) => {
    if (commands.has(e.skill) && !isLive(await read($, match))) await start($, openMatch(e.skill, display))

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

  on('command.run', { command: 'ping-pong-demo' }, async ($, e) => {
    const shown: Display = /band/i.test(e.args) ? 'band' : /pane/i.test(e.args) ? 'pane' : display
    // A new demo cancels the last one's timers so they cannot end this match early.
    demo.forEach(one => one.cancel())
    await start($, demoMatch(shown))
    const rally = $.clock.every(400, () => void play($, m => score(m, Math.random() < 0.5 ? 'demo-ping' : 'demo-pong')))
    demo = [
      rally,
      $.clock.after(12000, () => void play($, m => finish(m, 'demo-pong'))),
      $.clock.after(20000, () => {
        rally.cancel()
        void play($, finishAll)
      }),
    ]

    return { text: `Demo match started in the ping pong ${shown}.` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => (
    <PingPong ui={$.ui.resolve(e)} match={await read($, match)} columns={e.props.bodyColumns} tick={tick} />
  ))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, match)
    if (now.display !== 'band' || now.players.length === 0 || e.props.hasSurvey) return next(e)

    return <PingPong ui={$.ui.resolve(e)} match={now} columns={e.props.bodyColumns} tick={tick} />
  })
}
