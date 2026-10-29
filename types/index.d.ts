export type Player = { id: string; label: string; hits: number; isDone: boolean }
export type Display = 'pane' | 'band'
export type Match = { players: Player[]; isHostDone: boolean; display: Display }

declare module 'claude-code' {
  interface PluginState {
    'puppet-ping-pong': { match: Shaped<Match> }
  }
}
