# Fast 从已关联网站项目准备生成

## ADDED Requirements

### Requirement: Separate catalog identity from service detail identity
New production Fast preparations SHALL capture a unique active catalog entry by exact endpoint and store its observed ID as catalogEntryId independently from detail apiId39. The catalog entry ID SHALL NOT be pinned to211 or confused with ai_model_id. Detail ID/name/released schema SHALL remain independently verified. Both identities and process SHALL be frozen in preparation, execution and provider snapshots and checked for consistency and input integrity. Duplicate endpoint entries or catalog identity/process drift SHALL reject before upload and before create, without silently selecting a replacement. Old records without catalogEntryId SHALL remain readable without defaulting or recomputing hashes; a new production transfer SHALL require fresh catalog identity. Unknown previous submissions SHALL NOT be retried.

### Requirement: Released Fast mapping from explicit website link
Production unified claims SHALL use only service39 权利要求书生成-Fast, synchronous Workflow, and the reviewed release input/output contract. The sole user-selected destination SHALL be websiteProjectLinks; no legacy manual binding fallback or implicit folder creation is permitted. Basic is out of this batch.

### Requirement: Explicit read and scoped ephemeral mapping
Only an explicit metadata-read confirmation MAY resolve the authenticated account, unique catalog entry, service detail and owned folder. Local preparation without confirmation SHALL NOT obtain credentials or send requests. Metadata SHALL NOT mutate native settings. Cache entries SHALL bind settings revision, Workspace path and entire website link, and SHALL be rechecked after asynchronous reads. Every generation SHALL freeze actual process, schema and price into the existing execution snapshot.

### Requirement: Preserve consent and recovery boundaries
Metadata reads SHALL NOT upload or create. Schema/identity/ownership drift SHALL reject before upload and before create. Price/input/account changes SHALL invalidate consent. Unknown upload/create outcomes SHALL NOT retry or fall back. Existing review, no-overwrite save, _OIW filename and conversation-draft requirements remain unchanged.

### Requirement: Account identity from the same authenticated grant
Production Host SHALL capture account ID, fixed origin, revision and token resolver atomically from the same DSH credentials login grant. A successful user-detail object without its own id MAY use that captured identity only after confirming the grant remains current. Explicit malformed IDs SHALL NOT fall back; valid conflicting IDs SHALL reject. Missing or invalid grant identity SHALL NOT be filled from a Workspace link, user name, cached display data or a constant. Token, account, origin, revision changes and logout SHALL invalidate the captured operation. Existing synthetic/non-production strict identity checks SHALL remain. The renderer SHALL receive a safe actionable account error, never credential values or raw provider errors.
