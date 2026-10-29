import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'puppet-ping-pong',
  component: 'Pane',
  requestId: 'puppet-ping-pong',
  props: {
    title: 'Ping pong',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const


test('subagents of a listed command take the seats and the match ends with the last one', { options: { commands: 'review, /qa', display: 'pane' } }, async ($, on) => {
  let next = 0
  on('skill.prompt', (_, e) => ({ text: e.text }))
  on('agent.spawn', () => ({ model: 'opus', agentId: `a${++next}` }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  mock.clock(on)

  await $.skill.prompt({ skill: 'qa', text: '', frontmatter: {}, source: 'user' } as never)
  await $.agent.spawn({ description: 'lens contract', prompt: 'review' })
  await $.agent.spawn({ description: 'lens break', prompt: 'review' })
  await $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'a2' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^lens contract 0$/ }))?.text).toBe('lens contract 0')
    expect((await ui.find({ type: 'Text', text: /^lens break 1$/ }))?.text).toBe('lens break 1')
    await ui.unmount()
  }

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1' } as never)
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't2', agentId: 'a1' } as never)
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /rally in progress/ })).toBeTruthy()
  await ui.unmount()

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't3', agentId: 'a2' } as never)
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /match over/ })).toBeTruthy()
  await ui.unmount()
})

test('a command not in the list plays no match', async ($, on) => {
  on('skill.prompt', (_, e) => ({ text: e.text }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  mock.clock(on)

  await $.skill.prompt({ skill: 'commit', text: '', frontmatter: {}, source: 'user' } as never)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /waiting for a match/ })).toBeTruthy()
  await ui.unmount()
})

test('a band match draws above the prompt and leaves the pane alone', { options: { commands: 'review' } }, async ($, on) => {
  on('skill.prompt', (_, e) => ({ text: e.text }))
  on('ui.close', () => ({ value: undefined }))
  mock.clock(on)

  await $.skill.prompt({ skill: 'review', text: '', frontmatter: {}, source: 'user' } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'puppet-ping-pong',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: true, maxRows: 8, bodyColumns: 60, scroll: { offset: 0, bodyRows: 8 } },
    } as never)
    expect((await ui.find({ type: 'Text', text: /^review 0$/ }))?.text).toBe('review 0')
    expect(await ui.find({ type: 'Text', text: /rally in progress/ })).toBeTruthy()
    await ui.unmount()
  }
})
