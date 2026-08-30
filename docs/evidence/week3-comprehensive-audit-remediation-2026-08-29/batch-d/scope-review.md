# Batch D scope review

## Implemented

- Added validated `disposeDrainMs`; the default is 1000 ms and explicit non-negative safe integers are accepted.
- Set `closing` synchronously on the first `dispose()` call and return the same disposal promise on repeated calls.
- Rejected new workspace synchronization, hydration, catalog loading, reload, flush, page, panel, material, run, review, and writeback mutations after closing starts.
- Kept one internal closing-only flush path for drafts and actions acknowledged before closing.
- Preserved an accepted action waiting behind hydration by converting it to one final draft after hydration succeeds.
- Raced the best-effort drain against the injected scheduler deadline.
- Aborted the shared remote signal unconditionally whether the drain wins or the deadline wins.
- Detached the drain after the deadline and attached rejection handling rather than awaiting the remote again.
- Prevented post-disposal state writes and notifications, then cleared Workspace IDs, states, runtimes, timers, pending actions, pending drafts, listeners, and retained promise references.
- Covered quick drain, abort-dependent remote, never-settling remote, repeated dispose, closing rejection, late completion, validation, and hydration-in-flight behavior.

## Deliberate non-changes

- No Host RPC, repository, Domain schema, layout coordinator, Better Sidebar integration, browser verifier, Dify, billing, production, or remote state was changed.
- W3A-04 remains intentionally RED and is the next implementation batch.
- No DSH Profile, Git index, commit, push, package publication, or third-party plugin file was modified.

## Generated artifact boundary

`npm run build` regenerated `lib/client.js` and `lib/client.js.map` from the complete current Client tree. These generated files already contained earlier Week 3 work; no unrelated source was reset or overwritten.

## Traceability

- Batch A pre-remediation `workbench-store.js` hash: `10d65594dcd65666db1901fa81bfe8b41af8fb97`.
- Batch D `workbench-store.js` hash: `91bf2bab4f980e236efe2f0829ff52d7bf5fce3a`.
- Batch D `workbench-store.test.mjs` hash: `580ee93795160eb85d5509667237bdae12895960`.

## Remaining work

- W3A-04: remove the fixed project display name from Week 1/Week 2 verifier coupling and prove execution from a differently named hash-identical copy.
- Task 6: isolated no-Better/Better dual-host and browser acceptance plus strong real-Profile preservation comparison.

