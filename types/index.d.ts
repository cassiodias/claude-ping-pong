export type Player = { id: string; label: string; hits: number; isDone: boolean }
export type Match = { players: Player[]; isHostDone: boolean }

declare module 'claude-code' {
  interface PluginState {
    'puppet-ping-pong': { match: Shaped<Match> }
  }
}
