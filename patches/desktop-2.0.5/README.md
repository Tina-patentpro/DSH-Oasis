# Desktop 2.0.5 — frame-layer patch

Upstream: anywhere-labs Desktop v2.0.5, commit `423406fe225442995902015cb6f10eed670ff115` (MIT).
Target: `src/client/extended-styles.ts`, shipped as `lib/client.js`.
Revision: `oasis-frame-1`; this does not change the approved upstream version or update channel.

The framed root's fixed positioning, identity transform and explicit isolation create a stacking context below body-mounted Sidebar panels. The native Settings modal is a descendant of that root, so its z-index 1000 cannot rise above the sibling Sidebar layer at 25.

The patch uses an absolute, untransformed, non-isolated content root. Its 36px inset, sizing and overflow are preserved. The Desktop titlebar retains its independent stack; the shell overlay's transform is unchanged. No Oasis business code, native single Slot, hash class, DOM observer or Sidebar private state participates.

`frame-layer.mjs` is the exact, fail-closed CSS transformation. `baseline.json` pins installed input bytes; changed or already patched input is refused. The assembler creates a new ignored Desktop copy, patches its client and source-map content, and compares protected source hashes. It never edits the system installation or a Profile. This local candidate is not an installer release.

Commands (cmd, project root):

```text
node --test tests\desktop-frame-patch.test.mjs
node scripts\assemble-stage3-desktop.mjs
```

Runtime acceptance must use the copied executable with isolated DSH_HOME/user-data-dir and no browser CSS injection. Check Settings mouse close, Sidebar navigation, titlebar bounds and content layout in compatibility and extended modes before claiming this patch accepted. The preliminary browser-only style experiment is root-cause evidence, not installed-candidate acceptance.
