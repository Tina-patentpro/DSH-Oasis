# Audit Omission Review

| Omission | Root cause | New project gate |
| --- | --- | --- |
| The actual Better Sidebar conflict was not closed by earlier browser proof. | The isolated browser Profile omitted a bundle that the real target Profile intentionally enables. | Before a compatibility closure, compare the protected target bundle list with the isolated runtime and mirror every layout owner relevant to the claim. |
| Persisted result gating fields were not covered. | Integrity tests traced the artifact digest but not every stored field consumed by approval and preview logic. | Maintain a producer-field to consumer contract and require a deterministic source or digest for every immutable consumed field. |
| Store disposal self-deadlock was missed. | Existing remotes either completed or did not require the store's own abort to settle. | Lifecycle tests must cover quick completion, abort-dependent completion, and an operation that never settles even after abort. |
| Browser verification depended on one directory basename. | Test identity was coupled to the developer checkout display label. | Run the verifier contract against a renamed hash-identical copy and forbid the fixed local basename in test sources. |

These rules belong to the project Skill and audit script. There is not yet recurrence evidence to modify a global Skill.
