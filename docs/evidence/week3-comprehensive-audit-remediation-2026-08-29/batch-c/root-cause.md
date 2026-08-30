# W3A-02 root cause

- The previous Client always mounted `OasisPanelPortal` from `shell.overlay`; it never requested the public `betterSidebar` Cordis service.
- Consequently, the standalone layout adapter and Better Sidebar could both become layout owners. The old conflict detector could only hide Oasis after observing the Better Sidebar marker; it could not contribute an Oasis tab to the native host.
- Workspace resolution lived inside the standalone panel host, so a native external tab had no detached, generation-aware project context and could reuse stale context during session switches.
- The entry button read coordinator state only at click time. Without an external-store subscription, its visible disabled/native/blocked state could lag an asynchronous Better Sidebar attach or detach.

## Fix hypothesis

Retain one shared workbench business surface and add a Client-only host coordinator. Prefer the installed `dsh-better-sidebar@0.15.2` public `registerTab` and `openTab` methods through nested Cordis injection, release all standalone Portal/layout ownership before native publication, and retain the namespaced Portal only when neither a valid service nor its marker is present. Project only `workspaceId` and `sessionIds` through an official `shell.overlay` Workspace bridge, require a current generation for visible native content, and subscribe the entry to coordinator changes.

