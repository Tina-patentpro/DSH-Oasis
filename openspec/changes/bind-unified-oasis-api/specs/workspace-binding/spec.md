# Explicit Workspace API binding (S6 second offline batch)

- The existing DSH namespace owns a bounded `workspaceApiBindings` list. Business storage does not duplicate settings. One binding per authoritative Workspace id; a stored record alone never enables API generation.
- Read returns only the requested Workspace binding, native settings revision and registered path. No network, credential resolution, or other Workspace binding disclosure.
- Explicit confirm carries the displayed Workspace path, environment/origin, authenticated account id, folder id, exact service id/endpoint/process and existing service-detail schema hash. Host rechecks registered Workspace/status, authenticated user/detail, catalogue/detail and folder detail under one frozen runtime.
- Native settings `update(namespace, patch, expectedRevision)` is the commit boundary. Stale revision, any identity mismatch or late Workspace/configuration change rejects without replacing settings. Never retry a conflicting write automatically.
- Only the binding list is patched; unrelated preferences and other Workspace bindings are preserved. Records contain no JWT, credential value, input materials, or API raw response.
- New exact Host read/confirm routes are preparation only, not a new UI or upload/generation permission. Fixture mode still disables remote confirmation. Mapping fingerprint, actual TXT/omitted-field acceptance, unified execution integration and native settings selection UI remain subsequent work.
- Verification: offline TDD for A/B separation, stale/concurrent writers, account/origin/path/folder/service/schema drift, missing Workspace/confirmation, record validation, actual Host route registration/cleanup. No actual network or Profile writes in this batch.
