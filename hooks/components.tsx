import type { Elements } from 'claude-code'

import type { Match, Player } from '../types'
import { isLive } from './game'

// The pane as components; each takes the surface's element table as `ui`.

type Ui = Elements['terminal' | 'desktop' | 'vscode' | 'mobile']
type Side = 'left' | 'right'

const CLAY = '#D97757'
const BODY = [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  ']
const ROWS = 4
export const PUPPET_COLUMNS = BODY[1]!.length + 1

// The ball's column and height (0 top, 2 paddle level) at a tick.
export function ballAt(tick: number, width: number): { x: number; y: number } {
  const p = (tick * 2) % (2 * width)
  const x = p < width ? p : 2 * width - 1 - p
  const y = 2 - Math.round(2 * Math.sin((Math.PI * x) / Math.max(1, width - 1)))

  return { x, y }
}

function courtRow(row: number, width: number, ball: { x: number; y: number } | undefined): string {
  if (row === ROWS - 1) {
    const net = Math.floor(width / 2)

    return Array.from({ length: width }, (_, x) => (x === net ? '╥' : '═')).join('')
  }

  return Array.from({ length: width }, (_, x) => (ball && row === ball.y && x === ball.x ? '●' : ' ')).join('')
}

function Puppet({ ui, seat, row, side }: { ui: Ui; seat?: Player; row: number; side: Side }) {
  const { Text } = ui
  const body = row === 0 ? ' '.repeat(BODY[0]!.length) : BODY[row - 1]!
  const paddle = row === 2 && seat && !seat.isDone ? '|' : ' '

  return (
    <Text color={seat ? CLAY : undefined} dimColor={!seat || seat.isDone}>
      {side === 'left' ? body + paddle : paddle + body}
    </Text>
  )
}

function Score({ ui, seat }: { ui: Ui; seat?: Player }) {
  const { Text } = ui

  return <Text weight="bold">{seat ? `${seat.label} ${seat.hits}${seat.isDone ? ' ✓' : ''}` : 'waiting...'}</Text>
}

function Scoreboard({ ui, left, right }: { ui: Ui; left?: Player; right?: Player }) {
  const { Box } = ui

  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Score ui={ui} seat={left} />
      <Score ui={ui} seat={right} />
    </Box>
  )
}

function Court({ ui, left, right, width, tick, isRallying }: {
  ui: Ui
  left?: Player
  right?: Player
  width: number
  tick: number
  isRallying: boolean
}) {
  const { Box, Text } = ui
  const ball = isRallying ? ballAt(tick, width) : undefined

  return (
    <Box flexDirection="column">
      {Array.from({ length: ROWS }, (_, row) => (
        <Text wrap="truncate">
          <Puppet ui={ui} seat={left} row={row} side="left" />
          {courtRow(row, width, ball)}
          <Puppet ui={ui} seat={right} row={row} side="right" />
        </Text>
      ))}
    </Box>
  )
}

export function PingPong({ ui, match, columns, tick }: { ui: Ui; match: Match; columns: number; tick: number }) {
  const { Box, Text } = ui
  const [left, right] = match.players
  const isRallying = isLive(match)
  const width = Math.max(12, columns - 2 * PUPPET_COLUMNS - 1)
  const status = isRallying ? 'rally in progress' : match.players.length ? 'match over' : 'waiting for a match'

  return (
    <Box flexDirection="column">
      <Scoreboard ui={ui} left={left} right={right} />
      <Court ui={ui} left={left} right={right} width={width} tick={tick} isRallying={isRallying} />
      <Text dimColor>{status}</Text>
    </Box>
  )
}
