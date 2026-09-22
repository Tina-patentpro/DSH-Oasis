# S6 unified execution and results

Approved 2026-09-20 in this task. Implement inline, single agent; no automatic commit, push, installation, real API or model call. Fixed development dependencies remain unchanged. Existing isolation/preview evidence is not rerun.

## Contract
- Keep one claims-disclosure-2 draft. Add an explicitly versioned unifiedClaims execution snapshot to the existing remoteExecutions owner; legacy snapshots and their hashes remain unchanged. Derived TXT is not a project-file reference.
- A bounded, expiring Host confirmation binds the prepared draft, settings revision, authenticated account, service/schema/price, Workspace/path, folder, mapping and frozen runtime. Preview performs only explicitly confirmed metadata reads. Confirmation does not authorize an agent to perform a real call.
- Admission consumes that confirmation and persists an execution before effects. Upload derived UTF-8 technical-disclosure.txt through the existing client/checkpoints; no second uploader. A saved receipt is reusable in the admitted operation; unknown upload or create is not replayed. Resume may observe a submitted request only under its original account/environment. Host restart invalidates pre-submit consent: explicitly abandon a known prepared checkpoint, retaining its receipt, before a fresh confirmed operation. An orphan uploading checkpoint closes as unknown without replay.
- Only nonempty bounded answer text produces one original oasis-api run. A file URL is not正文. Preserve undownloaded/unverified links as provenance. Edited child versions reference the original execution but are not new API calls; old review/writebacks do not carry forward. API results use common review, Markdown writeback and conversation-draft operations.
- Native settings owns Workspace binding selection; same four fields and source switch, no second form. Input/source changes clear confirmation. Source switching itself performs no metadata/upload/create request. No upstream or project-file material is silently dropped.
- Tests use synthetic transport only. Targeted execution/parity/client tests precede one integrated verify. Desktop and real API acceptance remain separate gates.

## Ledger
- Baseline: main 4de3d54, clean. Existing engine, mapper and common result operations reused.
- Ruling: confirmation capability is short-lived Host memory, not credentials in storage; Host restart invalidates pre-submit consent. Cost: user reconfirms a prepared operation after restart instead of risking silent external transfer.
- Ruling: optional execution contract version extends current storage schema; no rewriting existing history. New API records require the new package; rollback must use the preserved pre-change snapshot.
- Review: self-review only under project single-agent policy; no independent-review claim.
- Offline evidence: 2026-09-20 final verify exit 0, 562 passed / 2 existing conditional skips / 0 failed; client build and pack dry-run complete. Source-level acceptance only (STATIC_ONLY); installed Desktop and actual API/material/fee acceptance are outstanding.
