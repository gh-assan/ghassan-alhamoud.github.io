# TUI coding-agent evaluation checklist

Use this checklist before accepting an agent-built terminal UI. It separates persuasive design output from observable delivery.

## Scope

- Record the repository commit and exact task prompt.
- Name the required framework and runtime versions.
- List the required screens, interactions, and data sources.
- Mark every requirement as required, optional, or explicitly out of scope.
- Define the smallest vertical slice that must work before the full build continues.

## Acceptance rubric

Score each category from 0 to 2:

- **0** — absent or unusable
- **1** — partially implemented or only works through a shortcut
- **2** — works through the real terminal surface and has evidence

| Category | Evidence to capture | Score |
|---|---|---:|
| Launch | Clean install and launch command exits successfully | /2 |
| Layout | Required panes/widgets render at defined terminal sizes | /2 |
| Navigation | Keyboard bindings and focus order work | /2 |
| Core workflow | One complete user journey reaches durable output | /2 |
| Async behavior | Long work does not freeze the UI | /2 |
| Error handling | Failure is visible, actionable, and recoverable | /2 |
| Persistence | Restart restores the expected state | /2 |
| Accessibility | Labels, focus, contrast, and non-mouse operation are usable | /2 |
| Harness tests | Framework-native tests cover widgets and state | /2 |
| PTY smoke test | A real-terminal test drives and captures the UI | /2 |

Do not call the delivery complete when a required category scores 0. Record the commands, terminal size, screenshots or pane captures, and failing output with the score.

## Recommended delivery gates

1. **Skeleton gate:** launch, layout, navigation, and one mocked screen.
2. **Vertical-slice gate:** one real workflow from input to persisted result.
3. **Resilience gate:** errors, restart, focus traps, and slow operations.
4. **Release gate:** harness suite, PTY smoke test, packaging, and operator docs.

Review after every gate. A long design document is context, not acceptance evidence.
