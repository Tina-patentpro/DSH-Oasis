# W3A-03 root cause

- `store.dispose()` awaited every `flushWorkspace()` before calling `AbortController.abort()`.
- An in-flight `remote.replace()` can legally settle only after its signal is aborted. In that case `flushWorkspace()` waits for `replace()`, while `replace()` waits for the abort located after the flush: a circular wait with no deadline.
- The store exposed only `disposed`, set after the unbounded wait. New mutations and save scheduling therefore remained admissible during shutdown and could extend the drain.
- Final cleanup cleared pending arrays and timers but retained the Workspace IDs, state map, and runtime map. A late remote result therefore had more state available than required after disposal.

## Fix hypothesis

Set a separate `closing` state synchronously, reject new public mutations, and allow only operations acknowledged before closing to produce one final draft. Race that best-effort drain against a validated deadline, then unconditionally abort and clear every owned map, timer, queue, listener, and promise reference. Never await the remote after the deadline; keep detached drain rejection handling and suppress state writes after disposal.

