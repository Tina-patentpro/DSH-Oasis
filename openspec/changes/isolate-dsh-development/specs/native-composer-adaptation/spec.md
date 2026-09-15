## ADDED Requirements

### Requirement: Native composer input normalization
The development candidate SHALL adapt the pinned DSH 0.1.5-rc.1 attachmentIds at the native input registration boundary without changing the business draft bridge contract.

#### Scenario: Empty native composer
- **WHEN** the native composer has an empty draft, empty attachment and reference arrays, a valid draft revision and a plain phase
- **THEN** an approved artifact may be prepared as text in the same workspace's conversation draft
- **AND** no submit or generation action is invoked

#### Scenario: Missing or occupied attachment state
- **WHEN** attachmentIds is absent, malformed or nonempty, even if a legacy imageIds field is empty
- **THEN** preparing the artifact is blocked without changing the composer

#### Scenario: Composer changes during artifact preparation
- **WHEN** the session, registered input, draft revision, draft contents, attachments or references change before insertion
- **THEN** the existing draft bridge guards still reject unsafe insertion
