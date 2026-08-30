# W3A-01 root cause

- `assertRunIntegrity()` recomputes only the canonical input digest and the artifact body digest.
- Persisted `contentStatus`, `sections`, `risks`, `questions`, `disclaimer`, and artifact metadata can therefore diverge from the deterministic local-mock result without invalidating either digest.
- `computeCanonicalInputSha256()` embeds the current `LOCAL_MOCK_VERSION` constant instead of accepting the persisted run version, so it cannot safely verify old versioned records after a future runner change.
- `runSnapshotSchema` accepts only version `1`, but the runner API currently ignores an explicit `mockVersion` argument and has no version registry.

## Fix hypothesis

Preserve the exact v1 input and result bytes, route execution/replay through an explicit version registry, and compare canonical JSON for the complete persisted result. Keep review and writeback outside the replayed result so legitimate human lifecycle changes remain mutable.

