import type { Match, Player } from '../types'

// The rules of a match as plain functions over its data: who sits, who scores, when it ends.

export const STAND_IN = 'stand-in-'
export const NO_MATCH: Match = { players: [], isHostDone: true }

export function player(id: string, label: string): Player {
  return { id, label, hits: 0, isDone: false }
}

// Two stand-ins hold the table until the command's subagents take their seats.
export function openMatch(command: string): Match {
  return { players: [player(`${STAND_IN}1`, command), player(`${STAND_IN}2`, 'claude')], isHostDone: false }
}

export function demoMatch(): Match {
  return { players: [player('demo-ping', 'ping'), player('demo-pong', 'pong')], isHostDone: true }
}

export function isLive(m: Match): boolean {
  return !m.isHostDone || m.players.some(one => !one.isDone)
}

export function isStandIn(seat: Player): boolean {
  return seat.id.startsWith(STAND_IN)
}

export function seat(m: Match, id: string, label: string): Match {
  const free = m.players.findIndex(isStandIn)
  if (free < 0) return m

  return { ...m, players: m.players.map((one, i) => (i === free ? player(id, label) : one)) }
}

export function score(m: Match, id: string): Match {
  return { ...m, players: m.players.map(one => (one.id === id && !one.isDone ? { ...one, hits: one.hits + 1 } : one)) }
}

export function finish(m: Match, id: string): Match {
  return { ...m, players: m.players.map(one => (one.id === id ? { ...one, isDone: true } : one)) }
}

// The command's own turn ended: the stand-ins leave, seated subagents play on.
export function finishHost(m: Match): Match {
  return { isHostDone: true, players: m.players.map(one => (isStandIn(one) ? { ...one, isDone: true } : one)) }
}

export function finishAll(m: Match): Match {
  return { isHostDone: true, players: m.players.map(one => ({ ...one, isDone: true })) }
}
