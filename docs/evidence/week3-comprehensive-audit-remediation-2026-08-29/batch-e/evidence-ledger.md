# Batch E — W3A-04 portable browser verifier evidence

Date: 2026-08-30

## Target contract

- Derive the main Workspace display name from each verifier's actual `projectRoot`.
- Pass the derived value to the browser process as required input.
- Fail before browser startup when the value is absent.
- Remove the fixed `9、绿洲慧写4.0预研` basename from both browser tests.
- Execute both verifiers from a source-identical copy whose final directory name differs.
- Keep `C:\Users\TinaD\.dsh` read-only and prove its complete baseline is unchanged.

## Implementation

- `scripts/verify-week1-supplement.mjs` and `scripts/verify-week2-persistence.mjs` now derive `basename(projectRoot)` and pass `OASIS_WORKSPACE_DISPLAY_NAME`.
- Both browser tests trim and require that environment value before browser setup, then use it for the main Workspace selector.
- `tests/scripts/verification-fixture-compatibility.test.mjs` requires the derivation, propagation, fail-fast assertion, runtime selector use, and absence of the fixed basename.

## TDD evidence

- `red-portable-workspace-contract.txt`: 1 passed, 1 failed; the failure was the missing `basename(projectRoot)` contract in the Week 1 verifier.
- `green-portable-workspace-contract-final.txt`: 2 passed, 0 failed.
- The RED failure was behavioral-contract-specific; it was not a syntax, dependency, or Host setup failure.

## Static, unit, build, and package evidence

- `root-script-tests-final.txt`: 32 passed, 0 failed.
- `package-verify-escalated.txt`: build completed, 200 tests passed, 0 failed, and `npm pack --dry-run --json` reported 37 files.
- The first sandboxed package verification reached build plus 200/200 tests, then failed only because npm could not create its user-cache directory (`package-verify.txt`). The unchanged command completed outside the sandbox.

## Renamed-copy proof

- Copy root: `C:\Users\TinaD\AppData\Local\Temp\oasis-portability-copy-20260830-renamed`.
- `renamed-copy-hash-manifest.json`: original and copy final names differ; 116 selected files, including the pre-run generated bundle, were byte/hash identical before verifier execution.
- `renamed-copy-source-hash-manifest-final.json`: after both verifier runs, 114 source/config/test/Skill files remained byte/hash identical. Product `lib` is excluded from this post-run source check because both verifiers intentionally rebuild that generated directory.
- Offline dependency materialization stopped without network access because one tarball was absent (`renamed-copy-offline-install.txt`). The verifier copy therefore used a temporary dependency-only junction to the existing project `node_modules`; source identity remained independently hash-gated. The junction was outside all DSH Profiles, removed before copy cleanup, and the original dependency directory remained present (`renamed-copy-junction-removed.txt`).
- `renamed-copy-workspace-name-observed.txt`: both browser trees observed `oasis-portability-copy-20260830-renamed`, proving the selector did not rely on the original Chinese basename.

## Host and browser evidence

- Week 1: `renamed-copy-week1/runtime/verifier-browser-tap.txt` — 1 passed, 0 failed.
- Week 2: `renamed-copy-week2/runtime/browser-tap.txt` — 1 passed, 0 failed.
- Both verifier console files contain their explicit completion messages.
- Week 1 and Week 2 browser directories contain fresh UI state, screenshots, response records, and empty page/console error arrays.
- This is Task 5 verifier portability evidence. It does not substitute for Task 6's standalone/native Better Sidebar dual-host matrix.

## Preservation and cleanup

- Week 1 complete Profile TSVs are byte-identical (`renamed-copy-week1-profile-compare.txt`).
- Week 2 `real-profile-compare.json` records equal SHA-256 digests, 13,748 entries before/after, 530 links before/after, and `equal: true` for `C:\Users\TinaD\.dsh`.
- Both verifier-owned isolated homes were absent after successful cleanup (`renamed-copy-isolated-home-cleanup.txt`).
- The dependency junction was removed without traversing its target; the renamed temporary copy was then removed after an exact `%TEMP%\oasis-portability-copy-*` boundary check (`renamed-copy-cleanup-verified.txt`).

## Conclusion and boundary

W3A-04 is closed by static, unit, package, isolated Host, real browser, renamed-copy, and full real-Profile preservation evidence. Task 6 remains the separate Week 3 closure gate.
