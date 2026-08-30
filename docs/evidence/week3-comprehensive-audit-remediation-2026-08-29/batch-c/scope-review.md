# Batch C scope review

## Implemented

- Added a pure host coordinator with explicit `standalone`, `integrating`, `better-sidebar`, `releasing`, and `blocked` modes.
- Kept top-level DSH injections at `slots` and `connection`; added nested Cordis injection for the optional public `betterSidebar` service.
- Registered one namespaced single-instance native tab and used only public `registerTab` / `openTab` methods.
- Released every Oasis Portal, `#root` owner attribute, width variable, style node, observer, and scheduled guard before native-host publication, open, detach, fault cleanup, or disposal.
- Kept `[data-dsh-better-sidebar]` only as a fail-closed marker when a valid public service is unavailable.
- Split the business UI into one shared surface used by both the native tab and the standalone Portal fallback.
- Added a detached Workspace context bridge containing only `workspaceId` and `sessionIds`; no cwd or filesystem path crosses the bridge.
- Added generation-aware pending/unbound/blocked native states and prevented a visible tab from reusing a prior session generation.
- In embedded mode, Better Sidebar owns outer geometry and show/hide/expand controls; Oasis persists its standalone mode as hidden after hydration.
- Subscribed the entry button to coordinator state so async attach/detach/block transitions update its visible state.
- Added native-open failure cleanup and idempotent unregister coverage.

## Deliberate non-changes

- `OasisPanelPortal.js` required no code change: it remains the standalone-only Portal boundary selected by `WorkspaceContextBridge`.
- No Better Sidebar package file, private service, private store, private DOM structure, hashed class, simulated click, terminal, Git, file browser, or browser tab feature was imported.
- No DSH Profile, Dify, billing, production, remote repository, Git index, commit, or push action was performed.
- No W3A-03 store-disposal or W3A-04 portable-verifier production fix was included.

## Generated artifact boundary

`npm run build` regenerated `lib/client.js` and `lib/client.js.map` from the complete current Client source tree. Those tracked files were already dirty before Batch C; this batch preserved all source work and did not reset or selectively overwrite unrelated changes.

## Verification boundary

- Static/unit/build/package-list evidence is present.
- Host loading, browser rendering, native-tab geometry, narrow layout, project A/B switching, refresh/uninstall behavior, and strong real-Profile before/after comparison remain Task 6 work.
- The complete package test command still has exactly one expected W3A-03 failure. W3A-04 remains outside the package suite and is still pending.

