# puppet-ping-pong

A Claude Code mod: two Claude puppets play ping pong above your prompt while a slash command you pick runs.

```
review 14                                          probe 9 ✓
                         ●
 ▐▛███▜▌                                          ▐▛███▜▌
▝▜█████▛▘|                                        ▝▜█████▛▘
  ▘▘ ▝▝  ═════════════════════╥═════════════════════  ▘▘ ▝▝
rally in progress
```

## How to use it

**1. Install.** At the prompt of a Claude Code terminal session, type:

```
/plugin install puppet-ping-pong --marketplace cassiodias/claude-ping-pong
```

Answer `y` to add the marketplace, then press Enter for the user scope. It works right away, no restart needed.

**2. See it.** Type:

```
/ping-pong-demo
```

A 20 second match plays above the prompt.

**3. Pick your commands.** By default a match plays while `/code-review` runs. To use other commands, open `/config`, find the `puppet-ping-pong` commands row, and list them comma separated, without the slash:

```
code-review, my-reviewer
```

That's it. Next time one of those commands runs, the match starts by itself and ends when the command is done.

## What you see

- The first two subagents the command starts take the seats, named after their task. Until then, or if it starts none, two stand-in puppets play.
- Every tool call a subagent makes scores a point for its side.
- A subagent that finishes greys out and drops its paddle (✓).
- The match ends when the command and every seated subagent are done, and clears a few seconds later.

## Options

| Setting | Values | Default |
| --- | --- | --- |
| `commands` | slash commands or skills, comma separated | `code-review` |
| `display` | `band`: a strip above the prompt that stays put while the chat scrolls. `pane`: a narrow pane beside the chat | `band` |

Set them in `/config`, or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "puppet-ping-pong": { "options": { "commands": "code-review, my-reviewer", "display": "band" } } } }
```

## Demo options

| Command | Shows |
| --- | --- |
| `/ping-pong-demo` | a match in your `display` setting |
| `/ping-pong-demo pane` | a match in the pane |
| `/ping-pong-demo band` | a match in the band |
| `/ping-pong-demo scroll` | a match while fake test output scrolls the chat |

## Other ways to install

From a shell:

```
claude plugin install puppet-ping-pong --marketplace cassiodias/claude-ping-pong
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `cassiodias/claude-ping-pong`, then Add plugin.

## Uninstall

From a shell:

```
claude plugin uninstall puppet-ping-pong
```

## License

MIT
