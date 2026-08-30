# Batch B scope review

## Implemented

- Explicit `mockVersion` participates in canonical input hashing while version-1 hashes remain byte-identical.
- A frozen version registry dispatches the immutable version-1 local runner and rejects unknown versions.
- Stored runs replay the complete deterministic result from version, workflow identity, and input snapshot.
- Canonical comparison now covers status, sections, risks, questions, disclaimer, artifact metadata, and a forged artifact body whose digests were recomputed.
- Review and writeback lifecycle fields remain outside replay and continue to parse after legitimate human changes.
- Shared persisted-run fixtures now use the real version-1 runner instead of synthetic result evidence.

## Deliberate non-changes

- `workbench-contract.js` remains `z.literal('1')`; it already rejects unknown persisted versions before replay. Importing the Node crypto-backed runner into the Client-shared contract would add an unnecessary coupling. The runner-side version set and golden tests now protect the current v1 boundary.
- No Client, layout, Better Sidebar, store-dispose, browser verifier, built bundle, DSH Profile, Git index, commit, or remote state was changed.

## Preserved Batch A boundaries

The following `git hash-object` values still match the Batch A checkpoint:

- `src/client.js`: `02553b59728e25a0a8e7ebf4866fae4f60982c45`
- `src/client/workbench-store.js`: `10d65594dcd65666db1901fa81bfe8b41af8fb97`
- Week 1 browser test: `daa5a8830021f3391cff23ecf4ed33a7ad97c462`
- Week 2 browser test: `9e941a82c350de0b2b84ad332f2c5408aea01d00`

## Remaining findings

- W3A-02: Better Sidebar native public-service host remains RED.
- W3A-03: bounded store disposal remains RED.
- W3A-04: portable browser verifier remains RED from Batch A and was not changed in this batch.

