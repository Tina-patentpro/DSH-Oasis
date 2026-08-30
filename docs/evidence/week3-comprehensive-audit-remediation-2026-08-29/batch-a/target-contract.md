# Batch A Target Contract

- Target source: user-approved comprehensive-audit remediation plan.
- Target findings: W3A-01 result integrity, W3A-02 Better Sidebar compatibility, W3A-03 bounded disposal, W3A-04 portable browser verification.
- Current phase: governance baseline and RED tests only.
- Success for this batch: every new regression test fails for the exact audited missing behavior while the pre-edit focused baseline remains green.
- Non-goals: product fixes, real Profile writes, Better Sidebar modification, Dify, billing, production, real models, Git staging/commit/push.
- Protected existing work: every pre-existing tracked and untracked path outside the files declared in the implementation plan.
- Stop condition: any test setup error, private Better Sidebar dependency, real Profile mutation, or unrelated diff.

## Evidence layers

- Static: source/config/version and field-consumer inspection.
- Unit: focused Node test failures.
- Host/browser: not part of Batch A.
- Real Profile: read-only package/bundle evidence only; no runtime or writes.
