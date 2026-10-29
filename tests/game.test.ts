import { expect, test } from 'claude-code/testing'

import { finish, finishHost, isLive, openMatch, score, seat } from '../hooks/game'

test('subagents replace the stand-ins and the match lives until the last one is done', async () => {
  let m = seat(seat(openMatch('review'), 'a1', 'contract'), 'a2', 'break')
  m = seat(m, 'a3', 'late')
  expect(m.players.map(one => one.label)).toEqual(['contract', 'break'])

  m = score(score(m, 'a2'), 'a3')
  expect(m.players.map(one => one.hits)).toEqual([0, 1])

  m = finish(finishHost(m), 'a1')
  expect(isLive(m)).toBe(true)
  expect(isLive(finish(m, 'a2'))).toBe(false)
})

test('a command that starts no subagents ends with its turn', async () => {
  const m = score(openMatch('review'), 'stand-in-1')
  expect(m.players[0]?.hits).toBe(1)
  expect(isLive(finishHost(m))).toBe(false)
})
