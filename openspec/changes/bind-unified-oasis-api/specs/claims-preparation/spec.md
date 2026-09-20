# Unified claims API preparation (offline slice 3a)

The Host provides `task/prepare-api` as a local, read-only preparation operation. It accepts only Workspace/task identifiers and the displayed business/settings revisions, reads the authoritative unified claims v2 draft, and uses the existing four-field TXT mapping. It does not accept client-supplied materials, bindings, hashes, or upload URLs.

The response freezes the current Workspace path, binding, revisions, four input values, mapping identity, document byte hash/length and mapped text fields. Its preparation hash changes when any of those inputs changes. The response is detached from native settings and business storage. It is not an execution record, a credential snapshot, an authenticated-account recheck, an upload receipt, or permission to submit.

Unknown/missing/replaced Workspace, stale revisions, missing or differently scoped binding, changed environment/origin, wrong template/source, unhandled upstream/files, invalid Unicode and incomplete disclosure fail closed. Existing results, review and writeback records remain unchanged. No credential resolution, network, upload, create, polling or settings/business write is permitted.

The response always reports unverified and cannot submit. Service semantics, TXT acceptance and omitted API fields remain unverified; an old normalized schema hash is not proof of those capabilities. This slice does not open the UI/API generation source or the existing legacy execution path for unified tasks. Task 3 remains incomplete until frozen preparation and receipts are integrated with the existing state machine and common result operations.

Validation: real repository and Host RPC/route integration with synthetic native settings; stale/cross-workspace/material rejection; byte-preserving mapping and hash sensitivity; zero side effects; existing remote no-resubmit and account/runtime regression. Desktop and actual service proof are separate gates.
