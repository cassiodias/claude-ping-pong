# puppet-ping-pong

Two Claude puppets play ping pong in a pane beside the chat while a slash command you pick runs.

- The match starts when one of your listed commands (or skills) runs, by `/name` or when Claude calls it.
- The first two subagents the command starts take the two seats, named after their task; until then, two stand-in puppets play.
- Every tool call a seated subagent makes scores a point for its side.
- A subagent that finishes greys out and drops its paddle. The match ends when the command's turn and every seated subagent are done, and the pane closes a few seconds later.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install puppet-ping-pong --marketplace cassiodias/claude-ping-pong
```

Answer `y` to add the marketplace, then pick a scope (user scope first, Enter). From a shell:

```
claude plugin install puppet-ping-pong --marketplace cassiodias/claude-ping-pong
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `cassiodias/claude-ping-pong`, then Add plugin.

## Pick the commands

The `commands` setting lists the commands that play a match, comma separated, without the slash. It defaults to `code-review`. Change it in `/config` (the puppet-ping-pong row) or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "puppet-ping-pong": { "options": { "commands": "code-review, my-reviewer" } } } }
```

## Try it

`/ping-pong-demo` plays a 20 second match so you can see it without running anything.

The pane opens beside the chat by itself on a terminal at least 144 columns wide; on a narrower one it waits until you open it.

## License

MIT
