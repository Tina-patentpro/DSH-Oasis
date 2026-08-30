# Week 3 Comprehensive Audit Remediation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: use `executing-plans`, `systematic-debugging`, `test-driven-development`, the project `dsh-plugin-development` Skill, and `verification-before-completion` task-by-task.

**Goal:** Close W3A-01 through W3A-04 without changing the real DSH Profile, while making the Oasis workbench a native `dsh-better-sidebar` tab when its public service is present and retaining the standalone Portal when it is absent.

**Architecture:** Keep one shared workbench store and introduce a client-only panel host coordinator. The coordinator prefers the public `ctx.betterSidebar` service, never touches Better Sidebar private DOM/CSS/store state, and falls back to the existing namespaced Portal adapter only when no Better Sidebar service or marker is present. Stored local-mock results are validated by versioned deterministic replay; store disposal becomes a bounded best-effort drain followed by abort and unconditional cleanup.

**Tech Stack:** DSH `0.1.1-rc.2`, Cordis `4.0.1`, React `18.2.0`, Node `22.19.0`, Node test runner, Playwright-based isolated browser verification, `dsh-better-sidebar@0.15.2` public client service.

---

## Scope contract

- Modify only Oasis product/tests/verifiers/project Skill and new remediation evidence.
- Preserve all unrelated tracked, untracked, staged, and unstaged work.
- Do not stage, commit, reset, restore, clean, or push during remediation.
- Do not modify or install into `C:\Users\TinaD\.dsh`.
- Do not modify `dsh-better-sidebar` or import its private source.
- Do not involve Dify, billing, real models, production, or additional adversarial security work.

## Task 1: Establish red tests and audit gates

**Files:**
- Modify: `packages/oasis-professional-service/test/workbench-domain.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-store.test.mjs`
- Modify: `packages/oasis-professional-service/test/client-panel-contract.test.mjs`
- Modify: `tests/scripts/verification-fixture-compatibility.test.mjs`
- Create: `docs/evidence/week3-comprehensive-audit-remediation-2026-08-29/batch-a/*`

1. Record HEAD, dirty tree, target hashes, tool versions, target Profile bundle list, and exact Better Sidebar version.
2. Run the focused tests before edits and record their green baseline.
3. Add a deterministic local-mock result-field corruption test.
4. Add an abort-dependent remote dispose deadline test.
5. Add a Better Sidebar public-service registration test.
6. Add a verifier portability test that forbids the fixed project basename.
7. Run each test independently and retain the expected failure output; do not write product fixes in this task.

## Task 2: Versioned complete local-mock integrity

**Files:**
- Modify: `packages/oasis-professional-service/src/local-mock-runner.js`
- Modify: `packages/oasis-professional-service/src/workbench-domain.js`
- Modify: `packages/oasis-professional-service/src/workbench-contract.js`
- Modify: `packages/oasis-professional-service/test/workbench-fixtures.mjs`
- Modify: `packages/oasis-professional-service/test/local-mock-runner.test.mjs`
- Modify: `packages/oasis-professional-service/test/workbench-domain.test.mjs`

1. Make input hashing accept the explicit `mockVersion` while preserving the version-1 hash bytes.
2. Freeze a version-1 runner and route replay through a version registry.
3. Recompute the complete result from `mockVersion`, workflow identity, and the canonical input snapshot.
4. Compare canonical JSON for the whole result and fail closed on any mismatch or unknown version.
5. Replace synthetic persisted-run fixtures with output from the real version-1 runner.
6. Add version-1 golden tests and confirm legitimate review/writeback mutation remains accepted.

## Task 3: Better Sidebar native host and standalone fallback

**Files:**
- Create: `packages/oasis-professional-service/src/client/panel-host-coordinator.js`
- Create: `packages/oasis-professional-service/src/client/WorkspaceContextBridge.js`
- Create: `packages/oasis-professional-service/src/client/OasisWorkbenchSurface.js`
- Create: `packages/oasis-professional-service/src/client/OasisBetterSidebarTab.js`
- Modify: `packages/oasis-professional-service/src/client.js`
- Modify: `packages/oasis-professional-service/src/client/OasisPanelPortal.js`
- Modify: `packages/oasis-professional-service/src/client/OasisPanelHost.js`
- Modify: `packages/oasis-professional-service/src/client/PanelChrome.js`
- Modify: `packages/oasis-professional-service/src/client/WorkbenchEntry.js`
- Modify: `packages/oasis-professional-service/src/client/layout-adapter.js`

1. Add pure coordinator and bridge red tests before each production module.
2. Keep top-level required injections `slots` and `connection`; use a nested Cordis injection for `betterSidebar`.
3. Validate `registerTab`, `openTab`, and the returned disposer before switching hosts.
4. Register one namespaced, single-instance native tab and open it only through the public service.
5. Keep the shell overlay registered as the official Workspace-hook lifecycle bridge, but create a Portal only in standalone mode.
6. Release every Oasis layout mutation before publishing Better Sidebar mode.
7. Preserve Better Sidebar marker conflict detection for service-missing/invalid states.
8. In embedded mode ignore panel visibility state, persist standalone mode as hidden after hydration, and keep runtime fallback hidden until an explicit user open.
9. Render visible pending/unbound/blocked states without reusing the previous workspace generation.

## Task 4: Bounded store disposal

**Files:**
- Modify: `packages/oasis-professional-service/src/client/workbench-store.js`
- Modify: `packages/oasis-professional-service/test/workbench-store.test.mjs`

1. Add validated `disposeDrainMs` with a 1000 ms default and injected scheduler support.
2. Set `closing` before drain and refuse new mutations/scheduling.
3. Start one best-effort flush of acknowledged drafts.
4. Race the flush against the deadline, abort unconditionally, mark disposed, and clear all owned state.
5. Never await the remote again after the deadline; suppress late writes and unhandled rejection.
6. Verify quick drain, abort-dependent remote, never-settling remote, repeated dispose, and late completion.

## Task 5: Portable browser verifiers

**Files:**
- Modify: `scripts/verify-week1-supplement.mjs`
- Modify: `scripts/verify-week2-persistence.mjs`
- Modify: `tests/integration/week1-supplement-browser.test.mjs`
- Modify: `tests/integration/week2-persistence-browser.test.mjs`
- Modify: `tests/scripts/verification-fixture-compatibility.test.mjs`

1. Derive the display name from each verifier's actual project root.
2. Pass it as a required browser-test environment value.
3. Remove the fixed Chinese project basename and fail fast when the value is missing.
4. Run the verifiers from a hash-identical copy with a different final directory name.

## Task 6: Isolated dual-host verification and closure audit

1. Refresh DSH/Node/pnpm/package/Slot baselines.
2. Build isolated profiles with no reparse targets outside their declared roots.
3. Verify standalone Portal without Better Sidebar.
4. Verify the native tab with exact Better Sidebar 0.15.2, including input entry, project A/B switch, multiple Oasis tasks, narrow layout, hide/show, refresh, and uninstall cleanup.
5. Prove that embedded mode creates no Oasis Portal/root owner/width variable.
6. Run package verification, root tests, Week 1, Week 2, and Week 3.
7. Compare the complete real Profile before/after snapshot and require zero changes.
8. Publish an evidence ledger with separate static, unit, Host, browser, and preservation conclusions.

## Stop conditions

- Stop if compatibility requires a private Better Sidebar DOM, CSS selector, simulated click, or internal store call.
- Stop if an isolated Profile contains a junction/symlink resolving into the real Profile.
- Stop if a proposed migration would silently legitimize a record that cannot pass version-1 replay.
- Stop if a red test fails for setup/syntax rather than the audited missing behavior.
- Stop before any real Profile write, package publication, Git staging, commit, or push.
